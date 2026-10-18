# Project Work Plan & Work Division

**Project Title**: E-Commerce Database Management System with PostgreSQL, Prisma ORM, and RFM Machine Learning  
**Project Category**: Academic Capstone Database Management System (DBMS) Project  
**Team Roster**: 2 Team Members (Collaborator A & Collaborator B)  
**Status**: Ready for Role Assignment & Sprint Execution  

---

## 1. Executive Overview

This work plan outlines the development lifecycle, technical division of responsibilities, milestone delivery schedule, and testing protocols for the E-Commerce DBMS project.

The system addresses critical operational challenges in retail inventory management, transaction integrity, and customer analytics by implementing:
1. A **Third Normal Form (3NF) PostgreSQL database engine** with 8 core entities and 1 derived analytical entity.
2. **Database-level business constraints**, row-level locking, automated triggers (`trg_validate_and_deduct_stock`, `trg_update_order_total`), and ACID stored procedures (`place_order`, `cancel_order`).
3. An **ORM data-access layer** powered by Prisma ORM for type-safe database queries and migrations.
4. An **Unsupervised Machine Learning pipeline** utilizing Recency, Frequency, and Monetary (RFM) feature extraction and Scikit-learn $K$-Means clustering ($k=4$) to segment customers into actionable business tiers.
5. A **modern web application** (Next.js App Router, Tailwind CSS, Lucide Icons) featuring customer shopping workflows, administrative catalog and inventory controls, and real-time analytical reporting.

---

## 2. Work Division Model (Frontend vs. Backend)

To ensure high velocity and eliminate merge bottlenecks, the project is divided into two distinct, decoupled tracks:
- **Track 1: Frontend Engineering & UI/UX**
- **Track 2: Backend Engineering, Database & ML Analytics**

> **Note on Role Assignment**: As requested, specific personnel names are intentionally omitted below. The team lead or members can assign **Collaborator 1** and **Collaborator 2** to either Track 1 or Track 2.

```
+---------------------------------------------------------------------------------------------------+
|                                      TEAM WORK DISTRIBUTION                                       |
+--------------------------------------------------+------------------------------------------------+
| TRACK 1: FRONTEND ENGINEERING & UI/UX            | TRACK 2: BACKEND, DATABASE & ML ANALYTICS      |
| Assigned To: [ Member 1 / Member 2 ]             | Assigned To: [ Member 1 / Member 2 ]           |
+--------------------------------------------------+------------------------------------------------+
| * Design System, Layouts & Navigation            | * PostgreSQL Relational Schema & 3NF DDL       |
| * Customer Portal (Product Catalog & Filtering)  | * Constraints, Indexes & Referential Actions   |
| * Persistent Cart & Checkout Experience          | * PL/pgSQL Triggers & Atomic Stored Procedures |
| * Order Management & Cancellation UI             | * Prisma ORM Schema, Client & Migrations       |
| * Customer Review & Rating Interface             | * Next.js API Handlers & REST Endpoints        |
| * Analytics Dashboard & Data Visualizations      | * RFM SQL Aggregations & Window Functions      |
| * Client-side State, Validation & Toast UX       | * Scikit-learn K-Means Pipeline & DB Sync      |
| * UI Responsive Design & Presentation Mode       | * Docker Containerization & Database Seeders   |
+--------------------------------------------------+------------------------------------------------+
```

---

## 3. Detailed Scope of Work per Track

### Track 1: Frontend Engineering & UI/UX Responsibilities

1. **Design System & Reusable Components**:
   - Establish consistent styling with Tailwind CSS and theme tokens.
   - Build foundational components: `Navbar`, `MetricCard`, `SegmentBadge`, `Modal`, `DataTable`, `CartDrawer`, `RatingStars`, `AlertBanner`, and `LoadingSkeleton`.
   - Ensure responsive layout across desktop, tablet, and mobile breakpoints.

2. **Customer Experience (Storefront & Cart)**:
   - **Catalog Browser**: Search, category filters, real-time stock availability badges, and pagination.
   - **Persistent Cart**: Client-side cart drawer/modal displaying selected items, quantities, subtotal, and dynamic price calculations.
   - **Checkout Modal**: Customer selector or guest profile entry, order summary, stock pre-validation, payment method selection, and atomic submission.

