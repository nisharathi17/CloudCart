# Database Implementation Plan & Technical Execution Roadmap

**Project**: E-Commerce Database Management System  
**Database Engine**: PostgreSQL 16 (Containerized via Docker / Local Native)  
**ORM Layer**: Prisma ORM v6  
**Relational Normalization**: Third Normal Form (3NF)  
**Status**: Ready for Database Engineer Execution  

---

## 1. Executive Summary & Database Scope

This implementation plan defines the complete engineering roadmap for the **Database Track (Backend / DBA)**. The database is the authoritative core of the system: all business rules, inventory constraints, atomic state transitions, and audit trails are enforced at the database engine level, rather than relying solely on client-side or application-layer code.

### Core Objectives
1. **Strict 3NF Compliance**: 8 core relational entities (`categories`, `products`, `customers`, `carts`, `cart_items`, `orders`, `order_items`, `payments`, `reviews`) plus 1 analytical machine learning target entity (`customer_segments`).
2. **Engine-Level Data Integrity**: Primary keys, foreign keys with explicit `CASCADE`/`RESTRICT` rules, composite unique constraints, domain check constraints, and check constraint enums.
3. **Transactional Safety & Concurrency Control**: PL/pgSQL triggers utilizing row-level locking (`SELECT ... FOR UPDATE`) to eliminate race conditions and prevent negative inventory.
4. **State Transition Automation**: Atomic stored procedures for cart checkout (`place_order`) and inventory restock (`cancel_order`).
5. **Type-Safe ORM Synchronization**: Aligning PostgreSQL native tables with Prisma ORM schemas (`schema.prisma`).
6. **Analytical & Reporting SQL**: Aggregations, window functions, running totals, and the RFM extraction CTE for machine learning.

---

## 2. Phase-by-Phase Implementation Blueprint

```mermaid
flowchart TD
    P1["Phase 1: Environment & Engine Initialization"] --> P2["Phase 2: DDL & Relational Schema Construction"]
    P2 --> P3["Phase 3: Engine-Level Triggers & Stored Logic"]
    P3 --> P4["Phase 4: Prisma ORM Integration & Type Generation"]
    P4 --> P5["Phase 5: Seed Dataset & Stress Test Generation"]
    P5 --> P6["Phase 6: Analytical Queries, Views & ML Extraction"]
    P6 --> P7["Phase 7: Test Suite, ACID Validation & Concurrency Benchmarks"]
```

---

### Phase 1: Environment & PostgreSQL Engine Initialization

#### 1.1 Docker PostgreSQL 16 Setup
- **Target File**: `docker-compose.yml`
- **Execution Steps**:
  1. Verify the container configuration:
     - Image: `postgres:16-alpine`
     - Database: `ecommerce_db`
     - User: `postgres`
     - Port: `5432` mapped to host `5432`
     - Persistent volume: `pgdata`
  2. Configure automatic initialization scripts mounting in `/docker-entrypoint-initdb.d/`:
     - `01_schema.sql` (Tables & Constraints)
     - `02_procedures_triggers.sql` (Routines & Triggers)
     - `03_seed.sql` (Seed Data)
  3. Validate connection string in `.env`:
     `DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/ecommerce_db"`

#### 1.2 Verification Criteria
- Run `docker compose up -d`.
- Connect via `psql` or database client and verify PostgreSQL responds to `SELECT version();`.

---

### Phase 2: DDL & Relational Schema Construction (3NF)

#### 2.1 Table Creation Hierarchy (Dependency Order)
To avoid foreign key dependency errors during execution and teardown, tables must be dropped and created in a strictly ordered hierarchy:

```
[Drop Hierarchy (Reverse Order)]:
customer_segments -> reviews -> payments -> order_items -> orders -> cart_items -> carts -> products -> categories -> customers

[Create Hierarchy (Dependency Order)]:
1. categories (Independent Master)
2. customers (Independent Master)
3. products (Depends on categories)
4. carts (Depends on customers, 1:1)
5. cart_items (Depends on carts & products, M:N)
6. orders (Depends on customers)
7. order_items (Depends on orders & products, M:N)
8. payments (Depends on orders, 1:1)
9. reviews (Depends on customers & products)
10. customer_segments (Depends on customers, 1:1 identifying)
```

#### 2.2 Entity Specifications & Integrity Constraints

