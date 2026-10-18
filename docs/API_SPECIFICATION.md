# REST API Specification & Integration Contract

**Version**: 1.0.0  
**Base URL**: `http://localhost:3000/api` (or standalone Express on `http://localhost:4000/api`)  
**Standard Headers**:
- `Content-Type: application/json`
- `Accept: application/json`

This document defines the strict integration contract between the **Frontend (Track 1)** and the **Backend (Track 2)**. Both tracks can develop against these schemas independently without waiting on one another.

---

## 1. System Statistics & Dashboard

### 1.1 `GET /api/stats`
Retrieves high-level enterprise KPIs for the dashboard header.

- **Method**: `GET`
- **Response (200 OK)**:
```json
{
  "totalProducts": 24,
  "totalOrders": 18,
  "totalCustomers": 12,
  "totalRevenue": 28450.75,
  "lowStockCount": 3,
  "databaseStatus": "Connected (PostgreSQL 16.2)"
}
```

---

## 2. Product Catalog & Categories

### 2.1 `GET /api/products`
Retrieves product catalog with category relations and stock status.

- **Method**: `GET`
- **Query Parameters**:
  - `category_id` *(optional, int)*: Filter by category ID.
  - `search` *(optional, string)*: Filter by product name.
  - `low_stock` *(optional, boolean)*: If `true`, returns only items where `stock_qty <= 5`.
- **Response (200 OK)**:
```json
[
  {
    "productId": 101,
    "productName": "Wireless Noise-Canceling Headphones",
    "categoryId": 1,
    "category": {
      "categoryId": 1,
      "categoryName": "Electronics"
    },
    "price": "149.99",
    "stockQty": 35,
    "createdAt": "2026-10-01T10:00:00Z"
  }
]
```

---

### 2.2 `POST /api/products`
Adds or updates a product in the catalog (Admin action).

- **Method**: `POST`
- **Request Body**:
```json
{
  "productName": "Ergonomic Mechanical Keyboard",
  "categoryId": 1,
  "price": 89.50,
  "stockQty": 20
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "productId": 102,
  "message": "Product created successfully"
}
```
- **Error Responses**:
  - `400 Bad Request`: `{"error": "Price must be greater than zero and stock non-negative"}`

---

### 2.3 `GET /api/categories`
Retrieves all product categories along with associated product counts.

- **Method**: `GET`
- **Response (200 OK)**:
```json
[
  {
    "categoryId": 1,
    "categoryName": "Electronics",
    "description": "Smart devices and audio accessories",
    "productCount": 10
  }
]
```

---

## 3. Customer Management

### 3.1 `GET /api/customers`
Retrieves registered customers.

- **Method**: `GET`
- **Response (200 OK)**:
```json
[
  {
    "customerId": 1,
    "customerName": "Alice Johnson",
    "email": "alice.j@example.com",
    "phone": "+1-555-0192",
    "city": "Seattle",
    "joinDate": "2026-08-15T09:30:00Z"
  }
]
```

---

### 3.2 `GET /api/customers/{id}/spend`
Computes total monetary spend for a specific customer using the PostgreSQL stored function `get_customer_total_spent(customer_id)`.

- **Method**: `GET`
- **Path Parameters**:
  - `id` *(int, required)*: The customer ID.
- **Response (200 OK)**:
```json
{
  "customerId": 1,
  "totalSpent": "1420.50",
  "currency": "USD"
}
```
- **Error Responses**:
  - `404 Not Found`: `{"error": "Customer not found"}`

---

## 4. Orders & Transactional Checkout

### 4.1 `GET /api/orders`
Retrieves all master orders with customer details, payment records, and line items.

- **Method**: `GET`
- **Response (200 OK)**:
```json
[
  {
    "orderId": 501,
    "customerId": 1,
    "customer": {
      "customerName": "Alice Johnson",
      "email": "alice.j@example.com"
    },
    "orderDate": "2026-10-10T14:22:00Z",
    "status": "Placed",
    "totalAmount": "299.98",
    "payment": {
      "paymentId": 801,
      "method": "Credit Card",
      "paymentStatus": "Completed",
      "amount": "299.98"
    },
    "orderItems": [
      {
        "orderItemId": 901,
        "productId": 101,
        "productName": "Wireless Headphones",
        "quantity": 2,
        "unitPrice": "149.99"
      }
    ]
  }
]
```

