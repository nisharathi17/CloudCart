# Setup, Contribution & Defense Demonstration Guide

**Project**: E-Commerce Database Management System  
**Document Purpose**: Comprehensive instructions for developer workstation setup, container execution, running tests, and conducting a flawless academic defense / viva demonstration.

---

## 1. System Requirements & Prerequisites

Ensure the following tools are installed on your workstation:
- **Node.js**: v18.17+ or v20+ (with `npm`)
- **Docker & Docker Desktop**: For running containerized PostgreSQL 16 (or an existing local PostgreSQL 14+ instance)
- **Python**: v3.10+ (with `pip` and `venv`)
- **Git**: For version control and collaborative branching

---

## 2. Step-by-Step Environment Setup

### Step 2.1: Clone Repository & Configure Environment Variables
1. Clone the repository and navigate into the root directory:
   ```bash
   cd "c:\Users\anshu\Documents\codes\DBMS PROJECT"
   ```
2. Verify or create your `.env` file from `.env.example`:
   ```ini
   DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/ecommerce_db"
   PORT=4000
   ```

---

### Step 2.2: Launch the PostgreSQL Database via Docker
Start the isolated PostgreSQL container:
```bash
docker compose up -d
```
> **What this does**:
> - Launches a PostgreSQL 16 Alpine container named `ecommerce_postgres` listening on port `5432`.
> - Automatically runs `database/schema.sql` (creates 8 tables with 3NF constraints).
> - Automatically runs `database/procedures_triggers.sql` (compiles triggers and stored procedures).
> - Automatically runs `database/seed.sql` (loads test categories, products, orders, and reviews).

To check container logs:
```bash
docker compose logs -f postgres
```

---

### Step 2.3: Install Dependencies & Initialize Prisma ORM
1. Install Node.js dependencies:
   ```bash
   npm install
   ```
2. Generate the Prisma Client types:
   ```bash
   npm run prisma:generate
   ```
3. *(Optional GUI)* Launch Prisma Studio to inspect raw database tables:
   ```bash
   npm run prisma:studio
   ```
   *(Opens an interactive visual database browser at `http://localhost:5555`)*

---

### Step 2.4: Launch the Next.js Web Application
Start the Next.js development server:
```bash
npm run dev
```
Open your web browser and navigate to:
```
http://localhost:3000
```

---

### Step 2.5: Setup Python Analytics Environment & Run ML Pipeline
1. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows PowerShell:
   .\venv\Scripts\Activate.ps1
   # On macOS / Linux:
   source venv/bin/activate
   ```
2. Install Python dependencies:
   ```bash
   pip install -r ml/requirements.txt
   ```
3. Execute the RFM segmentation clustering script:
   ```bash
   python ml/rfm_segmentation.py
   ```
   *This extracts RFM metrics from PostgreSQL, trains $K$-Means ($k=4$), maps labels, and updates the `customer_segments` table.*

4. Run automated Pytest unit tests:
   ```bash
   pytest ml/test_rfm.py -v
   ```

---

## 3. Collaborative Git Workflow for the 2-Person Team

To avoid Git merge conflicts between **Track 1 (Frontend)** and **Track 2 (Backend)**:

```mermaid
gitGraph
   commit id: "Initial 3NF DDL & Setup"
   branch feature/frontend
   checkout feature/frontend
   commit id: "Build Navbar & Catalog UI"
   commit id: "Build Checkout Modal"
   checkout main
   branch feature/backend
   checkout feature/backend
   commit id: "Implement PL/pgSQL Triggers"
   commit id: "Expose Order API Routes"
   checkout main
   merge feature/backend id: "Merge Backend (v1.1)"
   checkout feature/frontend
   merge main id: "Sync Backend Changes"
   commit id: "Connect Cart to Order API"
   checkout main
   merge feature/frontend id: "Merge Frontend (v1.2)"
```

### Protocol Guidelines:
1. **Never commit broken code to `main`**.
2. Frontend developer works on `feature/frontend-*` branches.
3. Backend developer works on `feature/backend-*` branches.
4. When Backend adds or updates an API route, update `docs/API_SPECIFICATION.md` and notify the Frontend partner.

---

## 4. Academic Defense & Viva Demonstration Walkthrough

When presenting this project to professors, examiners, or academic evaluators, follow this recommended 5-stage demonstration script:

### Stage 1: The Relational Engine & 3NF Normalization
- Open the ER diagram and explain why the schema is in **Third Normal Form (3NF)**:
  - No repeating groups (1NF satisfied via `order_items` and `cart_items`).
  - No partial dependencies (2NF satisfied on composite primary keys).
  - No transitive dependencies (3NF satisfied by keeping categories in a dedicated table).
- Show the 8 tables and `customer_segments` using **Prisma Studio** (`http://localhost:5555`) or `psql`.

### Stage 2: Database Triggers & Concurrency Control (Live Test)
- Show the PL/pgSQL trigger `trg_validate_and_deduct_stock` in `database/procedures_triggers.sql`.
- Explain how row-level locking (`SELECT ... FOR UPDATE`) prevents overselling race conditions.
- On the Frontend Storefront (`http://localhost:3000`), locate a product with 5 units remaining.
- Place an order for 2 units.
- Refresh the product card to show that stock instantly decreased to 3.
- Attempt to place an order for 10 units: show the user-friendly error toast originating from the PostgreSQL trigger exception.

### Stage 3: Atomic Stored Procedure & Order Cancellation
- Navigate to the **Cancel Order** page (`http://localhost:3000/cancel-order`).
- Enter the Order ID from Stage 2.
- Click **"Cancel Order"**.
- Demonstrate that:
  1. The order status updates to `'Cancelled'`.
  2. The product's stock count automatically increases back from 3 to 5.
  3. The trigger `trg_update_order_total` preserves historical financial accuracy.

### Stage 4: Machine Learning RFM Customer Segmentation
- Navigate to the **Analytics Dashboard** (`http://localhost:3000/analytics`).
- Explain the business logic of Recency, Frequency, and Monetary metrics.
- Click **"Re-run RFM Segmentation"** (or execute `python ml/rfm_segmentation.py`).
- Show how the Scikit-learn $K$-Means clustering ($k=4$) dynamically maps customer behavior into:
  - **Loyal Customers**
  - **Big Spenders**
  - **At-Risk Customers**
  - **New Customers**
- Show the SQL batch upsert writing back to `customer_segments`.

### Stage 5: 1-Click System Reset
- Demonstrate the 1-click **"Reset DB"** button in the navbar (`POST /api/db/init`), showing that the entire database drops, rebuilds, and re-seeds in under 2 seconds.
