
TRUNCATE TABLE customer_segments, reviews, payments, order_items, orders, cart_items, carts, products, categories, customers RESTART IDENTITY CASCADE;
INSERT INTO categories (category_name, description) VALUES
('Electronics', 'Smartphones, audio gear, peripherals, and modern smart gadgets.'),
('Fashion & Apparel', 'Contemporary clothing, footwear, outerwear, and accessories.'),
('Home & Kitchen', 'Modern kitchen appliances, cookware sets, and smart home decor.'),
('Books & Stationery', 'Technical textbooks, classic literature, journals, and supplies.'),
('Fitness & Sports', 'Gym equipment, yoga gear, training accessories, and sportswear');

INSERT INTO products (product_name, category_id, price, stock_qty) VALUES
-- Electronics (Category 1)
('Noise Cancelling Headphones', 1, 149.99, 45),
('Mechanical Gaming Keyboard', 1, 89.50, 40),
('Ultra-HD Smart Webcam', 1, 65.00, 30),
('Portable Bluetooth Speaker', 1, 45.00, 50),

-- Fashion & Apparel (Category 2)
('Classic Denim Jacket', 2, 79.99, 35),
('Breathable Running Shoes', 2, 95.00, 40),
('Slim Fit Oxford Shirt', 2, 39.50, 60),

-- Home & Kitchen (Category 3)
('Espresso Coffee Machine', 3, 199.99, 25),
('Stainless Steel Cookware Set', 3, 129.00, 20),
('Smart LED Desk Lamp', 3, 34.99, 50),

-- Books & Stationery (Category 4)
('Designing Data-Intensive Applications', 4, 42.50, 75),
('Clean Code by Robert C. Martin', 4, 38.00, 65),
('Executive Hardcover Journal', 4, 15.00, 90),

-- Fitness & Sports (Category 5)
('Adjustable Dumbbell Set (20kg)', 5, 110.00, 25),
('High-Density Yoga Mat', 5, 28.00, 50);

-- ============================================================================
-- 3. CUSTOMERS (10 Customers across Major Indian Metropolitan Cities)
-- ============================================================================
INSERT INTO customers (customer_name, email, phone, city, join_date) VALUES
('Aarav Sharma',    'aarav.sharma@example.com',    '+91-9876543210', 'Delhi',      '2025-01-15 10:30:00+05:30'),
('Diya Patel',      'diya.patel@example.com',      '+91-9823456789', 'Mumbai',     '2025-02-01 11:15:00+05:30'),
('Rohan Verma',     'rohan.verma@example.com',     '+91-9834567890', 'Bengaluru',  '2025-02-14 14:20:00+05:30'),
('Ananya Iyer',     'ananya.iyer@example.com',     '+91-9845678901', 'Chennai',    '2025-03-05 09:00:00+05:30'),
('Vikram Malhotra', 'vikram.m@example.com',        '+91-9856789012', 'Hyderabad',  '2025-03-20 16:45:00+05:30'),
('Sneha Kulkarni',  'sneha.k@example.com',         '+91-9867890123', 'Pune',       '2025-04-10 12:10:00+05:30'),
('Kabir Das',       'kabir.das@example.com',       '+91-9878901234', 'Kolkata',    '2025-05-02 18:00:00+05:30'),
('Pooja Reddy',     'pooja.reddy@example.com',     '+91-9889012345', 'Bengaluru',  '2025-06-18 13:30:00+05:30'),
('Aditya Mehta',    'aditya.mehta@example.com',    '+91-9890123456', 'Ahmedabad',  '2025-07-22 15:40:00+05:30'),
('Meera Joshi',     'meera.joshi@example.com',     '+91-9901234567', 'Jaipur',     '2025-08-30 17:25:00+05:30');

-- ============================================================================
-- 4. ACTIVE SHOPPING CARTS & CART ITEMS (Mutable Session Layer)
-- ============================================================================
INSERT INTO carts (customer_id, updated_at) VALUES
(1, CURRENT_TIMESTAMP),
(2, CURRENT_TIMESTAMP),
(7, CURRENT_TIMESTAMP),
(10, CURRENT_TIMESTAMP);

