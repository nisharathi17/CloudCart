/**
 * ============================================================================
 * E-COMMERCE DBMS - EXPRESS & PRISMA ORM REST API SERVER
 * Authors / Students:
 *   - Nisha Rathi (24BYB0137)
 *   - Anshul Gupta (24BYB0149)
 * Database: PostgreSQL 14+ with Engine-Level PL/pgSQL Routines & Triggers
 * ORM: Prisma ORM v6
 * ============================================================================
 */

require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// ----------------------------------------------------------------------------
// 1. Health & Connection Check
// ----------------------------------------------------------------------------
app.get('/health', async (req, res) => {
  try {
    const versionResult = await prisma.$queryRaw`SELECT version();`;
    res.json({
      status: 'healthy',
      orm: 'Prisma ORM v6',
      database: 'PostgreSQL',
      version: versionResult[0].version,
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
    });
  }
});

// ----------------------------------------------------------------------------
// 2. Categories
// ----------------------------------------------------------------------------
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { categoryId: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------------
// 3. Products Catalog with Category Relation
// ----------------------------------------------------------------------------
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: {
          select: { categoryName: true },
        },
      },
      orderBy: { productId: 'asc' },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------------
// 4. Low-Stock Alerts (stockQty < 25)
// ----------------------------------------------------------------------------
app.get('/api/inventory/alerts', async (req, res) => {
  const threshold = parseInt(req.query.threshold || '25', 10);
  try {
    const lowStock = await prisma.product.findMany({
      where: {
        stockQty: {
          lt: threshold,
        },
      },
      include: {
        category: true,
      },
      orderBy: { stockQty: 'asc' },
    });
    res.json({
      threshold,
      count: lowStock.length,
      products: lowStock,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------------
// 5. Orders Listing (with Customers, Payments, and Line Items)
// ----------------------------------------------------------------------------
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: {
          select: {
            customerId: true,
            customerName: true,
            email: true,
            city: true,
          },
        },
        payment: true,
        orderItems: {
          include: {
            product: {
              select: { productName: true, price: true },
            },
          },
        },
      },
      orderBy: { orderId: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------------
// 6. Place Order: Executes Native PostgreSQL Stored Procedure & Triggers
//    Calls fn_place_order(customer_id, jsonb_items) via Prisma $queryRaw
// ----------------------------------------------------------------------------
app.post('/api/orders/place', async (req, res) => {
  const { customer_id, items } = req.body;

  if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: 'Invalid request payload. Expected customer_id and non-empty items array.',
    });
  }

  try {
    const itemsJson = JSON.stringify(items);

    // Call native stored procedure / function wrapper
    const result = await prisma.$queryRaw`
      SELECT fn_place_order(${customer_id}::INT, ${itemsJson}::jsonb) AS new_order_id;
    `;
    const orderId = result[0].new_order_id;

    // Create completed payment record for this new order
    const orderRecord = await prisma.order.findUnique({
      where: { orderId },
    });

    await prisma.payment.create({
      data: {
        orderId,
        method: req.body.payment_method || 'UPI',
        amount: orderRecord.totalAmount,
        paymentStatus: 'Completed',
        paymentDate: new Date(),
      },
    });

    res.status(201).json({
      status: 'success',
      orderId,
      totalAmount: orderRecord.totalAmount,
      message: 'Order created atomically via stored procedure; triggers enforced stock deduction and order total.',
    });
  } catch (error) {
    // Database engine exception (e.g., insufficient stock trigger)
    res.status(400).json({
      error: 'Database Engine Constraint / Trigger Error',
      details: error.message,
    });
  }
});

// ----------------------------------------------------------------------------
// 7. Cancel Order: Executes cancel_order(p_order_id)
//    Restores inventory and updates payment status
// ----------------------------------------------------------------------------
app.post('/api/orders/:id/cancel', async (req, res) => {
  const orderId = parseInt(req.params.id, 10);

  if (isNaN(orderId)) {
    return res.status(400).json({ error: 'Invalid order ID.' });
  }

  try {
    await prisma.$executeRaw`
      CALL cancel_order(${orderId}::INT);
    `;

    const updatedOrder = await prisma.order.findUnique({
      where: { orderId },
      include: { payment: true },
    });

    res.json({
      status: 'success',
      orderId,
      order: updatedOrder,
      message: 'Order cancelled, inventory stock atomically restored, and payment refunded.',
    });
  } catch (error) {
    res.status(400).json({
      error: 'Order Cancellation Failed',
      details: error.message,
    });
  }
});

// ----------------------------------------------------------------------------
// 8. Stored Function: Customer Lifetime Spend
// ----------------------------------------------------------------------------
app.get('/api/customers/:id/spend', async (req, res) => {
  const customerId = parseInt(req.params.id, 10);

  if (isNaN(customerId)) {
    return res.status(400).json({ error: 'Invalid customer ID.' });
  }

  try {
    const result = await prisma.$queryRaw`
      SELECT get_customer_total_spent(${customerId}::INT) AS lifetime_spent;
    `;
    res.json({
      customerId,
      lifetimeSpent: parseFloat(result[0].lifetime_spent || 0),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------------
// 9. Customer Segments (RFM Machine Learning Clusters)
// ----------------------------------------------------------------------------
app.get('/api/segments', async (req, res) => {
  try {
    const segments = await prisma.customerSegment.findMany({
      include: {
        customer: {
          select: {
            customerName: true,
            email: true,
            city: true,
          },
        },
      },
      orderBy: { monetaryValue: 'desc' },
    });
    res.json(segments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------------
// 10. Reviews & Ratings
// ----------------------------------------------------------------------------
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        customer: { select: { customerName: true } },
        product: { select: { productName: true } },
      },
      orderBy: { reviewDate: 'desc' },
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Prisma ORM & Express Server running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`🛍️ Products catalog: http://localhost:${PORT}/api/products`);
    console.log(`📊 Segments: http://localhost:${PORT}/api/segments`);
  });
}

module.exports = app;
