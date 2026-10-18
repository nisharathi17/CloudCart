/**
 * ============================================================================
 * E-COMMERCE DBMS - PRISMA ORM DEMO SCRIPT
 * Authors: Nisha Rathi (24BYB0137) & Anshul Gupta (24BYB0149)
 * ============================================================================
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Connecting to PostgreSQL via Prisma ORM...\n');

  try {
    // 1. Relational Query: Products with their parent Category
    console.log('--- 1. FETCHING PRODUCTS WITH CATEGORIES (Prisma Query) ---');
    const products = await prisma.product.findMany({
      include: {
        category: true,
      },
      take: 5,
      orderBy: {
        stockQty: 'asc',
      },
    });

    console.table(
      products.map((p) => ({
        ID: p.productId,
        Name: p.productName,
        Category: p.category.categoryName,
        Price: `$${p.price}`,
        Stock: p.stockQty,
      }))
    );

    // 2. Fetch Low-Stock Alerts
    console.log('\n--- 2. LOW-STOCK INVENTORY ALERTS (stockQty < 25) ---');
    const lowStock = await prisma.product.findMany({
      where: {
        stockQty: {
          lt: 25,
        },
      },
      select: {
        productId: true,
        productName: true,
        stockQty: true,
        price: true,
      },
    });
    console.table(lowStock);

    // 3. Executing Native PostgreSQL Stored Function via Prisma $queryRaw
    console.log('\n--- 3. CALLING get_customer_total_spent via Prisma $queryRaw ---');
    const customerId = 1;
    const spentResult = await prisma.$queryRaw`
      SELECT get_customer_total_spent(${customerId}) AS total_spent;
    `;
    console.log(`Lifetime spend for Customer #${customerId}:`, spentResult);

    // 4. Querying Customer RFM Segments
    console.log('\n--- 4. CUSTOMER SEGMENTS (K-Means ML Output) ---');
    const segments = await prisma.customerSegment.findMany({
      include: {
        customer: {
          select: {
            customerName: true,
            city: true,
          },
        },
      },
      orderBy: {
        monetaryValue: 'desc',
      },
    });

    console.table(
      segments.map((s) => ({
        CustomerID: s.customerId,
        Name: s.customer.customerName,
        City: s.customer.city,
        RecencyDays: s.recencyDays,
        Frequency: s.frequency,
        Monetary: `$${s.monetaryValue}`,
        Segment: s.segmentLabel,
      }))
    );

    console.log('\n✅ All Prisma ORM queries executed successfully!');
  } catch (error) {
    console.error('❌ Error executing Prisma demonstration:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