-- Cart items currently in customer 7's and 10's shopping basket:
INSERT INTO cart_items (cart_id, product_id, quantity) VALUES
(3, 2, 1), -- Kabir (Cart 3) has Mechanical Keyboard
(3, 4, 2), -- Kabir (Cart 3) has 2x Bluetooth Speakers
(4, 11, 1); -- Meera (Cart 4) has Data-Intensive Applications Book

-- ============================================================================
-- 5. ORDERS (12 Historical Orders with Varied Dates, Customers, & Statuses)
-- Note: total_amount initialized at 0.00; trigger trg_update_order_total will
-- automatically recalculate accurate totals upon order_items insertion.
-- ============================================================================
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES
(1, '2026-09-28 10:30:00+05:30', 'Delivered', 0.00), -- Order 1  (Aarav)
(1, '2026-08-15 14:00:00+05:30', 'Delivered', 0.00), -- Order 2  (Aarav)
(2, '2026-10-01 11:20:00+05:30', 'Shipped',   0.00), -- Order 3  (Diya - high value)
(2, '2026-09-10 16:45:00+05:30', 'Delivered', 0.00), -- Order 4  (Diya)
(3, '2026-09-20 18:10:00+05:30', 'Delivered', 0.00), -- Order 5  (Rohan)
(4, '2025-11-12 10:15:00+05:30', 'Delivered', 0.00), -- Order 6  (Ananya - older/at-risk)
(5, '2026-03-10 13:50:00+05:30', 'Delivered', 0.00), -- Order 7  (Vikram - older/at-risk)
(6, '2026-09-25 12:00:00+05:30', 'Delivered', 0.00), -- Order 8  (Sneha)
(7, '2026-10-03 09:30:00+05:30', 'Placed',    0.00), -- Order 9  (Kabir - new customer)
(8, '2026-09-18 15:20:00+05:30', 'Delivered', 0.00), -- Order 10 (Pooja)
(9, '2026-07-14 17:05:00+05:30', 'Cancelled', 0.00), -- Order 11 (Aditya - cancelled order)
(10,'2026-10-04 19:40:00+05:30', 'Placed',    0.00); -- Order 12 (Meera - new customer)

-- ============================================================================
-- 6. ORDER_ITEMS (Line Items for Each Order)
-- Triggers will fire: stock is deducted, orders.total_amount is synced
-- ============================================================================
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
-- Order 1 (Aarav): Headphones + Coffee Machine
(1, 1, 1, 149.99),
(1, 8, 1, 199.99),

-- Order 2 (Aarav): Running Shoes + Yoga Mat
(2, 6, 1, 95.00),
(2, 15, 1, 28.00),

-- Order 3 (Diya): 2x Espresso Machines (High Value)
(3, 8, 2, 199.99),

-- Order 4 (Diya): Cookware Set + Headphones
(4, 9, 1, 129.00),
(4, 1, 1, 149.99),

-- Order 5 (Rohan): Gaming Keyboard + Web Camera
(5, 2, 1, 89.50),
(5, 3, 1, 65.00),

-- Order 6 (Ananya): System Design Book + Clean Code
(6, 11, 1, 42.50),
(6, 12, 1, 38.00),

-- Order 7 (Vikram): Classic Denim Jacket
(7, 5, 1, 79.99),

-- Order 8 (Sneha): Dumbbell Set + 2x Yoga Mats
(8, 14, 1, 110.00),
(8, 15, 2, 28.00),

-- Order 9 (Kabir): Smart LED Desk Lamp
(9, 10, 1, 34.99),

-- Order 10 (Pooja): Running Shoes + 2x Oxford Shirts
(10, 6, 1, 95.00),
(10, 7, 2, 39.50),

-- Order 11 (Aditya): Bluetooth Speaker (Order Cancelled)
(11, 4, 1, 45.00),

-- Order 12 (Meera): 3x Journals + Clean Code
(12, 13, 3, 15.00),
(12, 12, 1, 38.00);

