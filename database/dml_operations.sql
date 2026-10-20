-- ============================================================================
-- E-COMMERCE DATABASE MANAGEMENT SYSTEM (DML Operations)
-- Academic DBMS Project - Rubric Item 2: DML & Data Population
-- Students / Authors:
--   - Nisha Rathi (24BYB0137)
--   - Anshul Gupta (24BYB0149)
-- Database Engine: PostgreSQL 14+
-- ============================================================================
-- This script demonstrates meaningful Data Manipulation Language (DML)
-- statements including INSERT, UPDATE, and DELETE operations, showcasing
-- data lifecycle management, constraint validation, and referential integrity.
-- ============================================================================

-- ============================================================================
-- 1. MEANINGFUL INSERT OPERATIONS
-- ============================================================================

-- 1.1 Single-Row Insert: Register a new customer
INSERT INTO customers (customer_name, email, phone, city, join_date)
VALUES ('Kavita Nair', 'kavita.nair@example.com', '+91-9988776655', 'Kochi', CURRENT_TIMESTAMP);

-- 1.2 Multi-Row Insert: Add new inventory items to existing categories
INSERT INTO products (product_name, category_id, price, stock_qty)
VALUES 
('Wireless Ergonomic Mouse', 1, 49.99, 50),
('USB-C 7-in-1 Hub Multiport Adapter', 1, 35.50, 45),
('Thermal Insulated Water Bottle (1L)', 5, 22.00, 60);

-- 1.3 Active Shopping Cart Initialization: Create a new cart session
INSERT INTO carts (customer_id, updated_at)
VALUES (
    (SELECT customer_id FROM customers WHERE email = 'kavita.nair@example.com'),
    CURRENT_TIMESTAMP
);

-- 1.4 Cart Items Insertion: Add multiple items into Kavita's shopping cart
INSERT INTO cart_items (cart_id, product_id, quantity)
SELECT 
    c.cart_id,
    p.product_id,
    2
FROM carts c
CROSS JOIN products p
WHERE c.customer_id = (SELECT customer_id FROM customers WHERE email = 'kavita.nair@example.com')
  AND p.product_name = 'Wireless Ergonomic Mouse';

-- 1.5 Conditional / Subquery Insert: Record an order from cart data
-- (Simulated manual checkout demonstrating subquery insert)
INSERT INTO orders (customer_id, order_date, status, total_amount)
VALUES (
    (SELECT customer_id FROM customers WHERE email = 'kavita.nair@example.com'),
    CURRENT_TIMESTAMP,
    'Placed',
    0.00 -- Note: Trigger trg_update_order_total will calculate this upon order_items insert
);

-- ============================================================================
-- 2. MEANINGFUL UPDATE OPERATIONS
-- ============================================================================

-- 2.1 Conditional Update: Apply a 10% promotional inflation/markdown across a category
UPDATE products
SET price = ROUND(price * 0.90, 2)
WHERE category_id = (SELECT category_id FROM categories WHERE category_name = 'Books & Stationery');

-- 2.2 Inventory Replenishment: Restock products that are low in stock
UPDATE products
SET stock_qty = stock_qty + 25
WHERE stock_qty <= 5;

-- 2.3 Customer Profile Modification: Update contact information and city
UPDATE customers
SET phone = '+91-9911223344',
    city = 'Gurugram'
WHERE email = 'aarav.sharma@example.com';

-- 2.4 State Transition: Advance order lifecycle from 'Placed' to 'Shipped'
UPDATE orders
SET status = 'Shipped'
WHERE order_id = 9
  AND status = 'Placed';

-- 2.5 Payment Settlement Update: Mark payment as completed when settled
UPDATE payments
SET payment_status = 'Completed',
    payment_date = CURRENT_TIMESTAMP
WHERE order_id = 9
  AND payment_status = 'Pending';

-- ============================================================================
-- 3. MEANINGFUL DELETE OPERATIONS
-- ============================================================================

-- 3.1 Item Removal from Active Cart: Customer removes an unwanted product
DELETE FROM cart_items
WHERE cart_id = (
    SELECT cart_id FROM carts
    WHERE customer_id = (SELECT customer_id FROM customers WHERE email = 'kavita.nair@example.com')
)
AND product_id = (SELECT product_id FROM products WHERE product_name = 'Wireless Ergonomic Mouse');

-- 3.2 Demonstrating ON DELETE CASCADE:
-- Deleting an entire customer account cascades and automatically deletes:
-- their active cart session (carts), cart line items (cart_items), and reviews (reviews).
-- First, let's create a temporary test customer to safely demonstrate CASCADE:
INSERT INTO customers (customer_name, email, city)
VALUES ('Temporary User', 'temp.user@example.com', 'TestCity');

INSERT INTO carts (customer_id)
VALUES ((SELECT customer_id FROM customers WHERE email = 'temp.user@example.com'));

-- Delete temporary customer -> verifies automatic cascade to carts
DELETE FROM customers
WHERE email = 'temp.user@example.com';

-- 3.3 Demonstrating ON DELETE RESTRICT (Data Protection):
-- Attempting to delete a category that still contains active products
-- will be rejected by PostgreSQL foreign key constraint `fk_products_category`.
-- Run this statement to demonstrate engine-level protection:
-- DELETE FROM categories WHERE category_id = 1;
-- Output: ERROR: update or delete on table "categories" violates foreign key constraint "fk_products_category" on table "products"

-- 3.4 Soft Deletion / Audit Simulation: Purge old cancelled orders older than 1 year
-- DELETE FROM orders WHERE status = 'Cancelled' AND order_date < NOW() - INTERVAL '1 year';
