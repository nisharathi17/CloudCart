# Enterprise E-Commerce Database Management System (PostgreSQL & ML)

Academic Capstone DBMS Project  
**Team / Authors**:
- **Nisha Rathi** (`24BYB0137`)
- **Anshul Gupta** (`24BYB0149`)

---

## 📌 Executive Summary

This project implements an end-to-end, academic-grade **E-Commerce Database Management System** designed with strict adherence to **Third Normal Form (3NF)** relational principles. Business rules, data consistency, and transactional safety are enforced directly within the **PostgreSQL engine** via native PL/pgSQL triggers and stored procedures. 

In addition, an **Unsupervised Machine Learning Module** extracts Recency, Frequency, and Monetary (RFM) behavioral metrics from the relational schema, trains a **$K$-Means clustering model ($k=4$)**, dynamically maps clusters into actionable business segments (*Loyal*, *Big Spender*, *At-Risk*, *New*), and synchronizes the results back into the database. A **Streamlit** administrative dashboard and a **FastAPI** REST backend provide full interactive operational control.

## 📚 Complete Project Documentation Suite

Comprehensive academic and engineering documentation is organized inside the [`docs/`](docs/) directory:
- 📋 [**Work Plan & Division of Responsibilities**](docs/WORK_PLAN.md): 2-person project work breakdown (Track 1: Frontend vs. Track 2: Backend), 6-sprint roadmap, milestones, and integration protocols without hardcoded person assignments.
- 🎓 [**Academic DBMS Rubric Compliance Guide**](docs/DBMS_RUBRIC_COMPLIANCE_GUIDE.md): Direct mapping to evaluation rubric: DDL & Constraints (2), DML (1), Queries (2), Procedures & Functions (2), Cursors & Triggers (2).
- 🛠️ [**Database Implementation Plan & Roadmap**](docs/DATABASE_IMPLEMENTATION_PLAN.md): Phase-by-phase execution plan for PostgreSQL 3NF schema, PL/pgSQL triggers, stored procedures, Prisma ORM sync, seeders, and verification test cases.
- 🏛️ [**System Architecture & Technical Design**](docs/ARCHITECTURE_AND_DESIGN.md): High-level topology, Mermaid flowcharts, ACID transaction sequence diagrams, and 3NF validation.
- 🗄️ [**Database Specification & Data Dictionary**](docs/DATABASE_SPECIFICATION.md): Entity mappings, complete data dictionary, constraints, triggers (`trg_validate_and_deduct_stock`), stored procedures (`place_order`, `cancel_order`), and complex analytical SQL queries.
- 🔌 [**REST API Specification & Integration Contract**](docs/API_SPECIFICATION.md): Detailed API contract with endpoints, payloads, HTTP status codes, and error schemas.
- 🤖 [**Machine Learning RFM Specification**](docs/ML_RFM_SPECIFICATION.md): Mathematical formulations, StandardScaler normalization, $K$-Means ($k=4$) clustering, and database writeback specs.
- 📁 [**Project Directory Structure Guide**](docs/PROJECT_STRUCTURE_GUIDE.md): Codebase tree breakdown and track responsibility matrix.
- 🚀 [**Setup & Defense Demonstration Guide**](docs/SETUP_AND_CONTRIBUTION_GUIDE.md): Docker runbook, environment setup, and 5-stage viva demonstration walkthrough.

## 📂 Project Directory Structure