---

### 4.2 `POST /api/orders`
Places an order atomically. Triggers row locking on products, verifies inventory, creates the master order, inserts order items, and records payment.

- **Method**: `POST`
- **Request Body**:
```json
{
  "customerId": 1,
  "paymentMethod": "Credit Card",
  "items": [
    {
      "productId": 101,
      "quantity": 2,
      "unitPrice": 149.99
    }
  ]
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "orderId": 502,
  "totalAmount": 299.98,
  "status": "Placed",
  "message": "Order placed and stock deducted atomically."
}
```
- **Error Responses**:
  - `400 Bad Request` (Stock Error triggered by database trigger):
```json
{
  "success": false,
  "error": "Insufficient stock for product \"Wireless Headphones\" (ID: 101): requested 2, available 1"
}
```
  - `404 Not Found`: `{"error": "Customer or product not found"}`

---

### 4.3 `POST /api/orders/{id}/cancel`
Cancels an order atomically and restores item quantities to `products.stock_qty`.

- **Method**: `POST`
- **Path Parameters**:
  - `id` *(int, required)*: The order ID to cancel.
- **Response (200 OK)**:
```json
{
  "success": true,
  "orderId": 501,
  "previousStatus": "Placed",
  "currentStatus": "Cancelled",
  "restoredItems": [
    {
      "productId": 101,
      "restoredQty": 2
    }
  ],
  "message": "Order cancelled successfully and inventory restored to stock."
}
```
- **Error Responses**:
  - `400 Bad Request`: `{"error": "Cannot cancel order that is already Cancelled or Delivered"}`
  - `404 Not Found`: `{"error": "Order ID not found"}`

---

## 5. Customer Reviews

### 5.1 `POST /api/reviews`
Submits a rating and comment for a catalog product.

- **Method**: `POST`
- **Request Body**:
```json
{
  "customerId": 1,
  "productId": 101,
  "rating": 5,
  "reviewText": "Excellent battery life and crisp audio."
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "reviewId": 12,
  "message": "Review recorded successfully"
}
```
- **Error Responses**:
  - `400 Bad Request`: `{"error": "Rating must be an integer between 1 and 5"}`
  - `409 Conflict`: `{"error": "Customer has already reviewed this product"}`

---

## 6. Machine Learning RFM Segmentation

### 6.1 `GET /api/segments`
Retrieves customer RFM segment assignments produced by the K-Means clustering pipeline.

- **Method**: `GET`
- **Response (200 OK)**:
```json
[
  {
    "customerId": 1,
    "customerName": "Alice Johnson",
    "email": "alice.j@example.com",
    "recencyDays": 2,
    "frequency": 8,
    "monetaryValue": "1420.50",
    "segmentLabel": "Loyal",
    "lastUpdated": "2026-10-12T18:00:00Z"
  },
  {
    "customerId": 2,
    "customerName": "Bob Smith",
    "email": "bob.s@example.com",
    "recencyDays": 120,
    "frequency": 1,
    "monetaryValue": "45.00",
    "segmentLabel": "At-Risk",
    "lastUpdated": "2026-10-12T18:00:00Z"
  }
]
```

---

### 6.2 `POST /api/segments/run`
Executes the Python RFM clustering pipeline in the background and updates the database.

- **Method**: `POST`
- **Response (200 OK)**:
```json
{
  "success": true,
  "totalCustomersClustered": 12,
  "clusters": {
    "Loyal": 4,
    "Big Spenders": 2,
    "At-Risk": 3,
    "New": 3
  },
  "message": "RFM K-Means clustering completed and synchronized to database."
}
```

---

## 7. Database Administration & Reset

### 7.1 `POST /api/db/init`
Resets the PostgreSQL database schema and executes seed data (Used for demonstration and testing).

- **Method**: `POST`
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Database schema reset and seed dataset re-applied successfully."
}
```
- **Error Responses**:
  - `500 Internal Server Error`: `{"error": "Database initialization failed: <details>"}`
