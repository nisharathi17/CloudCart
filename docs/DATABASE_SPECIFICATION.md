# Database Specification & Data Dictionary

**Database Engine**: PostgreSQL 14 / 16  
**Design Standard**: Third Normal Form (3NF)  
**ORM Support**: Prisma ORM v6  
**Document Purpose**: Definitive technical specification for all tables, constraints, indexes, triggers, stored procedures, and analytical SQL routines.

---

## 1. Entity Relationship & Cardinality Overview

The database model consists of **8 core relational entities** plus **1 derived analytical entity** for Machine Learning customer segmentation.

| Entity | Relational Role | Cardinality & Relationship | Participation |
|---|---|---|---|
| **categories** | Product Taxonomy | $1 : N$ with `products` | Category: Partial, Product: Total |
| **products** | Inventory & Catalog | $N : 1$ with `categories`; $1 : N$ with `cart_items`, `order_items`, `reviews` | Total in Category, Partial in Orders/Cart |
| **customers** | Registered Shoppers | $1 : 1$ with `carts`; $1 : N$ with `orders`, `reviews`; $1 : 1$ with `customer_segments` | Partial in Orders/Reviews, Total in Cart |
| **carts** | Active Shopping Basket | $1 : 1$ with `customers`; $1 : N$ with `cart_items` | Total in Customer, Partial in items |
| **cart_items** | M:N Bridge (Cart $\leftrightarrow$ Product) | $N : 1$ with `carts`; $N : 1$ with `products` | Total in Cart, Total in Product |
| **orders** | Immutable Purchase Master | $N : 1$ with `customers`; $1 : N$ with `order_items`; $1 : 1$ with `payments` | Total in Customer, Partial in Payment |
| **order_items** | M:N Bridge (Order $\leftrightarrow$ Product) | $N : 1$ with `orders`; $N : 1$ with `products` | Total in Order, Total in Product |
| **payments** | Financial Settlement | $1 : 1$ with `orders` | Total in Order |
| **reviews** | Feedback & Ratings | $N : 1$ with `customers`; $N : 1$ with `products` | Total in Customer, Total in Product |
| **customer_segments** | ML Cluster Target | $1 : 1$ Identifying relationship with `customers` | Total in Customer |

---

## 2. Comprehensive Data Dictionary

### 2.1 Table: `categories`
Stores product taxonomy and classification groups.

| Column | Data Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `category_id` | `SERIAL` | `NO` | Auto-increment | `PRIMARY KEY` | Unique surrogate identifier |
| `category_name` | `VARCHAR(100)` | `NO` | - | `UNIQUE` | Human-readable category title |
| `description` | `TEXT` | `YES` | `NULL` | - | Detailed description of category |
| `created_at` | `TIMESTAMPTZ` | `NO` | `CURRENT_TIMESTAMP` | - | Record creation timestamp |

---

### 2.2 Table: `products`
Holds product catalog, unit pricing, and real-time available stock count.

| Column | Data Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `product_id` | `SERIAL` | `NO` | Auto-increment | `PRIMARY KEY` | Unique product identifier |
| `product_name` | `VARCHAR(150)` | `NO` | - | - | Name of catalog item |
| `category_id` | `INT` | `NO` | - | `FK -> categories.category_id` | Foreign key referencing category |
| `price` | `NUMERIC(10, 2)`| `NO` | - | `CHECK (price > 0)` | Current catalog retail price |
| `stock_qty` | `INT` | `NO` | `0` | `CHECK (stock_qty >= 0)` | Available physical inventory |
| `created_at` | `TIMESTAMPTZ` | `NO` | `CURRENT_TIMESTAMP` | - | Creation timestamp |

**Indexes**:
- `idx_products_category` on `category_id`
- `idx_products_name` on `product_name`

**Foreign Key Rule**: `ON DELETE RESTRICT`, `ON UPDATE CASCADE` (prevents deleting a category if products exist).

---

### 2.3 Table: `customers`
Stores registered customer credentials, contact information, and registration date.

| Column | Data Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `customer_id` | `SERIAL` | `NO` | Auto-increment | `PRIMARY KEY` | Unique customer identifier |
| `customer_name` | `VARCHAR(100)` | `NO` | - | - | Full name of customer |
| `email` | `VARCHAR(150)` | `NO` | - | `UNIQUE` | Login email address |
| `phone` | `VARCHAR(20)` | `YES` | `NULL` | - | Contact phone number |
| `city` | `VARCHAR(100)` | `YES` | `NULL` | - | Billing/shipping city |
| `join_date` | `TIMESTAMPTZ` | `NO` | `CURRENT_TIMESTAMP` | - | Account registration timestamp |