```
DBMS PROJECT/
├── docs/                       # Comprehensive Academic Documentation Suite
│   ├── WORK_PLAN.md            # 2-Person Work Plan (Frontend vs. Backend)
│   ├── DBMS_RUBRIC_COMPLIANCE_GUIDE.md # 100% Evaluation Rubric Mapping & Viva Script
│   ├── DATABASE_IMPLEMENTATION_PLAN.md # DB execution plan & triggers
│   ├── ARCHITECTURE_AND_DESIGN.md # System architecture & ACID flows
│   ├── DATABASE_SPECIFICATION.md # Data dictionary, 3NF DDL & triggers
│   ├── API_SPECIFICATION.md    # REST API request/response schemas
│   ├── ML_RFM_SPECIFICATION.md # RFM math & K-Means clustering specs
│   ├── PROJECT_STRUCTURE_GUIDE.md # Codebase tree & track ownership
│   └── SETUP_AND_CONTRIBUTION_GUIDE.md # Setup runbook & viva script
│
├── database/                   # Native PostgreSQL Database Assets
│   ├── schema.sql              # 3NF DDL (10 tables with PK, FK, CHECK, UNIQUE constraints)
│   ├── procedures_triggers.sql # PL/pgSQL explicit cursors, triggers, procedures & functions
│   ├── dml_operations.sql      # Meaningful INSERT, UPDATE, DELETE & cascade demonstrations
│   ├── queries.sql             # 15 Advanced SQL queries (Joins, Aggregations, Subqueries, Windows, Sets, CTEs)
│   └── seed.sql                # Realistic seed dataset (categories, products, carts, orders, reviews)
│
├── prisma/                     # Prisma ORM Data Modeling
│   └── schema.prisma           # Prisma schema mapped to 3NF PostgreSQL tables & relations
│
├── ml/                         # Analytics & Machine Learning Module
│   ├── rfm_segmentation.py     # RFM SQL extractor + scikit-learn K-Means (k=4) clustering
│   ├── test_rfm.py             # Pytest unit tests for clustering pipeline
│   └── requirements.txt        # Python analytics dependencies
│
├── src/                        # Full-Stack Next.js (App Router) & Express Application
│   ├── app/                    # Next.js Pages & API Route Handlers
│   │   ├── layout.tsx          # Root layout with navbar & academic footer
│   │   ├── page.tsx            # Executive Dashboard & Live Inventory Catalog
│   │   ├── orders/page.tsx     # Place Order (Live cart, stored procedure & trigger testbed)
│   │   ├── cancel-order/page.tsx # Cancel Order (Inventory restoration testbed)
│   │   ├── analytics/page.tsx  # RFM Segments display & Lifetime Spend calculator
│   │   ├── globals.css         # Tailwind CSS styling
│   │   └── api/                # Next.js Serverless API Routes (Prisma Client)
│   │       ├── stats/route.ts
│   │       ├── products/route.ts
│   │       ├── customers/route.ts
│   │       ├── orders/route.ts
│   │       ├── orders/[id]/cancel/route.ts
│   │       ├── customers/[id]/spend/route.ts
│   │       ├── segments/route.ts
│   │       └── db/init/route.ts # 1-Click DB reset & seed endpoint
│   ├── components/             # Reusable UI Components
│   │   ├── Navbar.tsx          # Navigation bar with 1-click DB initializer
│   │   ├── MetricCard.tsx      # Dashboard KPI cards
│   │   └── SegmentBadge.tsx    # Color-coded RFM cluster badges
│   ├── lib/
│   │   ├── prisma.ts           # Singleton Prisma Client instance
│   │   └── utils.ts            # Formatting & class helper utilities
│   ├── server.js               # Express + Prisma REST Server (Alternative)
│   └── demo_prisma.js          # Standalone Prisma ORM test script
│
├── docker-compose.yml          # PostgreSQL 16 container with automatic init
├── package.json                # Next.js, Prisma, Tailwind dependencies & scripts
├── tsconfig.json               # TypeScript compiler configuration
├── tailwind.config.js          # Tailwind CSS theme configuration
└── README.md                   # Full academic report & execution instructions
```

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Frontend_and_API ["Presentation & Application Layer"]
        NEXT["Next.js App Router Frontend (src/app/)"]
        PRISMA["Prisma ORM Client (src/lib/prisma.ts)"]
        STUDIO["Prisma Studio GUI (npm run prisma:studio)"]
        EXPRESS["Express API Server (src/server.js)"]
        PYTHON_APP["Streamlit & FastAPI Alternate Portal (app.py, api.py)"]
        ML["ML Pipeline (ml/rfm_segmentation.py)"]
    end

    subgraph DB_Engine ["PostgreSQL 14+ Relational Engine (3NF)"]
        T1["categories"]
        T2["products"]
        T3["customers"]
        T4["orders"]
        T5["order_items"]
        T6["payments"]
        T7["reviews"]
        T8["customer_segments"]

        subgraph PLpgSQL ["Engine-Level Routines"]
            Trg1["Trigger: trg_validate_and_deduct_stock"]
            Trg2["Trigger: trg_update_order_total"]
            Proc1["Procedure: place_order(p_customer_id, p_items JSONB)"]
            Proc2["Procedure: cancel_order(p_order_id)"]
            Func1["Function: get_customer_total_spent(p_customer_id)"]
        end
    end

    UI -->|psycopg2 / SQLAlchemy| DB_Engine
    API -->|psycopg2| DB_Engine
    ML -->|SQL RFM Query| DB_Engine
    ML -->|Upsert Segments| T8

    Proc1 -.->|Invokes| T4
    Proc1 -.->|Invokes| T5
    T5 -.->|Fires BEFORE INSERT| Trg1
    Trg1 -.->|Locks & Updates| T2
    T5 -.->|Fires AFTER INSERT/UPDATE/DELETE| Trg2
    Trg2 -.->|Recalculates Total| T4
    Proc2 -.->|Restores Stock & Updates| T2
    Proc2 -.->|Updates Payment| T6
