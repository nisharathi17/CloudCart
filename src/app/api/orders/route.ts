import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
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
              select: {
                productId: true,
                productName: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: { orderId: 'desc' },
    });
    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer_id, items, payment_method = 'UPI' } = body;

    if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload. customer_id and non-empty items array are required.' },
        { status: 400 }
      );
    }

    const itemsJson = JSON.stringify(items);

    // Call native PostgreSQL stored procedure wrapper
    // BEFORE INSERT trigger validates stock and decrements inventory
    // AFTER INSERT trigger recalculates orders.total_amount
    const result = await prisma.$queryRaw<{ new_order_id: number }[]>`
      SELECT fn_place_order(${customer_id}::INT, ${itemsJson}::jsonb) AS new_order_id;
    `;

    const generatedOrderId = result[0]?.new_order_id;

    if (!generatedOrderId) {
      throw new Error('Database failed to return a valid order ID.');
    }

    // Retrieve the order total calculated by the database trigger
    const orderRecord = await prisma.order.findUnique({
      where: { orderId: generatedOrderId },
    });

    // Create payment settlement record
    await prisma.payment.create({
      data: {
        orderId: generatedOrderId,
        method: payment_method,
        amount: orderRecord?.totalAmount || 0,
        paymentStatus: 'Completed',
        paymentDate: new Date(),
      },
    });

    return NextResponse.json({
      status: 'success',
      orderId: generatedOrderId,
      totalAmount: orderRecord?.totalAmount,
      message: 'Order created atomically via native stored procedure place_order.',
      triggersFired: [
        'trg_validate_and_deduct_stock: verified stock & decremented products.stock_qty',
        'trg_update_order_total: summed line items & updated orders.total_amount'
      ]
    }, { status: 201 });
  } catch (error: any) {
    // If stock is insufficient or a constraint fails, PostgreSQL engine raises exception
    return NextResponse.json(
      {
        error: 'Database Engine Constraint / Trigger Error',
        details: error.message,
      },
      { status: 400 }
    );
  }
}