3. **Order Lifecycle & Management Portal**:
   - **Orders View**: Order history list displaying order ID, customer details, timestamps, line items snapshot (from JSONB), total amount, and status badges (`Placed`, `Shipped`, `Delivered`, `Cancelled`).
   - **Order Cancellation Workflow**: Dedicated interface to trigger order cancellation with explicit feedback explaining inventory restoration.

4. **Product Review & Feedback UI**:
   - Interactive star rating component (1 to 5 stars) with client-side bounds checking.
   - Customer review submission form and review list rendering per product.

5. **Executive Analytics & Marketing Dashboard**:
   - High-level KPI cards: Total Revenue, Total Orders, Active Customers, Low Stock Alerts.
   - RFM Segmentation View: Interactive breakdown of clusters (*Loyal*, *Big Spenders*, *At-Risk*, *New Customers*) with segment tags and customer lookup.
   - Customer Lifetime Spend Calculator: Interactive widget calling the backend function to retrieve a customer's total spending.

6. **Error Handling & User Feedback**:
   - Display informative toast notifications for transaction outcomes (e.g., "Order placed successfully", "Insufficient stock error", "Order cancelled and stock restored").
   - Handle empty states, loading skeletons, and network failure states.

---

### Track 2: Backend Engineering, Database & ML Analytics Responsibilities

1. **Relational Database Design & Normalization (PostgreSQL)**:
   - Implement the complete 3NF DDL for all 8 core tables:
     `categories`, `products`, `customers`, `carts`, `cart_items`, `orders`, `order_items`, `payments`, and `reviews`.
   - Configure domain and relational constraints: `PRIMARY KEY`, `FOREIGN KEY` (with `RESTRICT` and `CASCADE` rules), `CHECK` constraints (positive prices, non-negative stock, valid ratings), and `UNIQUE` constraints.
   - Create B-tree indexes on foreign keys and frequently queried fields (`customer_id`, `category_id`, `order_id`, `email`, `status`).

2. **PL/pgSQL Business Logic & Stored Routines**:
   - **Trigger `trg_validate_and_deduct_stock`**:
     Fires before insert on `order_items`. Uses row-level locking (`SELECT ... FOR UPDATE`) to prevent overselling race conditions and decrements `products.stock_qty`.
   - **Trigger `trg_update_order_total`**:
     Fires after insert/update/delete on `order_items`. Automatically recalculates and updates `orders.total_amount`.
   - **Stored Procedure `place_order`**:
     Accepts customer ID and order items JSONB, performs transactional verification, inserts master order and line items, creates payment record, and clears active cart.
   - **Stored Procedure `cancel_order`**:
     Atomically marks order status as `Cancelled` and restores item quantities back to `products.stock_qty`.
   - **Function `get_customer_total_spent`**:
     Calculates aggregate monetary spend for a specified customer ID excluding cancelled orders.

3. **Prisma ORM Modeling & Client Generation**:
   - Maintain `prisma/schema.prisma` mapping database relations, models, field mappings (`@map`), and relational joins.
   - Expose the singleton Prisma client instance (`src/lib/prisma.ts`).

4. **API Route Handlers & Integration Endpoints**:
   - Implement Next.js App Router API handlers (`/api/*`):
     - `GET /api/stats`: Dashboard summary statistics.
     - `GET /api/products` & `POST /api/products`: Catalog retrieval and product management.
     - `GET /api/customers`: Customer registry.
     - `GET /api/orders` & `POST /api/orders`: Order retrieval and transactional checkout.
     - `POST /api/orders/[id]/cancel`: Atomic order cancellation.
     - `GET /api/customers/[id]/spend`: Lifetime spend computation.
     - `GET /api/segments` & `POST /api/segments/run`: RFM segmentation query and trigger.
     - `POST /api/db/init`: Idempotent database schema reset and seeder execution.

5. **Machine Learning RFM Analytics Module**:
   - Develop `ml/rfm_segmentation.py`:
     - SQL query extracting Recency, Frequency, and Monetary metrics using window functions and date arithmetic.
     - Data preprocessing and feature standardization (`StandardScaler`).
     - $K$-Means clustering algorithm with $k=4$.
     - Cluster interpretation and business label assignment (*Loyal*, *Big Spenders*, *At-Risk*, *New Customers*).
     - Idempotent upsert of results into the `customer_segments` table.
   - Implement unit tests (`ml/test_rfm.py`) with pytest to validate clustering outputs and scaling behavior.