```

---

## 🗄️ Phase 1: Database Schema & Normalization (3NF)

The schema comprises **8 normalized relational tables** defined in [`schema.sql`](file:///c:/Users/anshu/Documents/codes/DBMS%20PROJECT/schema.sql):

| # | Table Name | Primary Key | Foreign Keys | Key Constraints & Integrity Rules |
|---|------------|-------------|--------------|-----------------------------------|
| 1 | `categories` | `category_id` | *None* | `category_name` is UNIQUE and NOT NULL. |
| 2 | `products` | `product_id` | `category_id` $\to$ `categories` | `price > 0`, `stock_qty >= 0`, `ON DELETE RESTRICT`. |
| 3 | `customers` | `customer_id` | *None* | `email` is UNIQUE and NOT NULL, `phone`, `city`. |
| 4 | `orders` | `order_id` | `customer_id` $\to$ `customers` | `status` IN ('Placed', 'Shipped', 'Delivered', 'Cancelled'), `total_amount >= 0`. |
| 5 | `order_items` | `order_item_id` | `order_id` $\to$ `orders`<br>`product_id` $\to$ `products` | `UNIQUE(order_id, product_id)`, `quantity > 0`, `unit_price > 0`, `ON DELETE CASCADE` for order. |
| 6 | `payments` | `payment_id` | `order_id` $\to$ `orders` (UNIQUE) | Strict 1-to-1 relationship with orders; `method` CHECK (Credit Card, Debit Card, UPI, Net Banking, Cash on Delivery), `amount > 0`, `payment_status` CHECK (Pending, Completed, Failed, Refunded). |
| 7 | `reviews` | `review_id` | `customer_id` $\to$ `customers`<br>`product_id` $\to$ `products` | `UNIQUE(customer_id, product_id)`, `rating BETWEEN 1 AND 5`. |
| 8 | `customer_segments`| `customer_id` | `customer_id` $\to$ `customers` | 1-to-1 analytics store; `recency_days >= 0`, `frequency >= 0`, `monetary_value >= 0`, `segment_label` CHECK (Loyal, Big Spender, At-Risk, New). |

### 3NF Normalization Justification:
1. **First Normal Form (1NF)**: Every column holds atomic (indivisible) values; no repeating groups; all tables possess explicit primary keys.
2. **Second Normal Form (2NF)**: All non-key attributes are fully functionally dependent on the entire primary key (eliminated partial dependencies via `order_items` and `reviews` isolation).
3. **Third Normal Form (3NF)**: No transitive dependencies exist ($X \to Y \to Z$); category details are separated from products, customer contact details from orders, and payment method details into their own entity.

---

## ⚡ Phase 2: Native Engine-Level Business Logic

Implemented in [`procedures_triggers.sql`](file:///c:/Users/anshu/Documents/codes/DBMS%20PROJECT/procedures_triggers.sql):

### 1. Trigger `trg_validate_and_deduct_stock`
- **Hook**: `BEFORE INSERT ON order_items`
- **Engine Logic**:
  - Locks the target product row via `SELECT ... FOR UPDATE` to avoid concurrency race conditions.
  - Verifies `products.stock_qty >= NEW.quantity`. If insufficient, raises a PostgreSQL exception (`RAISE EXCEPTION 'Insufficient stock...'`).
  - Atomically decrements `products.stock_qty = stock_qty - NEW.quantity`.

### 2. Trigger `trg_update_order_total`
- **Hook**: `AFTER INSERT OR UPDATE OR DELETE ON order_items`
- **Engine Logic**:
  - Dynamically recalculates `SUM(quantity * unit_price)` for the affected `order_id`.
  - Synchronizes `orders.total_amount` immediately inside the database engine without application intervention.

### 3. Stored Procedure `place_order(p_customer_id, p_items JSONB)`
- **Signature**: `CALL place_order(p_customer_id, p_items JSONB, p_order_id OUT)` & `SELECT fn_place_order(p_customer_id, p_items JSONB)`
- **Engine Logic**:
  - Validates customer existence and JSONB array non-emptiness.
  - Inserts the master record into `orders` with initial total `0.00`.
  - Iterates over JSON items array (`[{"product_id": 1, "quantity": 2}, ...]`), looks up price if omitted, and inserts each into `order_items`.
  - Automatically triggers stock deduction and order total calculation.
  - Returns the generated `order_id`.

### 4. Stored Procedure `cancel_order(p_order_id)`
- **Signature**: `CALL cancel_order(p_order_id)`
- **Engine Logic**:
  - Locks the order record; checks if already cancelled.
  - Iterates through line items in `order_items` and increments `products.stock_qty = stock_qty + quantity`.
  - Updates order status to `'Cancelled'`.
  - Transitions payment status: `'Completed'` $\to$ `'Refunded'`, `'Pending'` $\to$ `'Failed'`.

### 5. Stored Function `get_customer_total_spent(p_customer_id)`
- **Signature**: `SELECT get_customer_total_spent(p_customer_id) RETURNS NUMERIC(12, 2)`
- **Engine Logic**:
  - Computes the aggregate sum of `total_amount` across non-cancelled orders for a given customer.

---

## 🌱 Phase 3: Realistic Seed Dataset

Defined in [`seed.sql`](file:///c:/Users/anshu/Documents/codes/DBMS%20PROJECT/seed.sql):
- **5 Categories**: Electronics, Fashion & Apparel, Home & Kitchen, Books & Stationery, Fitness & Sports.
- **15 Products**: Catalog items with diverse pricing (\$15.00 to \$199.99) and stock levels (15 to 90 units).
- **10 Customers**: Shoppers distributed across Delhi, Mumbai, Bengaluru, Chennai, Hyderabad, Pune, Kolkata, Ahmedabad, and Jaipur.
- **12 Orders**: Spanning multiple dates and statuses (`Delivered`, `Shipped`, `Placed`, `Cancelled`) with corresponding line items.
- **12 Payments**: Covering various payment gateways (UPI, Credit Card, Net Banking, Debit Card, Cash on Delivery).
- **10 Reviews**: Authentic customer reviews with ratings between 1 and 5.
- **Customer Segments**: Pre-populated baseline rows ready for K-Means retraining.

---

## 🧠 Phase 4: RFM Customer Analytics & Machine Learning

Implemented in [`rfm_segmentation.py`](file:///c:/Users/anshu/Documents/codes/DBMS%20PROJECT/rfm_segmentation.py):

### 1. RFM Analytical SQL Query
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
    GROUP BY c.customer_id, c.customer_name, c.email, ref.snapshot_date
)
SELECT customer_id, customer_name, email, recency_days, frequency, monetary_value
FROM customer_orders
ORDER BY customer_id ASC;
```

