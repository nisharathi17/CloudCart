# Project Directory Structure & Codebase Guide

**Project**: E-Commerce Database Management System  
**Document Purpose**: Definitive reference guide documenting the purpose, responsibility track, and maintenance rules for every file and folder in the repository.

---

## 1. Complete Repository Tree

```
DBMS PROJECT/
│
├── .env.example                       # Shared: Environment variable configuration template
├── docker-compose.yml                 # Shared / Backend: Containerized PostgreSQL 16 database service
├── package.json                       # Shared / Frontend: Node.js scripts and package dependencies
├── tsconfig.json                      # Frontend: TypeScript compiler configuration
├── tailwind.config.js                 # Frontend: Tailwind CSS layout & theme tokens
├── postcss.config.js                  # Frontend: PostCSS build configuration
├── README.md                          # Shared: Academic Capstone Project Report & Overview
│
├── database/                          # [Track 2: Backend] Native PostgreSQL Database Engine Assets
│   ├── schema.sql                     # Complete 3NF DDL (10 tables, constraints, indexes)
│   ├── procedures_triggers.sql        # PL/pgSQL explicit cursors, triggers, procedures & functions
│   ├── dml_operations.sql             # Meaningful INSERT, UPDATE, DELETE & cascade demonstrations
│   ├── queries.sql                    # 15 Advanced analytical SQL queries (Joins, Subqueries, Windows)
│   └── seed.sql                       # Comprehensive synthetic test dataset
│
├── prisma/                            # [Track 2: Backend] Prisma ORM Schema & Client Mappings
│   └── schema.prisma                  # Prisma data models mapped to PostgreSQL 3NF tables
│
├── ml/                                # [Track 2: Backend] Unsupervised Machine Learning Analytics
│   ├── rfm_segmentation.py            # SQL RFM extractor, StandardScaler & KMeans (k=4) clustering
│   ├── test_rfm.py                    # Pytest unit tests verifying clustering stability
│   └── requirements.txt               # Python package dependencies (pandas, scikit-learn, psycopg2)
│
├── src/                               # [Track 1: Frontend & Track 2: Backend Route Handlers]
│   ├── app/                           # Next.js 16 App Router (Pages & API Handlers)
│   │   ├── layout.tsx                 # [Frontend] Root layout with persistent header & academic footer
│   │   ├── globals.css                # [Frontend] Global CSS resets and Tailwind utility imports
│   │   ├── page.tsx                   # [Frontend] Storefront Catalog & Executive Dashboard
│   │   ├── orders/                    # [Frontend] Order History & Line Items Inspector
│   │   │   └── page.tsx               # Orders view with status indicators
│   │   ├── cancel-order/              # [Frontend] Order Cancellation & Restock Interface
│   │   │   └── page.tsx               # Interactive cancellation testbed with feedback alerts
│   │   ├── analytics/                 # [Frontend] RFM Segments & Customer Spend Dashboard
│   │   │   └── page.tsx               # Segment visualization and lifetime spend calculator
│   │   └── api/                       # [Backend] Serverless REST Route Handlers (Prisma Client)
│   │       ├── stats/route.ts         # High-level database summary metrics
│   │       ├── products/route.ts      # Product catalog query & filter endpoint
│   │       ├── customers/route.ts     # Customer registry endpoint
│   │       ├── orders/route.ts        # Order retrieval & atomic placement endpoint
│   │       ├── orders/[id]/cancel/    # Order cancellation & inventory restoration
│   │       │   └── route.ts
│   │       ├── customers/[id]/spend/  # Customer total lifetime spend calculator
│   │       │   └── route.ts
│   │       ├── segments/route.ts      # RFM segmentation query & trigger handler
│   │       └── db/init/route.ts       # 1-click database schema re-initialization endpoint
│   │
│   ├── components/                    # [Track 1: Frontend] Reusable Modular UI Components
│   │   ├── Navbar.tsx                 # Header navigation bar with 1-click DB init button
│   │   ├── MetricCard.tsx             # Metric card for dashboard statistics
│   │   └── SegmentBadge.tsx           # Color-coded badge for RFM clusters
│   │
│   ├── lib/                           # [Track 2: Backend] Core Libraries & Utilities
│   │   ├── prisma.ts                  # Singleton PrismaClient instance with hot-reload pooling
│   │   └── utils.ts                   # Formatting helpers and Tailwind class mergers
│   │
│   ├── server.js                      # [Backend Alternative] Standalone Express 5 + Prisma REST API
│   └── demo_prisma.js                 # [Backend Test] Standalone script to test Prisma ORM connectivity
│
└── docs/                              # [Shared] Project Documentation & Academic Specifications
    ├── WORK_PLAN.md                   # Full sprint work plan & Track 1/Track 2 division
    ├── DBMS_RUBRIC_COMPLIANCE_GUIDE.md# 100% Evaluation Rubric Mapping & Viva Script
    ├── DATABASE_IMPLEMENTATION_PLAN.md# DB execution plan, triggers & test suite
    ├── ARCHITECTURE_AND_DESIGN.md     # Architecture, ACID transaction flows & Mermaid diagrams
    ├── DATABASE_SPECIFICATION.md      # Data dictionary, ER mapping, 3NF DDL, and triggers
    ├── API_SPECIFICATION.md           # Exhaustive REST API contract with request/response schemas
    ├── ML_RFM_SPECIFICATION.md        # Mathematical formulation, StandardScaler & K-Means specs
    ├── PROJECT_STRUCTURE_GUIDE.md     # This comprehensive file tree and ownership guide
    └── SETUP_AND_CONTRIBUTION_GUIDE.md# Environment setup, Docker runbook & presentation checklist
```

