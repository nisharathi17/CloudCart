# Academic DBMS Rubric Compliance & Evaluation Guide

**Project**: E-Commerce Database Management System  
**Authors**: Nisha Rathi (`24BYB0137`) & Anshul Gupta (`24BYB0149`)  
**Target Engine**: PostgreSQL 14+ / Third Normal Form (3NF)  
**Total Evaluation Marks**: 9 Marks (Full Marks Breakdown)  

---

## 1. Executive Rubric Alignment Summary

This document maps every single evaluation criterion specified by your DBMS course evaluation rubric to the exact SQL implementation files, schema definitions, routines, and test scenarios.

| Rubric Component | Marks Allocated | Implementation File | Key Concepts Demonstrated | Status |
|---|---|---|---|---|
| **1. DDL & Constraints** | **2 Marks** | [`database/schema.sql`](file:///c:/Users/anshu/Documents/codes/DBMS%20PROJECT/database/schema.sql) | 10 tables in 3NF, PK, FK (`RESTRICT` vs `CASCADE`), domain checks, composite unique, B-tree indexes. | **100% Implemented** |
| **2. DML & Data Population** | **1 Mark** | [`database/seed.sql`](file:///c:/Users/anshu/Documents/codes/DBMS%20PROJECT/database/seed.sql)<br>[`database/dml_operations.sql`](file:///c:/Users/anshu/Documents/codes/DBMS%20PROJECT/database/dml_operations.sql) | Meaningful multi-row inserts, conditional price adjustments, inventory updates, cart deletions, cascade & restrict verification. | **100% Implemented** |
| **3. SQL Queries** | **2 Marks** | [`database/queries.sql`](file:///c:/Users/anshu/Documents/codes/DBMS%20PROJECT/database/queries.sql) | 15 advanced queries: 4-way Joins, `GROUP BY`, `HAVING`, Correlated Subqueries, `EXISTS`, Window functions (`DENSE_RANK`, running totals), Set ops (`UNION`, `INTERSECT`, `EXCEPT`), CTEs. | **100% Implemented** |
| **4. Procedures & Functions** | **2 Marks** | [`database/procedures_triggers.sql`](file:///c:/Users/anshu/Documents/codes/DBMS%20PROJECT/database/procedures_triggers.sql) | Atomic stored procedures (`place_order`, `checkout_cart`, `cancel_order`) with `INOUT` params; stored functions (`get_customer_total_spent`, `calculate_customer_tier`, `get_product_avg_rating`). | **100% Implemented** |
| **5. Cursor & Triggers** | **2 Marks** | [`database/procedures_triggers.sql`](file:///c:/Users/anshu/Documents/codes/DBMS%20PROJECT/database/procedures_triggers.sql) | Explicit Cursors (`bulk_inventory_restock` with row locking & `WHERE CURRENT OF`, parameterized cursor `apply_category_discount`); 4 Active Triggers (`BEFORE`/`AFTER` INSERT/UPDATE/DELETE). | **100% Implemented** |

---

## 2. Detailed Rubric Item Mapping

### Rubric Item 1: DDL & Constraints (2 Marks)
> *"Creation of tables with appropriate PK, FK and other constraints"*

#### Implementation Highlights in `database/schema.sql`:
1. **Primary Keys (`PK`)**:
   - Surrogate auto-incrementing serial primary keys across all master tables: `category_id`, `product_id`, `customer_id`, `cart_id`, `cart_item_id`, `order_id`, `order_item_id`, `payment_id`, `review_id`.
   - Identifying composite foreign/primary key in `customer_segments (customer_id)`.
2. **Foreign Keys (`FK`) & Referential Actions**:
   - `ON DELETE RESTRICT`: Used on `products.category_id`, `orders.customer_id`, and `order_items.product_id` to prevent accidental deletion of categories or historical sales records.
   - `ON DELETE CASCADE`: Used on `carts.customer_id`, `cart_items.cart_id`, and `reviews.customer_id` so that deleting a user or cart session automatically purges dependent lines.
3. **Domain & Check Constraints (`CHECK`)**:
   - Positive pricing: `CONSTRAINT chk_products_price_positive CHECK (price > 0)`
   - Non-negative stock: `CONSTRAINT chk_products_stock_non_negative CHECK (stock_qty >= 0)`
   - Quantity bounds: `CONSTRAINT chk_order_items_quantity_positive CHECK (quantity > 0)`
   - Review star rating bounds: `CONSTRAINT chk_reviews_rating_range CHECK (rating BETWEEN 1 AND 5)`
   - Lifecycle state constraints: `CHECK (status IN ('Placed', 'Shipped', 'Delivered', 'Cancelled'))` and `CHECK (payment_status IN ('Pending', 'Completed', 'Failed', 'Refunded'))`.
4. **Unique Constraints (`UNIQUE`)**:
   - Single-column uniqueness: `categories.category_name UNIQUE`, `customers.email UNIQUE`, `carts.customer_id UNIQUE`.
   - Composite uniqueness: `UNIQUE (cart_id, product_id)`, `UNIQUE (order_id, product_id)`, `UNIQUE (customer_id, product_id)`.
5. **Physical Storage Optimization**:
   - B-Tree indexes created on all join keys (`category_id`, `customer_id`, `order_id`, `product_id`) and search targets (`email`, `status`).

---

### Rubric Item 2: DML & Data Population (1 Mark)
> *"Meaningful insertion, modification and deletion of data"*

#### Implementation Highlights in `database/seed.sql` & `database/dml_operations.sql`:
1. **Meaningful Inserts (`INSERT`)**:
   - Single-row customer registration.
   - Multi-row catalog product expansion with category links.
   - Subquery-driven shopping cart initialization (`INSERT INTO cart_items ... SELECT ...`).
   - Comprehensive seed baseline in `database/seed.sql` with 5 categories, 15 products, 10 customers, 4 active carts, 12 historical orders, 12 payments, and 10 reviews.
2. **Meaningful Updates (`UPDATE`)**:
   - Conditional bulk update: Category-wide 10% promotional markdown with rounding (`UPDATE products SET price = ROUND(price * 0.90, 2) WHERE category_id = ...`).
   - State transition: Advancing orders from `'Placed'` to `'Shipped'`.
   - Inventory replenishment: Re-stocking products where `stock_qty <= 5`.
   - Settlement tracking: Updating pending payments to `'Completed'` upon clearance.
3. **Meaningful Deletions (`DELETE`)**:
   - Line-item removal from active shopping cart sessions.
   - Demonstrating `ON DELETE CASCADE`: Deleting a customer purges their cart and reviews automatically.
   - Demonstrating `ON DELETE RESTRICT`: Proving that PostgreSQL aborts category deletion when child products exist.

---

### Rubric Item 3: SQL Queries (2 Marks)
> *"Meaningful queries using joins, aggregation, subqueries, grouping, etc."*

#### Implementation Highlights in `database/queries.sql`:
1. **Multi-Table Joins**:
   - **Query 1.1**: 4-way `INNER JOIN` (`orders` $\bowtie$ `customers` $\bowtie$ `order_items` $\bowtie$ `products` $\bowtie$ `payments`) producing comprehensive order audit ledgers.
   - **Query 1.2**: `LEFT OUTER JOIN` reporting all catalog products including unsold products (`COALESCE(SUM(...), 0)`).
   - **Query 1.3**: `FULL OUTER JOIN` comparing customers with active carts vs customers who placed orders.
2. **Aggregations & Grouping**:
   - **Query 2.1**: Category performance analysis with `GROUP BY` and `HAVING SUM(...) >= 100.00`.
   - **Query 2.2**: City-level regional spend analysis with `COUNT(DISTINCT ...)`, `SUM`, and `AVG`.
3. **Subqueries**:
   - **Query 3.1**: **Correlated Subquery** finding products priced strictly above the average of their own category.
   - **Query 3.2**: Subquery with `NOT IN` identifying products that have never been purchased.
   - **Query 3.3**: Subquery with `EXISTS` finding customers who completed high-value orders ($> \$200$).
   - **Query 3.4**: Scalar subquery comparing individual customer spend against platform average spend.
4. **Window Functions**:
   - **Query 4.1**: `DENSE_RANK() OVER (PARTITION BY category_id ORDER BY price DESC)` ranking products within category.
   - **Query 4.2**: `SUM(total_amount) OVER (ORDER BY order_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` computing running cumulative platform revenue.
   - **Query 4.3**: `ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC)` fetching each customer's most recent order.
5. **Set Operations**:
   - **Query 5.1**: `INTERSECT` finding customers who have both ordered and reviewed products.
   - **Query 5.2**: `EXCEPT` finding customers who registered but never placed an order.
   - **Query 5.3**: `UNION ALL` consolidating inflow payments vs outflow refunds.
6. **Common Table Expressions (CTE)**:
   - **Query 6.1**: Full RFM Behavioral Matrix CTE segmenting customers into Platinum, Active, and At-Risk tiers.

---

### Rubric Item 4: Procedures & Functions (2 Marks)
> *"Appropriate implementation of business operations using Procedures and Functions"*

#### Implementation Highlights in `database/procedures_triggers.sql`:
1. **Stored Procedures (`PROCEDURE`)**:
   - `place_order(p_customer_id INT, p_items JSONB, INOUT p_order_id INT)`:
     Atomically creates an order header, iterates through JSONB array of items inserting into `order_items`, invokes stock deduction, and returns `order_id`.
   - `checkout_cart(p_customer_id INT, p_payment_method VARCHAR, INOUT p_order_id INT)`:
     Atomically migrates active mutable cart items (`carts` + `cart_items`) into immutable order lines (`orders` + `order_items` + `payments`), clears the cart, and refreshes timestamps.
   - `cancel_order(p_order_id INT)`:
     Row-locks order (`FOR UPDATE`), restores quantities to `products.stock_qty`, sets status to `'Cancelled'`, and marks payment as `'Refunded'`.
2. **Stored Functions (`FUNCTION`)**:
   - `get_customer_total_spent(p_customer_id INT) RETURNS NUMERIC(12, 2)`:
     Computes total lifetime spend across non-cancelled orders.
   - `calculate_customer_tier(p_customer_id INT) RETURNS VARCHAR(20)`:
     Assigns customer tier (`PLATINUM`, `GOLD`, `SILVER`, `BRONZE`) using conditional spend thresholds.
   - `get_product_avg_rating(p_product_id INT) RETURNS NUMERIC(3, 2)`:
     Computes rounded average star rating for a product.

---

### Rubric Item 5: Cursor & Triggers (2 Marks)
> *"Meaningful use of Cursor and Triggers in the proposed application"*

#### 1. Explicit Cursors (Two distinct implementations in `database/procedures_triggers.sql`):
1. **Cursor Procedure 1: `bulk_inventory_restock(p_threshold INT, p_restock_amount INT)`**:
   - **Concept Demonstrated**: Explicit Cursor with **Row Locking (`FOR UPDATE`)** and **Positional Update (`WHERE CURRENT OF cursor_name`)**.
   - **Execution Flow**:
     ```sql
     DECLARE
         cur_low_stock CURSOR FOR
             SELECT product_id, product_name, stock_qty
             FROM products
             WHERE stock_qty <= p_threshold
             FOR UPDATE;
     BEGIN
         OPEN cur_low_stock;
         LOOP
             FETCH cur_low_stock INTO v_prod_id, v_prod_name, v_current_stock;
             EXIT WHEN NOT FOUND;
             UPDATE products
             SET stock_qty = stock_qty + p_restock_amount
             WHERE CURRENT OF cur_low_stock;
         END LOOP;
         CLOSE cur_low_stock;
     END;
     ```
2. **Cursor Procedure 2: `apply_category_discount(p_category_id INT, p_discount_pct NUMERIC)`**:
   - **Concept Demonstrated**: **Parameterized Explicit Cursor** (`CURSOR(param INT)`).
   - Iterates through all products belonging to a specified category and applies discounted prices with audit logging.

#### 2. Active Triggers (Four distinct triggers in `database/procedures_triggers.sql`):
1. **Trigger 1: `trg_validate_and_deduct_stock`** (`BEFORE INSERT ON order_items`):
   - Concurrency control trigger using `SELECT ... FOR UPDATE`.
   - Validates available inventory and raises an exception if requested quantity exceeds stock.
   - Automatically decrements `products.stock_qty`.
2. **Trigger 2: `trg_update_order_total`** (`AFTER INSERT OR UPDATE OR DELETE ON order_items`):
   - Automatically recalculates line item totals and updates `orders.total_amount`.
3. **Trigger 3: `trg_prevent_unverified_review`** (`BEFORE INSERT ON reviews`):
   - Business integrity trigger preventing fake reviews.
   - Asserts that the customer has a valid delivered order containing the product before allowing a rating.
4. **Trigger 4: `trg_update_cart_timestamp`** (`AFTER INSERT OR UPDATE OR DELETE ON cart_items`):
   - Automatically updates parent `carts.updated_at` when line items are altered.

---

## 3. Quick Defense / Viva Demonstration Script

When your professor asks to evaluate each rubric section, execute these commands in `psql` or pgAdmin:

### Step 1: Prove DDL & Constraints (2 Marks)
```sql
-- Show table structure and constraints
\d+ products
\d+ order_items

-- Demonstrate CHECK constraint blocking invalid input
INSERT INTO products (product_name, category_id, price, stock_qty)
VALUES ('Faulty Product', 1, -25.00, 10);
-- Expected result: ERROR: new row for relation "products" violates check constraint "chk_products_price_positive"
```

### Step 2: Prove DML & Population (1 Mark)
```sql
-- Run DML operations script
\i database/dml_operations.sql

-- Verify customer registration and cart items
SELECT * FROM customers WHERE email = 'kavita.nair@example.com';
```

### Step 3: Prove Complex Queries (2 Marks)
```sql
-- Query 3.1: Correlated Subquery (Premium products above category average)
\i database/queries.sql
```

### Step 4: Prove Procedures & Functions (2 Marks)
```sql
-- Test Function: Lifetime spend & tier
SELECT customer_name, get_customer_total_spent(customer_id) AS spend, calculate_customer_tier(customer_id) AS tier
FROM customers;

-- Test Procedure: Cart Checkout
CALL checkout_cart(7, 'UPI');
```

### Step 5: Prove Explicit Cursors & Triggers (2 Marks)
```sql
-- Test Explicit Cursor: Restock all products with stock <= 10 by +20 units
CALL bulk_inventory_restock(10, 20);

-- Test Trigger: Concurrency lock & stock deduction
SELECT product_name, stock_qty FROM products WHERE product_id = 1;
CALL place_order(1, '[{"product_id": 1, "quantity": 2}]'::jsonb);
SELECT product_name, stock_qty FROM products WHERE product_id = 1;
```