### 2. Machine Learning Algorithm ($K$-Means $k=4$)
1. **Feature Extraction**: $R$ (Recency in days), $F$ (Frequency count), $M$ (Monetary value in \$).
2. **Standardization**: `StandardScaler` normalizes each feature to zero mean and unit variance.
3. **Clustering**: `KMeans(n_clusters=4, random_state=42)` partitions customers into 4 clusters.
4. **Dynamic Centroid Mapping**:
   - Highest Mean $M$ $\to$ **`Big Spender`**
   - Highest Mean $R$ (longest dormant period) $\to$ **`At-Risk`**
   - Highest Mean $F$ (repeat engagement) $\to$ **`Loyal`**
   - Remaining cluster (low recency, low order count) $\to$ **`New`**
5. **Database Upsert**:
   Executes `INSERT INTO customer_segments ... ON CONFLICT (customer_id) DO UPDATE` to persist clusters.

---

## 🖥️ Phase 5: User Interface & Backend

### 1. Streamlit Interactive Dashboard ([`app.py`](file:///c:/Users/anshu/Documents/codes/DBMS%20PROJECT/app.py))
- **📊 Admin Dashboard & Alerts**: Live revenue, low-stock warnings (<25 units highlighted), and order tracking.
- **🛒 Place Order & Trigger Testing**: Interactive cart builder with direct stored procedure execution and intentional stock underflow rejection test.
- **❌ Cancel Order**: One-click order cancellation with automated inventory replenishment.
- **📈 Sales Reports**: Category-wise revenue breakdown, top-selling products, review sentiment, and lifetime spend calculation.
- **🧠 RFM K-Means Segmentation**: Live ML clustering trigger, segment distribution charts, and centroid metrics.
- **🔬 Live SQL Console & Schema Inspector**: Interactive query console and column data type viewer.