-- ============================================================================
-- 7. PAYMENTS (1 Payment Record per Order with Varied Payment Methods)
-- ============================================================================
INSERT INTO payments (order_id, method, amount, payment_status, payment_date) VALUES
(1,  'Credit Card',      349.98, 'Completed', '2026-09-28 10:35:00+05:30'),
(2,  'UPI',              123.00, 'Completed', '2026-08-15 14:02:00+05:30'),
(3,  'Net Banking',      399.98, 'Completed', '2026-10-01 11:25:00+05:30'),
(4,  'Credit Card',      278.99, 'Completed', '2026-09-10 16:48:00+05:30'),
(5,  'UPI',              154.50, 'Completed', '2026-09-20 18:12:00+05:30'),
(6,  'Debit Card',        80.50, 'Completed', '2025-11-12 10:18:00+05:30'),
(7,  'Net Banking',       79.99, 'Completed', '2026-03-10 13:52:00+05:30'),
(8,  'Credit Card',      166.00, 'Completed', '2026-09-25 12:05:00+05:30'),
(9,  'Cash on Delivery',  34.99, 'Pending',   NULL),
(10, 'UPI',              174.00, 'Completed', '2026-09-18 15:22:00+05:30'),
(11, 'Credit Card',       45.00, 'Refunded',  '2026-07-14 17:30:00+05:30'),
(12, 'UPI',               83.00, 'Pending',   NULL);

-- ============================================================================
-- 8. REVIEWS (10 Realistic Customer Product Reviews)
-- ============================================================================
INSERT INTO reviews (customer_id, product_id, rating, review_text, review_date) VALUES
(1, 1, 5, 'Superior active noise cancellation and extraordinary sound stage. Worth every penny!', '2026-09-30 11:00:00+05:30'),
(1, 8, 4, 'Brews velvety, rich espresso crema. Quick heat-up time and intuitive steamer wand.', '2026-10-02 14:15:00+05:30'),
(2, 8, 5, 'Exceptional commercial-grade performance for home brewing. Highly recommend!', '2026-10-03 09:45:00+05:30'),
(3, 2, 5, 'Tactile mechanical switches provide outstanding feedback. Solid aluminum build quality.', '2026-09-22 17:30:00+05:30'),
(4, 11, 5, 'The gold standard textbook on distributed data architectures. Clear and deep.', '2025-11-20 20:00:00+05:30'),
(5, 5, 4, 'Premium denim wash with solid stitching. Fits slightly snug around the shoulders.', '2026-03-15 11:20:00+05:30'),
(6, 14, 5, 'Effortless weight adjustment mechanism. Replaces an entire gym rack cleanly.', '2026-09-28 16:10:00+05:30'),
(6, 15, 4, 'Generous cushioning and superior non-slip texture even during intense sessions.', '2026-09-29 18:40:00+05:30'),
(8, 6, 5, 'Featherlight with remarkable arch bounce. Perfect companion for morning marathons.', '2026-09-20 10:05:00+05:30'),
(8, 7, 3, 'Decent formal fabric, though the collar softens somewhat after a couple washes.', '2026-09-25 15:30:00+05:30');

-- ============================================================================
-- 9. INITIAL SEED FOR CUSTOMER SEGMENTS (Pre-clustering baseline)
-- ============================================================================
INSERT INTO customer_segments (customer_id, recency_days, frequency, monetary_value, segment_label, last_updated) VALUES
(1, 9,  2, 472.98, 'Loyal',       CURRENT_TIMESTAMP),
(2, 6,  2, 678.97, 'Big Spender', CURRENT_TIMESTAMP),
(3, 17, 1, 154.50, 'Loyal',       CURRENT_TIMESTAMP),
(4, 329,1, 80.50,  'At-Risk',     CURRENT_TIMESTAMP),
(5, 211,1, 79.99,  'At-Risk',     CURRENT_TIMESTAMP),
(6, 12, 1, 166.00, 'Loyal',       CURRENT_TIMESTAMP),
(7, 4,  1, 34.99,  'New',         CURRENT_TIMESTAMP),
(8, 19, 1, 174.00, 'Loyal',       CURRENT_TIMESTAMP),
(9, 85, 0, 0.00,   'At-Risk',     CURRENT_TIMESTAMP),
(10,3,  1, 83.00,  'New',         CURRENT_TIMESTAMP);