---

## 2. Directory Responsibility Matrix

| Directory / File | Primary Track | Secondary Track | Primary Language / Tool | Key Responsibilities |
|---|---|---|---|---|
| `database/` | **Track 2: Backend** | - | PostgreSQL SQL / PL/pgSQL | Authoritative 3NF schema, constraint definitions, triggers, and seed data. |
| `prisma/` | **Track 2: Backend** | - | Prisma Schema Language | Type-safe ORM schema mapping and migration definitions. |
| `ml/` | **Track 2: Backend** | - | Python 3 (scikit-learn, pandas) | RFM calculation, feature scaling, K-Means clustering, and database writeback. |
| `src/app/api/` | **Track 2: Backend** | Track 1: Frontend | TypeScript / Next.js Route Handlers | Serverless API routes implementing the REST contract and Prisma transactions. |
| `src/app/(pages)` | **Track 1: Frontend** | - | TypeScript / React 19 / Tailwind | Client pages, state management, form inputs, feedback banners, and charts. |
| `src/components/` | **Track 1: Frontend** | - | TypeScript / React 19 | Modular, reusable UI components for cards, badges, and navigation. |
| `src/lib/` | **Track 2: Backend** | Track 1: Frontend | TypeScript | Database client singleton and formatting utility functions. |
| `docs/` | **Shared** | - | Markdown / Mermaid | Technical documentation, architecture, API contract, and viva defense guide. |

---

## 3. Best Practices for Maintaining Repository Cleanliness

1. **Keep Database Assets Centralized**:
   - Always edit database DDL, stored procedures, and seed datasets in `database/schema.sql`, `database/procedures_triggers.sql`, and `database/seed.sql`.
   - The Docker Compose configuration (`docker-compose.yml`) automatically mounts `database/*.sql` into the container's entrypoint.

2. **Keep Machine Learning Code in `ml/`**:
   - The Python script `ml/rfm_segmentation.py` and its tests `ml/test_rfm.py` are self-contained with `ml/requirements.txt`.

3. **Keep Client Pages Clean**:
   - Any complex UI blocks should be factored into reusable components under `src/components/` rather than crammed into a single page file.

4. **API Route Handlers as Contract Enforcement**:
   - API routes in `src/app/api/` should validate request payloads before issuing queries, returning appropriate HTTP status codes (e.g., 400 for bad input, 404 for missing entities, 500 for server errors).