### 2. FastAPI REST Service ([`api.py`](file:///c:/Users/anshu/Documents/codes/DBMS%20PROJECT/api.py))
- `GET /health` - Database connection and engine health check.
- `GET /api/products` - Product inventory catalog.
- `GET /api/inventory/alerts` - Inventory replenishment alerts.
- `GET /api/orders` - Order history with payment status.
- `POST /api/orders/place` - Atomically executes `place_order` procedure.
- `POST /api/orders/{id}/cancel` - Executes `cancel_order` procedure.
- `GET /api/customers/{id}/spend` - Evaluates `get_customer_total_spent` function.
### 3. Prisma ORM Integration ([`prisma/schema.prisma`](file:///c:/Users/anshu/Documents/codes/DBMS%20PROJECT/prisma/schema.prisma) & [`src/server.js`](file:///c:/Users/anshu/Documents/codes/DBMS%20PROJECT/src/server.js))
- **Type-Safe Data Modeling**: Full Prisma models for all 8 normalized tables with relations, indexes, and constraints.
- **Express + Prisma API Server**: Run `npm start` to serve high-performance endpoints.
- **Prisma Studio Visual GUI**: Launch `npx prisma studio` to inspect and interact with the database visually.
- **Raw PL/pgSQL Integration**: Seamlessly calls `place_order`, `cancel_order`, and `get_customer_total_spent` via `prisma.$queryRaw` and `prisma.$executeRaw`.

---

## 🚀 Setup & Execution Instructions

### Prerequisites
- Python 3.10+ installed
- PostgreSQL 14+ installed OR Docker Desktop