6. **Environment, Seeders & Infrastructure**:
   - Maintain `docker-compose.yml` for reproducible PostgreSQL 16 containerization.
   - Maintain `seed.sql` with realistic synthetic data across categories, products, customers, orders, and reviews.

---

## 4. Sprint-by-Sprint Roadmap (6 Sprints)

```mermaid
gantt
    title E-Commerce DBMS Project Timeline
    dateFormat  YYYY-MM-DD
    section Sprint 1: Setup & Foundations
    Backend : DDL Schema, Docker & Seed Data      :b1, 2026-10-13, 7d
    Frontend: Design Tokens, Layout & Components  :f1, 2026-10-13, 7d
    section Sprint 2: Core Catalog & API Layer
    Backend : Prisma Schema & Catalog API Routes  :b2, 2026-10-20, 7d
    Frontend: Catalog UI, Filters & Stock Badges  :f2, 2026-10-20, 7d
    section Sprint 3: Carts, Orders & Transactions
    Backend : Stored Procedures & Triggers        :b3, 2026-10-27, 7d
    Frontend: Cart Drawer, Checkout & Order List  :f3, 2026-10-27, 7d
    section Sprint 4: Order Cancellation & Reviews
    Backend : Cancellation Logic & Reviews API    :b4, 2026-11-03, 7d
    Frontend: Cancellation UI & Review Forms      :f4, 2026-11-03, 7d
    section Sprint 5: Machine Learning & Analytics
    Backend : RFM SQL & K-Means Clustering        :b5, 2026-11-10, 7d
    Frontend: Analytics Dashboard & KPI Cards     :f5, 2026-11-10, 7d
    section Sprint 6: Integration & Defense Prep
    Joint   : End-to-End Testing & Academic Report:j1, 2026-11-17, 7d
```

### Sprint 1: Architecture, Environment & Foundations
- **Track 2 (Backend)**:
  - Verify PostgreSQL Docker setup via `docker-compose.yml`.
  - Validate 3NF DDL in `database/schema.sql` (8 tables, constraints, foreign keys).
  - Populate comprehensive test dataset in `database/seed.sql`.
- **Track 1 (Frontend)**:
  - Setup UI design system with Tailwind CSS and Lucide icons.
  - Implement root layout (`src/app/layout.tsx`), header navigation (`Navbar.tsx`), and responsive footer.
  - Create reusable UI atom components (`MetricCard`, `Badge`, `Button`, `Spinner`).
- **Sync Point 1**: Backend provides sample database dump; Frontend confirms environment builds with mock data.

### Sprint 2: Catalog Management & Read API Handlers
- **Track 2 (Backend)**:
  - Finalize `prisma/schema.prisma` models and run `prisma generate`.
  - Implement `GET /api/products` (with category filtering and stock status) and `GET /api/categories`.
  - Implement `GET /api/customers` and `GET /api/stats`.
- **Track 1 (Frontend)**:
  - Build main storefront page (`src/app/page.tsx`).
  - Implement category tab filters, real-time search bar, and inventory cards with stock indicators (In Stock, Low Stock, Out of Stock).
  - Connect catalog UI to `/api/products` and `/api/categories`.
- **Sync Point 2**: Test live data fetching from PostgreSQL database via Next.js API into the catalog interface.

### Sprint 3: Cart Management, Order Placement & Transactions
- **Track 2 (Backend)**:
  - Implement PL/pgSQL trigger `trg_validate_and_deduct_stock` and `trg_update_order_total`.
  - Implement stored procedure `place_order` (or Prisma atomic `$transaction`).
  - Expose `POST /api/orders` route handler handling line items and stock error handling.
- **Track 1 (Frontend)**:
  - Build client-side cart drawer or modal (add item, adjust quantity, remove item, subtotal recalculation).
  - Build order checkout modal: customer selection, payment method selection, and order summary.
  - Implement order history page (`src/app/orders/page.tsx`) rendering placed orders and line items.
- **Sync Point 3**: Perform end-to-end checkout test: verify stock deduction in `products` table and atomic creation of `orders`, `order_items`, and `payments`.

### Sprint 4: Order Cancellation, Inventory Restoration & Reviews
- **Track 2 (Backend)**:
  - Implement `cancel_order` procedure / atomic transaction restoring `products.stock_qty`.
  - Implement `POST /api/orders/[id]/cancel` route handler.
  - Implement review DDL and API endpoints (`POST /api/reviews`, `GET /api/products/[id]/reviews`).
