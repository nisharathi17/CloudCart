-- ============================================================================
-- E-COMMERCE DATABASE MANAGEMENT SYSTEM (Analytical SQL Queries)
-- Academic DBMS Project - Rubric Item 3: SQL Queries
-- Students / Authors:
--   - Nisha Rathi (24BYB0137)
--   - Anshul Gupta (24BYB0149)
-- Database Engine: PostgreSQL 14+
-- ============================================================================
-- This script contains 15 academic-grade, comprehensive SQL queries demonstrating
-- advanced DBMS concepts: multi-table joins, aggregations with GROUP BY and HAVING,
-- scalar and correlated subqueries, window functions, and set operations.
-- ============================================================================

-- ============================================================================
-- PART 1: JOINS (Multi-Table Relational Data Retrieval)
-- ============================================================================

-- Query 1.1: Multi-Table INNER JOIN (4-Way Relational Join)
-- Retrieves comprehensive order audit records: customer details, order timestamp,
-- line items purchased, and associated payment settlement method.
SELECT 
    o.order_id,
    c.customer_name,
    c.email,
    p.product_name,
    oi.quantity,
    oi.unit_price,
    (oi.quantity * oi.unit_price) AS line_subtotal,
    o.status AS order_status,
    pay.method AS payment_method,
    pay.payment_status
FROM orders o
INNER JOIN customers c ON o.customer_id = c.customer_id
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
INNER JOIN payments pay ON o.order_id = pay.order_id
ORDER BY o.order_id DESC;

-- Query 1.2: LEFT OUTER JOIN
-- Lists ALL products in the catalog along with their total units sold,
-- including items that have never been purchased yet (handling NULL with COALESCE).
SELECT 
    p.product_id,
    p.product_name,
    c.category_name,
    p.price,
    p.stock_qty AS available_stock,
    COALESCE(SUM(oi.quantity), 0) AS total_units_sold,
    COALESCE(SUM(oi.quantity * oi.unit_price), 0.00) AS total_revenue_generated
FROM products p
LEFT JOIN categories c ON p.category_id = c.category_id
LEFT JOIN order_items oi ON p.product_id = oi.product_id
GROUP BY p.product_id, p.product_name, c.category_name, p.price, p.stock_qty
ORDER BY total_revenue_generated DESC;

-- Query 1.3: FULL OUTER JOIN
-- Compares customers who have active shopping carts vs customers who have placed orders,
-- highlighting customers who abandoned their carts without checking out.
SELECT 
    COALESCE(cart_cust.customer_id, order_cust.customer_id) AS customer_id,
    COALESCE(cart_cust.customer_name, order_cust.customer_name) AS customer_name,
    crt.cart_id,
    COUNT(DISTINCT ci.cart_item_id) AS items_in_cart,
    COUNT(DISTINCT o.order_id) AS orders_placed
FROM customers cart_cust
JOIN carts crt ON cart_cust.customer_id = crt.customer_id
LEFT JOIN cart_items ci ON crt.cart_id = ci.cart_id
FULL OUTER JOIN (
    SELECT c.customer_id, c.customer_name, o.order_id
    FROM customers c
    JOIN orders o ON c.customer_id = o.customer_id
) order_cust ON cart_cust.customer_id = order_cust.customer_id
LEFT JOIN orders o ON order_cust.order_id = o.order_id
GROUP BY cart_cust.customer_id, order_cust.customer_id, cart_cust.customer_name, order_cust.customer_name, crt.cart_id;

-- ============================================================================
-- PART 2: AGGREGATIONS & GROUPING (GROUP BY, HAVING, AGGREGATE FUNCTIONS)
-- ============================================================================

-- Query 2.1: Category Financial Breakdown with HAVING Filter
-- Aggregates total revenue, average order unit price, and distinct buyers per category.
-- Filters for categories generating at least $100.00 in revenue.
SELECT 
    cat.category_id,
    cat.category_name,
    COUNT(DISTINCT o.order_id) AS distinct_orders,
    COUNT(DISTINCT o.customer_id) AS distinct_buyers,
    SUM(oi.quantity) AS total_units_sold,
    ROUND(AVG(oi.unit_price), 2) AS avg_unit_price,
    SUM(oi.quantity * oi.unit_price) AS gross_category_revenue
