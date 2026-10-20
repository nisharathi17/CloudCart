import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { customerId: 'asc' },
    });
    return NextResponse.json(customers);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch customers', details: error.message },
      { status: 500 }
    );
  }
}
