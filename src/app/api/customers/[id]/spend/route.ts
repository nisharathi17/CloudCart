import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id, 10);

    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });
    }

    // Call native PostgreSQL stored function get_customer_total_spent(customer_id)
    const result = await prisma.$queryRaw<{ lifetime_spent: string }[]>`
      SELECT get_customer_total_spent(${customerId}::INT)::TEXT AS lifetime_spent;
    `;

    const totalSpent = parseFloat(result[0]?.lifetime_spent || '0');

    return NextResponse.json({
      customerId,
      totalSpent,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to compute customer spend', details: error.message },
      { status: 500 }
    );
  }
}