**Indexes**:
- `idx_customers_email` on `email`
- `idx_customers_city` on `city`

---

### 2.4 Table: `carts`
Maintains the active, persistent shopping cart session per customer.

| Column | Data Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `cart_id` | `SERIAL` | `NO` | Auto-increment | `PRIMARY KEY` | Unique cart session ID |
| `customer_id` | `INT` | `NO` | - | `FK -> customers.customer_id`, `UNIQUE` | 1:1 owner constraint |
| `updated_at` | `TIMESTAMPTZ` | `NO` | `CURRENT_TIMESTAMP` | - | Last modification timestamp |

**Foreign Key Rule**: `ON DELETE CASCADE` (deleting a customer removes their active cart session).

---

### 2.5 Table: `cart_items`
Associative table resolving the M:N relationship between `carts` and `products`.

| Column | Data Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `cart_item_id` | `SERIAL` | `NO` | Auto-increment | `PRIMARY KEY` | Unique cart line-item ID |
| `cart_id` | `INT` | `NO` | - | `FK -> carts.cart_id` | References parent cart |
| `product_id` | `INT` | `NO` | - | `FK -> products.product_id`| References catalog product |
| `quantity` | `INT` | `NO` | `1` | `CHECK (quantity > 0)` | Quantity selected |

**Table Constraints**:
- `UNIQUE (cart_id, product_id)` (prevents duplicate lines for the same product in a single cart).

**Foreign Key Rules**:
- `carts`: `ON DELETE CASCADE`
- `products`: `ON DELETE CASCADE`

---

### 2.6 Table: `orders`
Immutable master purchase record recording status, order date, and total transaction amount.

| Column | Data Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `order_id` | `SERIAL` | `NO` | Auto-increment | `PRIMARY KEY` | Master order reference number |
| `customer_id` | `INT` | `NO` | - | `FK -> customers.customer_id` | Purchasing customer |
| `order_date` | `TIMESTAMPTZ` | `NO` | `CURRENT_TIMESTAMP` | - | Order placement timestamp |
| `status` | `VARCHAR(20)` | `NO` | `'Placed'` | `CHECK (status IN ('Placed','Shipped','Delivered','Cancelled'))` | Order lifecycle state |
| `total_amount` | `NUMERIC(12, 2)`| `NO` | `0.00` | `CHECK (total_amount >= 0)` | Recalculated aggregate total |

**Indexes**:
- `idx_orders_customer` on `customer_id`
- `idx_orders_date` on `order_date`
- `idx_orders_status` on `status`

**Foreign Key Rule**: `ON DELETE RESTRICT` (preserves historical financial records).

---

### 2.7 Table: `order_items`
Normalized line items linking products to orders; stores point-in-time unit pricing.

| Column | Data Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `order_item_id`| `SERIAL` | `NO` | Auto-increment | `PRIMARY KEY` | Unique line-item ID |
| `order_id` | `INT` | `NO` | - | `FK -> orders.order_id` | References master order |
| `product_id` | `INT` | `NO` | - | `FK -> products.product_id`| References product |
| `quantity` | `INT` | `NO` | - | `CHECK (quantity > 0)` | Purchased quantity |
| `unit_price` | `NUMERIC(10, 2)`| `NO` | - | `CHECK (unit_price > 0)` | Price locked at sale |

**Table Constraints**:
- `UNIQUE (order_id, product_id)` (composite uniqueness).

**Foreign Key Rules**:
- `orders`: `ON DELETE CASCADE`
- `products`: `ON DELETE RESTRICT` (cannot delete a product that exists in past sales).

---

### 2.8 Table: `payments`
Financial transaction details tied 1:1 with an order.

| Column | Data Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `payment_id` | `SERIAL` | `NO` | Auto-increment | `PRIMARY KEY` | Unique transaction ID |
| `order_id` | `INT` | `NO` | - | `FK -> orders.order_id`, `UNIQUE` | 1:1 order relation |
| `method` | `VARCHAR(30)` | `NO` | - | - | Credit Card, Debit Card, UPI, etc. |
| `amount` | `NUMERIC(12, 2)`| `NO` | - | `CHECK (amount > 0)` | Settled payment amount |
| `payment_status`| `VARCHAR(20)` | `NO` | `'Pending'` | - | Pending, Completed, Failed, Refunded |
| `payment_date` | `TIMESTAMPTZ` | `YES` | `NULL` | - | Settlement timestamp |

---

### 2.9 Table: `reviews`
Customer ratings and reviews for catalog items.