| Table Name | Primary Key | Foreign Keys & Actions | Business & Check Constraints | Required Indexes |
|---|---|---|---|---|
| `categories` | `category_id` (SERIAL) | None | `category_name VARCHAR(100) UNIQUE NOT NULL` | `category_name` |
| `products` | `product_id` (SERIAL) | `category_id -> categories` (`ON DELETE RESTRICT`) | `CHECK (price > 0)`, `CHECK (stock_qty >= 0)` | `idx_products_category`, `idx_products_name` |
| `customers` | `customer_id` (SERIAL) | None | `email VARCHAR(150) UNIQUE NOT NULL` | `idx_customers_email`, `idx_customers_city` |
| `carts` | `cart_id` (SERIAL) | `customer_id -> customers` (`ON DELETE CASCADE`, `UNIQUE`) | 1:1 owner constraint | `customer_id` |
| `cart_items` | `cart_item_id` (SERIAL)| `cart_id -> carts` (`CASCADE`), `product_id -> products` (`CASCADE`) | `UNIQUE (cart_id, product_id)`, `CHECK (quantity > 0)` | `cart_id`, `product_id` |
| `orders` | `order_id` (SERIAL) | `customer_id -> customers` (`ON DELETE RESTRICT`) | `CHECK (status IN ('Placed', 'Shipped', 'Delivered', 'Cancelled'))`, `CHECK (total_amount >= 0)` | `idx_orders_customer`, `idx_orders_date`, `idx_orders_status` |
| `order_items` | `order_item_id` (SERIAL)| `order_id -> orders` (`CASCADE`), `product_id -> products` (`RESTRICT`)| `UNIQUE (order_id, product_id)`, `CHECK (quantity > 0)`, `CHECK (unit_price > 0)` | `idx_order_items_order`, `idx_order_items_product` |
| `payments` | `payment_id` (SERIAL) | `order_id -> orders` (`CASCADE`, `UNIQUE`) | `CHECK (amount > 0)`, `CHECK (payment_status IN ('Pending', 'Completed', 'Failed', 'Refunded'))` | `idx_payments_order`, `idx_payments_status` |
| `reviews` | `review_id` (SERIAL) | `customer_id -> customers` (`CASCADE`), `product_id -> products` (`CASCADE`) | `UNIQUE (customer_id, product_id)`, `CHECK (rating BETWEEN 1 AND 5)` | `idx_reviews_product`, `idx_reviews_customer` |
| `customer_segments` | `customer_id` (INT) | `customer_id -> customers` (`CASCADE`) | `CHECK (recency_days >= 0)`, `CHECK (frequency >= 0)`, `CHECK (monetary_value >= 0)` | `idx_customer_segments_label` |

#### 2.3 Verification Criteria
- Execute `database/schema.sql`.
- Verify all 10 tables exist.
- Verify that attempting to insert a negative price or negative stock immediately throws a check constraint violation.

---

### Phase 3: Engine-Level Triggers & Stored Logic (PL/pgSQL)

#### 3.1 Trigger 1: Real-Time Stock Validation & Deduction (`trg_validate_and_deduct_stock`)
- **Event**: `BEFORE INSERT ON order_items FOR EACH ROW`
- **Execution Flow**:
  1. Acquire an exclusive row-level lock on the product:
     ```sql
     SELECT stock_qty, product_name FROM products WHERE product_id = NEW.product_id FOR UPDATE;
     ```
  2. If `stock_qty < NEW.quantity`, raise exception with informative message:
     `RAISE EXCEPTION 'Insufficient stock for product "%" (ID: %): requested %, available %'`
  3. Deduct stock directly inside PostgreSQL:
     ```sql
     UPDATE products SET stock_qty = stock_qty - NEW.quantity WHERE product_id = NEW.product_id;
     ```
  4. Return `NEW` to proceed with line-item insertion.

#### 3.2 Trigger 2: Order Total Recalculation (`trg_update_order_total`)
- **Event**: `AFTER INSERT OR UPDATE OR DELETE ON order_items FOR EACH ROW`
- **Execution Flow**:
  1. Identify affected `order_id` (using `NEW.order_id` for insert/update, `OLD.order_id` for delete).
  2. Compute line-item sum:
     ```sql
     SELECT COALESCE(SUM(quantity * unit_price), 0.00) INTO v_recalculated_total
     FROM order_items WHERE order_id = v_target_order_id;
     ```
  3. Update master order:
     ```sql
     UPDATE orders SET total_amount = v_recalculated_total WHERE order_id = v_target_order_id;
     ```