FROM categories cat
JOIN products p ON cat.category_id = p.category_id
JOIN order_items oi ON p.product_id = oi.product_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.status != 'Cancelled'
GROUP BY cat.category_id, cat.category_name
HAVING SUM(oi.quantity * oi.unit_price) >= 100.00
ORDER BY gross_category_revenue DESC;

-- Query 2.2: City-Level Customer Expenditure Breakdown
-- Groups customers by geographical city, calculating metrics to identify top regional markets.
SELECT 
    c.city,
    COUNT(DISTINCT c.customer_id) AS registered_customers,
    COUNT(DISTINCT o.order_id) AS total_orders_placed,
    COALESCE(SUM(o.total_amount), 0.00) AS total_city_expenditure,
    ROUND(COALESCE(AVG(o.total_amount), 0.00), 2) AS avg_order_value_in_city
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id AND o.status != 'Cancelled'
GROUP BY c.city
HAVING COUNT(DISTINCT c.customer_id) >= 1
ORDER BY total_city_expenditure DESC;

-- ============================================================================
-- PART 3: SUBQUERIES (Correlated, Nested, Scalar, IN, EXISTS)
-- ============================================================================

-- Query 3.1: Correlated Subquery
-- Identifies premium products whose price is strictly greater than the
-- AVERAGE price of all products within their respective category.
SELECT 
    p1.product_id,
    p1.product_name,
    p1.category_id,
    p1.price,
    (
        SELECT ROUND(AVG(p2.price), 2)
        FROM products p2
        WHERE p2.category_id = p1.category_id
    ) AS category_avg_price,
    ROUND(p1.price - (
        SELECT AVG(p2.price)
        FROM products p2
        WHERE p2.category_id = p1.category_id
    ), 2) AS price_premium
FROM products p1
WHERE p1.price > (
    SELECT AVG(p2.price)
    FROM products p2
    WHERE p2.category_id = p1.category_id
)
ORDER BY p1.category_id, p1.price DESC;

-- Query 3.2: Subquery with IN & NOT IN
-- Finds products that have NEVER been ordered by any customer.
SELECT 
    product_id,
    product_name,
    category_id,
    price,
    stock_qty
FROM products
WHERE product_id NOT IN (
    SELECT DISTINCT product_id
    FROM order_items
);

-- Query 3.3: Subquery with EXISTS
-- Finds all customers who have placed at least one delivered high-value order (> $200.00).
SELECT 
    c.customer_id,
    c.customer_name,
    c.email,
    c.city
FROM customers c
WHERE EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.customer_id = c.customer_id
      AND o.status = 'Delivered'
      AND o.total_amount > 200.00
);

-- Query 3.4: Scalar Subquery in SELECT clause
-- Compares each customer's lifetime spending against the platform-wide overall average spend.
SELECT 
    c.customer_id,
    c.customer_name,
    COALESCE(SUM(o.total_amount), 0.00) AS customer_spend,
    (
        SELECT ROUND(AVG(total_amount), 2)
        FROM orders
        WHERE status != 'Cancelled'
    ) AS platform_avg_order_size,
    CASE 
        WHEN COALESCE(SUM(o.total_amount), 0.00) > (SELECT AVG(total_amount) * 2 FROM orders WHERE status != 'Cancelled')
        THEN 'High-Value VIP'
        ELSE 'Standard'
    END AS customer_classification
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id AND o.status != 'Cancelled'
GROUP BY c.customer_id, c.customer_name
ORDER BY customer_spend DESC;

-- ============================================================================
-- PART 4: WINDOW FUNCTIONS (Advanced SQL Analytics)
-- ============================================================================

-- Query 4.1: Ranking within Partition (DENSE_RANK)
-- Computes the rank of each product's price partitioned within its category.
SELECT 
    c.category_name,
    p.product_name,
    p.price,
    DENSE_RANK() OVER (PARTITION BY p.category_id ORDER BY p.price DESC) AS price_rank_in_category,
    PERCENT_RANK() OVER (PARTITION BY p.category_id ORDER BY p.price) AS price_percentile