- **Track 1 (Frontend)**:
  - Build order cancellation interface (`src/app/cancel-order/page.tsx`) with search by Order ID and instant cancellation confirmation.
  - Add product rating & review widget (1–5 star interactive selector, review text input, review timeline display).
  - Implement toast alerts for successful cancellation and inventory restock.
- **Sync Point 4**: Execute order cancellation test: verify stock quantity increases back to original count and order status transitions to `Cancelled`.

### Sprint 5: Machine Learning RFM Module & Analytics Dashboard
- **Track 2 (Backend)**:
  - Finalize `ml/rfm_segmentation.py` SQL extraction query and Scikit-learn K-Means model ($k=4$).
  - Implement database write-back storing segment labels into `customer_segments`.
  - Implement `GET /api/segments` and `GET /api/customers/[id]/spend` (stored function `get_customer_total_spent`).
  - Write and run unit tests in `ml/test_rfm.py`.
- **Track 1 (Frontend)**:
  - Build analytics dashboard page (`src/app/analytics/page.tsx`).
  - Display RFM customer segment distribution with badges (`Loyal`, `Big Spenders`, `At-Risk`, `New Customers`).
  - Build customer lifetime spend query widget with real-time value lookup.
  - Implement 1-click trigger button to re-run RFM segmentation from UI.
- **Sync Point 5**: Validate ML execution pipeline from UI trigger to database update and dashboard visualization.

### Sprint 6: System Integration, Performance Testing & Final Defense
- **Track 2 (Backend)**:
  - Run database performance benchmarks on indexed vs. non-indexed queries (`EXPLAIN ANALYZE`).
  - Verify 1-click database reset and re-seed endpoint (`/api/db/init`).
  - Validate edge-case constraints (prevent negative stock, invalid ratings, duplicate reviews).
- **Track 1 (Frontend)**:
  - Polish UI/UX, verify mobile responsiveness, error boundary handling, and cross-browser styling.
  - Add loading indicators, skeleton loaders, and empty-state placeholders.
  - Record live demonstration walkthrough and prepare slide visuals.
- **Joint Deliverable**: Complete final academic documentation, ER diagrams, schema documentation, and defense presentation.

---

## 5. Integration Touchpoints & Contract Protocol

To prevent blocking issues between Frontend and Backend, the team adheres to these rules:

1. **API First Approach**: Both members agree on the JSON request/response schema defined in [`docs/API_SPECIFICATION.md`](file:///c:/Users/anshu/Documents/codes/DBMS%20PROJECT/docs/API_SPECIFICATION.md) before implementing UI or API logic.
2. **Mocking Fallback**: If an API route is under active development, the frontend developer uses static JSON mock objects conforming to the contract.
3. **Database Single Source of Truth**: Business validation (stock limits, non-negative prices, rating range 1-5) is enforced at the database level. Frontend client validation provides immediate feedback, but engine constraints are authoritative.
4. **Git Branching Strategy**:
   - `main`: Production-ready code; protected branch.
   - `feature/frontend-*`: Frontend development branches.
   - `feature/backend-*`: Database, API, and ML development branches.
   - Pull requests require mutual review before merging into `main`.

---

## 6. Milestone & Verification Checklist

| Milestone ID | Target Sprint | Deliverable Description | Verification Criteria |
|---|---|---|---|
| **M1** | Sprint 1 | 3NF PostgreSQL DDL & Docker Environment | `docker compose up` starts PG container with 8 tables and seeds successfully |
| **M2** | Sprint 1 | Base UI Design System & Navigation | Next.js app compiles without errors; navbar and layout render cleanly |
| **M3** | Sprint 2 | Catalog & Products API Integration | Storefront dynamically displays products fetched from PostgreSQL via Prisma |
| **M4** | Sprint 3 | Transactional Cart Checkout | Placing an order deducts stock and records order items in atomic transaction |
| **M5** | Sprint 4 | Order Cancellation & Restock | Cancelling order reverts stock and marks order `Cancelled` |
| **M6** | Sprint 5 | RFM Segmentation & Analytics View | Running ML pipeline clusters customers and updates `customer_segments` |
| **M7** | Sprint 6 | Complete Academic DBMS Defense Package | Full system passes live viva demonstration and all report docs are compiled |