#### 3.3 Stored Procedure: `place_order(p_customer_id INT, p_items JSONB, OUT p_order_id INT)`
- **Purpose**: Atomically creates an order, adds line items, triggers stock deduction, records payment, and clears active cart.
- **Execution Flow**:
  1. Validate customer existence.
  2. Insert record into `orders (customer_id, status, total_amount)` &rarr; retrieves new `order_id`.
  3. Loop through `p_items` JSON array:
     - Read `product_id`, `quantity`, `unit_price`.
     - Insert into `order_items` &rarr; fires `trg_validate_and_deduct_stock`.
  4. Insert default record into `payments (order_id, amount, method, payment_status)`.
  5. Clear active customer cart in `cart_items` where `cart_id = (SELECT cart_id FROM carts WHERE customer_id = p_customer_id)`.

#### 3.4 Stored Procedure: `cancel_order(p_order_id INT)`
- **Purpose**: Atomically cancels an active order and restores physical inventory.
- **Execution Flow**:
  1. Acquire row lock on `orders` where `order_id = p_order_id FOR UPDATE`.
  2. Assert current status is not `'Cancelled'` or `'Delivered'`.
  3. Query all lines from `order_items WHERE order_id = p_order_id`.
  4. For each item:
     ```sql
     UPDATE products SET stock_qty = stock_qty + item.quantity WHERE product_id = item.product_id;
     ```
  5. Update order status:
     ```sql
     UPDATE orders SET status = 'Cancelled' WHERE order_id = p_order_id;
     ```
  6. Update payment status:
     ```sql
     UPDATE payments SET payment_status = 'Refunded' WHERE order_id = p_order_id;
     ```

#### 3.5 Stored Function: `get_customer_total_spent(p_customer_id INT) RETURNS NUMERIC(12, 2)`
- Returns the exact sum of all non-cancelled orders for a specific customer.

---

### Phase 4: Prisma ORM Integration & Type Generation

#### 4.1 Schema Modeling (`prisma/schema.prisma`)
- Map models to existing PostgreSQL table names via `@@map("table_name")`.
- Map camelCase TypeScript fields to snake_case database columns via `@map("column_name")`.
- Configure model relations (`@relation`) with referential actions (`onDelete`, `onUpdate`).

#### 4.2 Synchronization Commands
1. **Generate TypeScript Types**:
   ```bash
   npm run prisma:generate
   ```
2. **Schema Verification / Introspection**:
   ```bash
   npm run prisma:pull
   ```
3. **Interactive Visual Explorer**:
   ```bash
   npm run prisma:studio
   ```

---

### Phase 5: Seed Dataset & Stress Test Data Generation

#### 5.1 Dataset Specifications (`database/seed.sql`)
Populate realistic data with varied edge cases:
- **Categories**: 5 categories (Electronics, Computing, Audio, Wearables, Accessories).
- **Products**: 15+ products with varied inventory levels (High stock, Low stock $\le 5$, Zero stock).
- **Customers**: 10+ customers distributed across geographic cities.
- **Orders**: 15+ orders with diverse statuses (`Placed`, `Shipped`, `Delivered`, `Cancelled`).
- **Payments**: 1:1 payments matching orders across payment methods (Credit Card, UPI, Net Banking).
- **Reviews**: Diverse reviews with ratings from 1 to 5 stars.

#### 5.2 Verification Script
Verify record counts after running seed:
```sql
SELECT 
    (SELECT COUNT(*) FROM categories) AS categories_count,
    (SELECT COUNT(*) FROM products) AS products_count,
    (SELECT COUNT(*) FROM customers) AS customers_count,
    (SELECT COUNT(*) FROM orders) AS orders_count,
    (SELECT COUNT(*) FROM order_items) AS order_items_count,
    (SELECT COUNT(*) FROM payments) AS payments_count,
    (SELECT COUNT(*) FROM reviews) AS reviews_count;
```

---

### Phase 6: Analytical Views & Machine Learning Feature Extraction