FROM products p
JOIN categories c ON p.category_id = c.category_id;

-- Query 4.2: Running Cumulative Revenue Calculation
-- Uses window aggregation to calculate running cumulative revenue over time.
SELECT 
    order_id,
    order_date,
    total_amount,
    SUM(total_amount) OVER (ORDER BY order_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_running_revenue,
    AVG(total_amount) OVER (ORDER BY order_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_avg_3_orders
FROM orders
WHERE status != 'Cancelled'
ORDER BY order_date ASC;

-- Query 4.3: ROW_NUMBER per Customer (Most Recent Order)
-- Identifies the most recent order placed by each customer.
WITH ranked_orders AS (
    SELECT 
        customer_id,
        order_id,
        order_date,
        total_amount,
        status,
        ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) AS recency_rank
    FROM orders
)
SELECT 
    ro.customer_id,
    c.customer_name,
    ro.order_id AS latest_order_id,
    ro.order_date AS latest_order_date,
    ro.total_amount AS latest_order_amount,
    ro.status
FROM ranked_orders ro
JOIN customers c ON ro.customer_id = c.customer_id
WHERE ro.recency_rank = 1;

-- ============================================================================
-- PART 5: SET OPERATIONS (UNION, INTERSECT, EXCEPT)
-- ============================================================================

-- Query 5.1: INTERSECT
-- Finds customer IDs who have BOTH placed an order AND written a product review.
SELECT customer_id FROM orders
INTERSECT
SELECT customer_id FROM reviews;

-- Query 5.2: EXCEPT (Set Difference)
-- Finds customer IDs who have registered on the platform BUT NEVER placed any orders.
SELECT customer_id FROM customers
EXCEPT
SELECT DISTINCT customer_id FROM orders;

-- Query 5.3: UNION ALL
-- Consolidates financial transaction flows: completed payments (inflow) vs refunded payments (outflow).
SELECT 
    order_id,
    amount AS transaction_amount,
    'INFLOW (Customer Payment)' AS cash_flow_type,
    payment_date
FROM payments
WHERE payment_status = 'Completed'
UNION ALL
SELECT 
    order_id,
    amount AS transaction_amount,
    'OUTFLOW (Refund Issued)' AS cash_flow_type,
    payment_date
FROM payments
WHERE payment_status = 'Refunded'
ORDER BY payment_date DESC NULLS LAST;

-- ============================================================================
-- PART 6: COMMON TABLE EXPRESSIONS (CTE)
-- ============================================================================

-- Query 6.1: Customer RFM Behavioral Matrix CTE
-- Computes Recency, Frequency, and Monetary scores per customer in a single query.
WITH customer_rfm_metrics AS (
    SELECT 
        c.customer_id,
        c.customer_name,
        c.email,
        COALESCE(
            ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - MAX(o.order_date))) / 86400),
            ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - c.join_date)) / 86400)
        )::INT AS recency_days,
        COUNT(DISTINCT CASE WHEN o.status != 'Cancelled' THEN o.order_id END)::INT AS order_frequency,
        COALESCE(SUM(CASE WHEN o.status != 'Cancelled' THEN o.total_amount ELSE 0.00 END), 0.00)::NUMERIC(12, 2) AS monetary_spend
    FROM customers c
    LEFT JOIN orders o ON c.customer_id = o.customer_id
    GROUP BY c.customer_id, c.customer_name, c.email, c.join_date
)
SELECT 
    customer_id,
    customer_name,
    email,
    recency_days,
    order_frequency,
    monetary_spend,
    CASE 
        WHEN recency_days <= 30 AND order_frequency >= 2 AND monetary_spend >= 200.00 THEN 'Platinum Champion'
        WHEN recency_days <= 45 AND order_frequency >= 1 THEN 'Active Regular'
        WHEN recency_days > 90 AND order_frequency >= 1 THEN 'At-Risk Customer'
        ELSE 'New / Casual Prospect'
    END AS customer_rfm_segment
FROM customer_rfm_metrics
ORDER BY monetary_spend DESC;
