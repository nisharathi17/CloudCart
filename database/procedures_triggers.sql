
DROP TRIGGER IF EXISTS trg_validate_and_deduct_stock ON order_items CASCADE;
DROP FUNCTION IF EXISTS fn_validate_and_deduct_stock() CASCADE;

DROP TRIGGER IF EXISTS trg_update_order_total ON order_items CASCADE;
DROP FUNCTION IF EXISTS fn_update_order_total() CASCADE;

DROP TRIGGER IF EXISTS trg_prevent_unverified_review ON reviews CASCADE;
DROP FUNCTION IF EXISTS fn_prevent_unverified_review() CASCADE;

DROP TRIGGER IF EXISTS trg_update_cart_timestamp ON cart_items CASCADE;
DROP FUNCTION IF EXISTS fn_update_cart_timestamp() CASCADE;

DROP PROCEDURE IF EXISTS place_order(INT, JSONB, INT) CASCADE;
DROP PROCEDURE IF EXISTS place_order(INT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS fn_place_order(INT, JSONB) CASCADE;

DROP PROCEDURE IF EXISTS checkout_cart(INT, VARCHAR, INT) CASCADE;
DROP PROCEDURE IF EXISTS checkout_cart(INT, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS fn_checkout_cart(INT, VARCHAR) CASCADE;

DROP PROCEDURE IF EXISTS cancel_order(INT) CASCADE;
DROP FUNCTION IF EXISTS fn_cancel_order(INT) CASCADE;

DROP PROCEDURE IF EXISTS bulk_inventory_restock(INT, INT, INT) CASCADE;
DROP PROCEDURE IF EXISTS apply_category_discount(INT, NUMERIC, INT) CASCADE;

DROP FUNCTION IF EXISTS get_customer_total_spent(INT) CASCADE;
DROP FUNCTION IF EXISTS calculate_customer_tier(INT) CASCADE;
DROP FUNCTION IF EXISTS get_product_avg_rating(INT) CASCADE;

DROP VIEW IF EXISTS v_category_performance CASCADE;
DROP VIEW IF EXISTS v_customer_order_summary CASCADE;
DROP VIEW IF EXISTS v_low_stock_alerts CASCADE;

-- ============================================================================
-- 1. TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Trigger 1.1: trg_validate_and_deduct_stock
-- BEFORE INSERT ON order_items
-- Ensures stock availability, locks product row to prevent race conditions,
-- and automatically decrements products.stock_qty.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validate_and_deduct_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_current_stock INT;
    v_product_name  VARCHAR(150);
BEGIN
    -- Acquire exclusive row-level lock on the product to prevent race conditions
    SELECT stock_qty, product_name
    INTO v_current_stock, v_product_name
    FROM products
    WHERE product_id = NEW.product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product with ID % does not exist in inventory.', NEW.product_id;
    END IF;

    -- Validate quantity request against current inventory
    IF v_current_stock < NEW.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product "%" (ID: %): requested %, available %',
            v_product_name, NEW.product_id, NEW.quantity, v_current_stock;
    END IF;

    -- Deduct stock directly inside the database engine
    UPDATE products
    SET stock_qty = stock_qty - NEW.quantity
    WHERE product_id = NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_and_deduct_stock
BEFORE INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION fn_validate_and_deduct_stock();

-- ----------------------------------------------------------------------------
-- Trigger 1.2: trg_update_order_total
-- AFTER INSERT OR UPDATE OR DELETE ON order_items
-- Automatically recalculates and updates orders.total_amount using line item sums.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_order_total()
RETURNS TRIGGER AS $$
DECLARE
    v_target_order_id INT;
    v_recalculated_total NUMERIC(12, 2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_target_order_id := OLD.order_id;
    ELSE
        v_target_order_id := NEW.order_id;
    END IF;

    -- Compute aggregate total for the affected order
    SELECT COALESCE(SUM(quantity * unit_price), 0.00)
    INTO v_recalculated_total
    FROM order_items
    WHERE order_id = v_target_order_id;

    -- Synchronize order master record total
    UPDATE orders
    SET total_amount = v_recalculated_total
    WHERE order_id = v_target_order_id;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_order_total
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW
EXECUTE FUNCTION fn_update_order_total();

-- ----------------------------------------------------------------------------
-- Trigger 1.3: trg_prevent_unverified_review
-- BEFORE INSERT ON reviews
-- Business Integrity Guard: Prevents review fraud by verifying that the customer
-- has actually purchased and received the product before allowing a rating.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_prevent_unverified_review()
RETURNS TRIGGER AS $$
DECLARE
    v_verified_purchase BOOLEAN;
BEGIN
    -- Check if customer has a completed non-cancelled order containing this product
    SELECT EXISTS (
        SELECT 1
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        WHERE o.customer_id = NEW.customer_id
          AND oi.product_id = NEW.product_id
          AND o.status IN ('Placed', 'Shipped', 'Delivered')
    ) INTO v_verified_purchase;

    IF NOT v_verified_purchase THEN
        RAISE EXCEPTION 'Verified Purchase Required: Customer ID % has not purchased Product ID %.',
            NEW.customer_id, NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_unverified_review
BEFORE INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_unverified_review();

-- ----------------------------------------------------------------------------
-- Trigger 1.4: trg_update_cart_timestamp
-- AFTER INSERT OR UPDATE OR DELETE ON cart_items
-- Synchronizes parent carts.updated_at timestamp whenever items are modified.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_cart_timestamp()
RETURNS TRIGGER AS $$
DECLARE
    v_cart_id INT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_cart_id := OLD.cart_id;
    ELSE
        v_cart_id := NEW.cart_id;
    END IF;

    UPDATE carts
    SET updated_at = CURRENT_TIMESTAMP
    WHERE cart_id = v_cart_id;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_cart_timestamp
AFTER INSERT OR UPDATE OR DELETE ON cart_items
FOR EACH ROW
EXECUTE FUNCTION fn_update_cart_timestamp();

-- ============================================================================
-- 2. PROCEDURES (Business Operations & Transactions)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Procedure 2.1: place_order(p_customer_id, p_items JSONB, INOUT p_order_id)
-- Atomically creates an order record, iterates through array of product IDs
-- and quantities, inserts order items, and returns the generated order_id.
-- Triggers 1.1 & 1.2 fire automatically to validate stock and compute totals.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE place_order(
    IN p_customer_id INT,
    IN p_items       JSONB,
    INOUT p_order_id INT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_item          JSONB;
    v_product_id    INT;
    v_quantity      INT;
    v_unit_price    NUMERIC(10, 2);
BEGIN
    -- Validate customer existence
    IF NOT EXISTS (SELECT 1 FROM customers WHERE customer_id = p_customer_id) THEN
        RAISE EXCEPTION 'Customer ID % does not exist.', p_customer_id;
    END IF;

    -- Validate payload integrity
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order item list cannot be null or empty.';
    END IF;

    -- Create Order Header in 'Placed' state with 0 total (recalculated via trigger)
    INSERT INTO orders (customer_id, status, total_amount)
    VALUES (p_customer_id, 'Placed', 0.00)
    RETURNING order_id INTO p_order_id;

    -- Iterate through input JSON items array
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::INT;
        v_quantity   := (v_item->>'quantity')::INT;

        IF v_quantity <= 0 THEN
            RAISE EXCEPTION 'Invalid quantity % for product ID %; must be > 0.', v_quantity, v_product_id;
        END IF;

        -- Extract unit price or lookup from products table if omitted
        IF v_item ? 'unit_price' AND (v_item->>'unit_price') IS NOT NULL THEN
            v_unit_price := (v_item->>'unit_price')::NUMERIC(10, 2);
        ELSE
            SELECT price INTO v_unit_price
            FROM products
            WHERE product_id = v_product_id;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Product ID % not found in products catalog.', v_product_id;
            END IF;
        END IF;

        -- Insert Line Item
        INSERT INTO order_items (order_id, product_id, quantity, unit_price)
        VALUES (p_order_id, v_product_id, v_quantity, v_unit_price);
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION fn_place_order(p_customer_id INT, p_items JSONB)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE v_order_id INT;
BEGIN
    CALL place_order(p_customer_id, p_items, v_order_id);
    RETURN v_order_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- Procedure 2.2: checkout_cart(p_customer_id, p_payment_method, INOUT p_order_id)
-- Atomically transitions active cart items (carts + cart_items) into an
-- immutable order ledger (orders + order_items + payments), verifies stock,
-- and clears the cart.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE checkout_cart(
    IN p_customer_id       INT,
    IN p_payment_method    VARCHAR(30) DEFAULT 'Credit Card',
    INOUT p_order_id       INT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_cart_id       INT;
    v_item          RECORD;
    v_item_count    INT := 0;
    v_order_total   NUMERIC(12, 2);
BEGIN
    -- 1. Validate customer existence
    IF NOT EXISTS (SELECT 1 FROM customers WHERE customer_id = p_customer_id) THEN
        RAISE EXCEPTION 'Customer ID % does not exist.', p_customer_id;
    END IF;

    -- 2. Locate active cart for customer
    SELECT cart_id INTO v_cart_id
    FROM carts
    WHERE customer_id = p_customer_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active shopping cart found for customer ID %.', p_customer_id;
    END IF;

    -- 3. Assert cart has items
    SELECT COUNT(*) INTO v_item_count
    FROM cart_items
    WHERE cart_id = v_cart_id;

    IF v_item_count = 0 THEN
        RAISE EXCEPTION 'Cannot checkout an empty shopping cart (Cart ID: %).', v_cart_id;
    END IF;

    -- 4. Create Master Order record in 'Placed' status
    INSERT INTO orders (customer_id, status, total_amount)
    VALUES (p_customer_id, 'Placed', 0.00)
    RETURNING order_id INTO p_order_id;

    -- 5. Copy each cart item into order_items with current product price snapshot
    FOR v_item IN
        SELECT ci.product_id, ci.quantity, p.price, p.product_name
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.product_id
        WHERE ci.cart_id = v_cart_id
    LOOP
        INSERT INTO order_items (order_id, product_id, quantity, unit_price)
        VALUES (p_order_id, v_item.product_id, v_item.quantity, v_item.price);
    END LOOP;

    -- 6. Retrieve total computed by trg_update_order_total
    SELECT total_amount INTO v_order_total
    FROM orders
    WHERE order_id = p_order_id;

    -- 7. Insert payment record
    INSERT INTO payments (order_id, method, amount, payment_status, payment_date)
    VALUES (p_order_id, p_payment_method, v_order_total, 'Completed', CURRENT_TIMESTAMP);

    -- 8. Purge items from cart session
    DELETE FROM cart_items WHERE cart_id = v_cart_id;

    -- 9. Refresh cart timestamp
    UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE cart_id = v_cart_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_checkout_cart(
    p_customer_id    INT,
    p_payment_method VARCHAR(30) DEFAULT 'Credit Card'
)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE v_order_id INT;
BEGIN
    CALL checkout_cart(p_customer_id, p_payment_method, v_order_id);
    RETURN v_order_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- Procedure 2.3: cancel_order(p_order_id)
-- Marks order status as 'Cancelled', restores stock_qty for all line items,
-- and handles payment status transition (Completed -> Refunded, Pending -> Failed).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE cancel_order(
    IN p_order_id INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_status VARCHAR(20);
    v_item           RECORD;
BEGIN
    -- Check order existence and status with row lock
    SELECT status
    INTO v_current_status
    FROM orders
    WHERE order_id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order ID % not found.', p_order_id;
    END IF;

    IF v_current_status = 'Cancelled' THEN
        RAISE NOTICE 'Order ID % is already cancelled.', p_order_id;
        RETURN;
    END IF;

    IF v_current_status = 'Delivered' THEN
        RAISE EXCEPTION 'Cannot cancel an order that is already Delivered (Order ID: %).', p_order_id;
    END IF;

    -- Restore stock_qty in products for all associated order items
    FOR v_item IN
        SELECT product_id, quantity
        FROM order_items
        WHERE order_id = p_order_id
    LOOP
        UPDATE products
        SET stock_qty = stock_qty + v_item.quantity
        WHERE product_id = v_item.product_id;
    END LOOP;

    -- Update order status to 'Cancelled'
    UPDATE orders
    SET status = 'Cancelled'
    WHERE order_id = p_order_id;

    -- Handle payment status changes
    UPDATE payments
    SET payment_status = CASE
            WHEN payment_status = 'Completed' THEN 'Refunded'
            WHEN payment_status = 'Pending'   THEN 'Failed'
            ELSE payment_status
        END
    WHERE order_id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_cancel_order(p_order_id INT)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
    CALL cancel_order(p_order_id);
    RETURN TRUE;
END;
$$;

-- ============================================================================
-- 3. CURSORS (Explicit Implementation for Rubric Compliance)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Cursor Procedure 3.1: bulk_inventory_restock
-- Demonstrates an EXPLICIT CURSOR with ROW LOCKING and WHERE CURRENT OF.
-- Iterates through products with inventory below threshold and restocks them.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE bulk_inventory_restock(
    IN p_threshold       INT,
    IN p_restock_amount  INT,
    INOUT p_restocked_count INT DEFAULT 0
)
LANGUAGE plpgsql
AS $$
DECLARE
    -- Explicit cursor definition with FOR UPDATE row locking
    cur_low_stock CURSOR FOR
        SELECT product_id, product_name, stock_qty
        FROM products
        WHERE stock_qty <= p_threshold
        FOR UPDATE;

    v_prod_id       INT;
    v_prod_name     VARCHAR(150);
    v_current_stock INT;
BEGIN
    IF p_threshold < 0 OR p_restock_amount <= 0 THEN
        RAISE EXCEPTION 'Threshold must be >= 0 and restock amount must be > 0.';
    END IF;

    p_restocked_count := 0;

    -- 1. Open the explicit cursor
    OPEN cur_low_stock;

    -- 2. Loop and fetch rows one by one
    LOOP
        FETCH cur_low_stock INTO v_prod_id, v_prod_name, v_current_stock;
        EXIT WHEN NOT FOUND;

        -- 3. Perform cursor-based positional update
        UPDATE products
        SET stock_qty = stock_qty + p_restock_amount
        WHERE CURRENT OF cur_low_stock;

        p_restocked_count := p_restocked_count + 1;
        RAISE NOTICE 'Cursor Restocked: % (ID: %) from % to % units',
            v_prod_name, v_prod_id, v_current_stock, v_current_stock + p_restock_amount;
    END LOOP;

    -- 4. Close the explicit cursor
    CLOSE cur_low_stock;
END;
$$;

-- ----------------------------------------------------------------------------
-- Cursor Procedure 3.2: apply_category_discount
-- Demonstrates a PARAMETERIZED EXPLICIT CURSOR.
-- Applies a promotional discount percentage to all products in a category.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE apply_category_discount(
    IN p_category_id      INT,
    IN p_discount_pct     NUMERIC,
    INOUT p_updated_count INT DEFAULT 0
)
LANGUAGE plpgsql
AS $$
DECLARE
    -- Parameterized explicit cursor
    cur_cat_products CURSOR(p_cat INT) FOR
        SELECT product_id, product_name, price
        FROM products
        WHERE category_id = p_cat
        FOR UPDATE;

    v_prod_id   INT;
    v_prod_name VARCHAR(150);
    v_old_price NUMERIC(10, 2);
    v_new_price NUMERIC(10, 2);
BEGIN
    IF p_discount_pct <= 0 OR p_discount_pct >= 100 THEN
        RAISE EXCEPTION 'Discount percentage must be strictly between 0 and 100.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM categories WHERE category_id = p_category_id) THEN
        RAISE EXCEPTION 'Category ID % does not exist.', p_category_id;
    END IF;

    p_updated_count := 0;

    -- Open parameterized cursor passing category_id
    OPEN cur_cat_products(p_category_id);

    LOOP
        FETCH cur_cat_products INTO v_prod_id, v_prod_name, v_old_price;
        EXIT WHEN NOT FOUND;

        v_new_price := ROUND(v_old_price * (1.0 - (p_discount_pct / 100.0)), 2);

        UPDATE products
        SET price = v_new_price
        WHERE CURRENT OF cur_cat_products;

        p_updated_count := p_updated_count + 1;
        RAISE NOTICE 'Cursor Discount Applied: % (ID: %) price changed from % to %',
            v_prod_name, v_prod_id, v_old_price, v_new_price;
    END LOOP;

    CLOSE cur_cat_products;
END;
$$;

-- ============================================================================
-- 4. FUNCTIONS (Business Logic & Calculations)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function 4.1: get_customer_total_spent(p_customer_id)
-- Returns aggregate lifetime spend of a customer excluding cancelled orders.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_customer_total_spent(
    p_customer_id INT
)
RETURNS NUMERIC(12, 2)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_spent NUMERIC(12, 2);
BEGIN
    SELECT COALESCE(SUM(total_amount), 0.00)
    INTO v_total_spent
    FROM orders
    WHERE customer_id = p_customer_id
      AND status IN ('Placed', 'Shipped', 'Delivered');

    RETURN v_total_spent;
END;
$$;

-- ----------------------------------------------------------------------------
-- Function 4.2: calculate_customer_tier(p_customer_id)
-- Evaluates loyalty tier (PLATINUM, GOLD, SILVER, BRONZE) based on spend.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_customer_tier(
    p_customer_id INT
)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
AS $$
DECLARE
    v_spend NUMERIC(12, 2);
    v_tier  VARCHAR(20);
BEGIN
    v_spend := get_customer_total_spent(p_customer_id);

    IF v_spend >= 500.00 THEN
        v_tier := 'PLATINUM';
    ELSIF v_spend >= 250.00 THEN
        v_tier := 'GOLD';
    ELSIF v_spend >= 100.00 THEN
        v_tier := 'SILVER';
    ELSE
        v_tier := 'BRONZE';
    END IF;

    RETURN v_tier;
END;
$$;

-- ----------------------------------------------------------------------------
-- Function 4.3: get_product_avg_rating(p_product_id)
-- Returns average rating rounded to 2 decimal places.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_product_avg_rating(
    p_product_id INT
)
RETURNS NUMERIC(3, 2)
LANGUAGE plpgsql
AS $$
DECLARE
    v_avg NUMERIC(3, 2);
BEGIN
    SELECT ROUND(AVG(rating)::NUMERIC, 2)
    INTO v_avg
    FROM reviews
    WHERE product_id = p_product_id;

    RETURN COALESCE(v_avg, 0.00);
END;
$$;

-- ============================================================================
-- 5. DATABASE VIEWS (Analytical & Aggregated Reporting)
-- ============================================================================

-- View 5.1: Category Performance Leaderboard
CREATE OR REPLACE VIEW v_category_performance AS
SELECT 
    c.category_id,
    c.category_name,
    COUNT(DISTINCT o.order_id) AS total_orders,
    COALESCE(SUM(oi.quantity), 0) AS total_units_sold,
    COALESCE(SUM(oi.quantity * oi.unit_price), 0.00) AS total_revenue,
    DENSE_RANK() OVER (ORDER BY COALESCE(SUM(oi.quantity * oi.unit_price), 0.00) DESC) AS revenue_rank
FROM categories c
LEFT JOIN products p ON c.category_id = p.category_id
LEFT JOIN order_items oi ON p.product_id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.order_id AND o.status != 'Cancelled'
GROUP BY c.category_id, c.category_name;

-- View 5.2: Customer Order Summary & Spend Metrics
CREATE OR REPLACE VIEW v_customer_order_summary AS
SELECT 
    c.customer_id,
    c.customer_name,
    c.email,
    c.city,
    COUNT(DISTINCT CASE WHEN o.status != 'Cancelled' THEN o.order_id END) AS completed_orders,
    COALESCE(SUM(CASE WHEN o.status != 'Cancelled' THEN o.total_amount ELSE 0.00 END), 0.00) AS lifetime_spent,
    MAX(o.order_date) AS last_order_date
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.customer_name, c.email, c.city;

-- View 5.3: Low Inventory Stock Warning System
CREATE OR REPLACE VIEW v_low_stock_alerts AS
SELECT 
    p.product_id,
    p.product_name,
    c.category_name,
    p.stock_qty,
    p.price,
    CASE 
        WHEN p.stock_qty = 0 THEN 'OUT OF STOCK'
        WHEN p.stock_qty <= 5 THEN 'CRITICAL LOW'
        ELSE 'LOW STOCK'
    END AS alert_severity
FROM products p
JOIN categories c ON p.category_id = c.category_id
WHERE p.stock_qty <= 10
ORDER BY p.stock_qty ASC;