| Column | Data Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `review_id` | `SERIAL` | `NO` | Auto-increment | `PRIMARY KEY` | Review record ID |
| `customer_id` | `INT` | `NO` | - | `FK -> customers.customer_id` | Reviewing customer |
| `product_id` | `INT` | `NO` | - | `FK -> products.product_id`| Reviewed product |
| `rating` | `INT` | `NO` | - | `CHECK (rating BETWEEN 1 AND 5)` | 1 to 5 star rating |
| `review_text` | `VARCHAR(500)` | `YES` | `NULL` | - | Qualitative comment |
| `review_date` | `TIMESTAMPTZ` | `NO` | `CURRENT_TIMESTAMP` | - | Review submission date |

**Table Constraints**:
- `UNIQUE (customer_id, product_id)` (each customer can review a given product once).

---

### 2.10 Table: `customer_segments`
Analytical target table populated by Scikit-learn $K$-Means clustering.

| Column | Data Type | Nullable | Default | Constraints | Description |
|---|---|---|---|---|---|
| `customer_id` | `INT` | `NO` | - | `PRIMARY KEY`, `FK -> customers` | Identifying foreign key |
| `recency_days` | `INT` | `NO` | - | `CHECK (recency_days >= 0)` | Days since last order |
| `frequency` | `INT` | `NO` | - | `CHECK (frequency >= 0)` | Count of valid orders |
| `monetary_value`| `NUMERIC(12, 2)`| `NO` | - | `CHECK (monetary_value >= 0)` | Total spend amount |
| `segment_label`| `VARCHAR(30)` | `NO` | - | - | Loyal, Big Spender, At-Risk, New |
| `last_updated` | `TIMESTAMPTZ` | `NO` | `CURRENT_TIMESTAMP` | - | Model execution timestamp |

---

## 3. Database Triggers & Stored Logic

### 3.1 Trigger: `trg_validate_and_deduct_stock`
- **Timing**: `BEFORE INSERT ON order_items FOR EACH ROW`
- **Function**: `fn_validate_and_deduct_stock()`
- **Logic**:
  1. Executes `SELECT stock_qty, product_name FROM products WHERE product_id = NEW.product_id FOR UPDATE;`
  2. If `stock_qty < NEW.quantity`, raises a PostgreSQL exception:  
     `'Insufficient stock for product "%" (ID: %): requested %, available %'`
  3. Updates `products` to deduct `NEW.quantity`.

### 3.2 Trigger: `trg_update_order_total`
- **Timing**: `AFTER INSERT OR UPDATE OR DELETE ON order_items FOR EACH ROW`
- **Function**: `fn_update_order_total()`
- **Logic**:
  1. Computes `SUM(quantity * unit_price)` for the target `order_id`.
  2. Updates `orders.total_amount` with the exact computed sum.

### 3.3 Stored Procedure: `place_order(p_customer_id INT, p_items JSONB)`
- **Logic**:
  1. Inserts master record into `orders`.
  2. Iterates over JSON array `p_items`, extracting `product_id`, `quantity`, and `unit_price`.
  3. Inserts each item into `order_items` (trigger `trg_validate_and_deduct_stock` automatically checks stock and decrements inventory).
  4. Creates associated pending payment record in `payments`.

### 3.4 Stored Procedure: `cancel_order(p_order_id INT)`
- **Logic**:
  1. Locks order row: `SELECT status FROM orders WHERE order_id = p_order_id FOR UPDATE;`
  2. Verifies status is not already `'Cancelled'`.
  3. Loops through all line items in `order_items`:
     `UPDATE products SET stock_qty = stock_qty + item.quantity WHERE product_id = item.product_id;`
  4. Sets `orders.status = 'Cancelled'`.

### 3.5 Stored Function: `get_customer_total_spent(p_customer_id INT)`
- **Returns**: `NUMERIC(12, 2)`
- **Logic**:
  ```sql
  SELECT COALESCE(SUM(total_amount), 0.00)
  FROM orders
  WHERE customer_id = p_customer_id AND status != 'Cancelled';
  ```

---

## 4. Complex Analytical Queries & Database Views

### 4.1 RFM Feature Extraction CTE
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

### 4.2 Top Revenue Categories (Aggregation & Ranking)
```sql
SELECT 
    c.category_name,
    COUNT(DISTINCT o.order_id) AS total_orders,
    SUM(oi.quantity) AS total_units_sold,
    SUM(oi.quantity * oi.unit_price) AS total_revenue,
    DENSE_RANK() OVER (ORDER BY SUM(oi.quantity * oi.unit_price) DESC) AS rank
FROM categories c
JOIN products p ON c.category_id = p.category_id
JOIN order_items oi ON p.product_id = oi.product_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.status != 'Cancelled'
GROUP BY c.category_id, c.category_name
ORDER BY total_revenue DESC;
```