#### 6.1 Database View: `v_category_performance`
Provides real-time analytics for revenue and quantity sold per category:
```sql
CREATE OR REPLACE VIEW v_category_performance AS
SELECT 
    c.category_id,
    c.category_name,
    COUNT(DISTINCT o.order_id) AS total_orders,
    COALESCE(SUM(oi.quantity), 0) AS total_units_sold,
    COALESCE(SUM(oi.quantity * oi.unit_price), 0.00) AS total_revenue
FROM categories c
LEFT JOIN products p ON c.category_id = p.category_id
LEFT JOIN order_items oi ON p.product_id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.order_id AND o.status != 'Cancelled'
GROUP BY c.category_id, c.category_name;
```

#### 6.2 Database View: `v_low_stock_alerts`
Flags products requiring urgent procurement:
```sql
CREATE OR REPLACE VIEW v_low_stock_alerts AS
SELECT product_id, product_name, stock_qty, price
FROM products
WHERE stock_qty <= 5
ORDER BY stock_qty ASC;
```

#### 6.3 RFM Feature Extraction CTE
Optimized SQL aggregation feeding Python Scikit-learn K-Means clustering:
```sql
WITH snapshot_ref AS (
    SELECT COALESCE(MAX(order_date), CURRENT_TIMESTAMP) + INTERVAL '1 day' AS snapshot_date
    FROM orders
),
customer_orders AS (
    SELECT
        c.customer_id,
        c.customer_name,
        c.email,
        c.city,
        COALESCE(
            ROUND(EXTRACT(EPOCH FROM (ref.snapshot_date - MAX(o.order_date))) / 86400),
            ROUND(EXTRACT(EPOCH FROM (ref.snapshot_date - c.join_date)) / 86400)
        )::INT AS recency_days,
        COUNT(DISTINCT CASE WHEN o.status != 'Cancelled' THEN o.order_id END)::INT AS frequency,
        COALESCE(
            SUM(CASE WHEN o.status != 'Cancelled' THEN o.total_amount ELSE 0 END),
            0.00
        )::NUMERIC(12, 2) AS monetary_value
    FROM customers c
    CROSS JOIN snapshot_ref ref
    LEFT JOIN orders o ON c.customer_id = o.customer_id
    GROUP BY c.customer_id, c.customer_name, c.email, c.city, c.join_date, ref.snapshot_date
)
SELECT * FROM customer_orders;
```

---

### Phase 7: Verification Test Suite & Concurrency Validation

| Test ID | Test Scenario | Execution SQL / Command | Expected Engine Behavior |
|---|---|---|---|
| **DB-T01** | Check constraint validation | `INSERT INTO products (product_name, category_id, price, stock_qty) VALUES ('Bad', 1, -10.00, 5);` | Error: `chk_products_price_positive` violation. |
| **DB-T02** | Stock deduction trigger | Insert item with `quantity = 2` into `order_items`. | `products.stock_qty` decreases by exactly 2. |
| **DB-T03** | Insufficient stock prevention | Insert item with `quantity = 9999` into `order_items`. | Transaction aborted; exception: `Insufficient stock for product...`. |
| **DB-T04** | Order total recalculation | Insert multiple line items into `order_items`. | `orders.total_amount` equals `SUM(quantity * unit_price)`. |
| **DB-T05** | Order cancellation restock | `CALL cancel_order(order_id);` | Order status changes to `'Cancelled'` and product `stock_qty` is incremented. |
| **DB-T06** | Unique review constraint | Insert 2 reviews with same `(customer_id, product_id)`. | Error: `uq_customer_product_review` violation. |
| **DB-T07** | Category deletion restrict | `DELETE FROM categories WHERE category_id = 1;` | Error: Foreign key restriction (`ON DELETE RESTRICT`). |
| **DB-T08** | RFM ML Batch Upsert | Execute `ml/rfm_segmentation.py`. | `customer_segments` updated with valid cluster labels. |

---

## 3. Database Execution Checklist

- [ ] **Step 1**: Start Docker PostgreSQL service (`docker compose up -d`).
- [ ] **Step 2**: Apply DDL schema (`database/schema.sql`).
- [ ] **Step 3**: Compile triggers and stored routines (`database/procedures_triggers.sql`).
- [ ] **Step 4**: Populate test seed dataset (`database/seed.sql`).
- [ ] **Step 5**: Run Prisma generator (`npm run prisma:generate`).
- [ ] **Step 6**: Validate tables in Prisma Studio (`npm run prisma:studio`).
- [ ] **Step 7**: Execute test cases DB-T01 through DB-T08 to verify all constraints and triggers.
- [ ] **Step 8**: Run Python ML clustering script (`python ml/rfm_segmentation.py`).
