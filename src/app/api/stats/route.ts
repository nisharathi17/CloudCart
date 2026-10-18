import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [
      totalProducts,
      totalCustomers,
      totalOrders,
      revenueResult,
      lowStockProducts,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.customer.count(),
      prisma.order.count(),
      prisma.$queryRaw<{ gross_revenue: string }[]>`
        SELECT COALESCE(SUM(total_amount), 0.00)::TEXT AS gross_revenue
        FROM orders
        WHERE status != 'Cancelled';
      `,
      prisma.product.findMany({
        where: { stockQty: { lt: 25 } },
        include: { category: true },
        orderBy: { stockQty: 'asc' },
      }),
    ]);

    const grossRevenue = parseFloat(revenueResult[0]?.gross_revenue || '0');

    return NextResponse.json({
      totalProducts,
      totalCustomers,
      totalOrders,
      grossRevenue,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Database connection failed', details: error.message },
      { status: 500 }
    );
  }
}
