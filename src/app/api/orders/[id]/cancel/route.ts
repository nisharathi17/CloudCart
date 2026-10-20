import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id, 10);

    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    // Call stored procedure cancel_order(p_order_id)
    await prisma.$executeRaw`
      CALL cancel_order(${orderId}::INT);
    `;

    const updatedOrder = await prisma.order.findUnique({
      where: { orderId },
      include: {
        payment: true,
        orderItems: { include: { product: true } },
      },
    });

    return NextResponse.json({
      status: 'success',
      orderId,
      order: updatedOrder,
      message: 'Order cancelled, inventory stock atomically restored, and payment refunded.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Order Cancellation Failed', details: error.message },
      { status: 400 }
    );
  }
}