### 1. Clone & Install Dependencies
```bash
cd "c:\Users\anshu\Documents\codes\DBMS PROJECT"
python -m pip install -r requirements.txt
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` matches your PostgreSQL credentials:
```env
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/ecommerce_db
```

### 3. Start PostgreSQL Database

#### Option A: Using Docker Compose (Recommended - 1 Command)
```bash
docker compose up -d
```
*Note: Docker automatically applies `schema.sql`, `procedures_triggers.sql`, and `seed.sql` on first startup.*

#### Option B: Using Local PostgreSQL (psql / pgAdmin)
```bash
# Connect and create database
psql -U postgres -c "CREATE DATABASE ecommerce_db;"

# Execute SQL files in order:
psql -U postgres -d ecommerce_db -f schema.sql
psql -U postgres -d ecommerce_db -f procedures_triggers.sql
psql -U postgres -d ecommerce_db -f seed.sql
```

### 4. Run the RFM Customer Segmentation Module
```bash
python ml/rfm_segmentation.py
```

### 5. Launch the Next.js Frontend (Primary Modern Web UI)
```bash
# Start Next.js development server
npm run dev
```
Open your browser at **`http://localhost:3000`** to view:
- **`http://localhost:3000`** &rarr; Executive Dashboard & Live Inventory Alerts
- **`http://localhost:3000/orders`** &rarr; Place Order Cart (Atomic Stored Procedure & Trigger Testing)
- **`http://localhost:3000/cancel-order`** &rarr; Cancel Order (Inventory Restoration & Refund Status)
- **`http://localhost:3000/analytics`** &rarr; RFM K-Means Segmentation & Lifetime Spend Function

### 6. (Optional) Alternate Streamlit & FastAPI Portals
```bash
# Launch Streamlit Dashboard
python -m streamlit run app.py --server.port 8501

# Launch FastAPI Backend
python -m uvicorn api:app --reload --port 8000
```

### 7. Run with Prisma ORM & Express API
```bash
# Install npm dependencies (if not already installed)
npm install

# Generate Prisma Client
npm run prisma:generate

# Start the Express + Prisma REST Server
npm start
# or in watch mode: npm run dev
```
Server runs at `http://localhost:4000`.

### 8. Launch Prisma Studio (Visual Database GUI)
```bash
npm run prisma:studio
```
Opens an interactive, web-based database management interface at `http://localhost:5555`.

---

## 🧪 Comprehensive Verification & Test Cases

| Test Case | Scenario / Input | Expected Result | Verified Component |
|---|---|---|---|
| **TC-01** | Order product within available stock (e.g., 2 units of Keyboard). | Order record created, `products.stock_qty` decremented by 2, `orders.total_amount` updated automatically. | `place_order`, `trg_validate_and_deduct_stock`, `trg_update_order_total` |
| **TC-02** | Order quantity exceeding inventory (e.g., 999 units). | Transaction rolled back; database raises exception: `Insufficient stock for product...`. | `trg_validate_and_deduct_stock` |
| **TC-03** | Cancel an active order (`cancel_order(order_id)`). | Order status updated to `'Cancelled'`, inventory restored to `products.stock_qty`, payment status updated to `'Refunded'`. | `cancel_order` |
| **TC-04** | Evaluate customer lifetime aggregate spend (`get_customer_total_spent(1)`). | Returns exact sum of all non-cancelled orders for Customer #1. | `get_customer_total_spent` |
| **TC-05** | Execute RFM Segmentation pipeline. | Extracts RFM metrics, trains K-Means ($k=4$), clusters mapped to labels (*Loyal*, *Big Spender*, *At-Risk*, *New*), upserted into `customer_segments`. | `rfm_segmentation.py` |

---

## 📄 License & Academic Integrity
Developed as part of the Database Management Systems (DBMS) coursework by **Nisha Rathi** (`24BYB0137`) and **Anshul Gupta** (`24BYB0149`).
