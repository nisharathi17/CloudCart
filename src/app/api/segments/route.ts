import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const segments = await prisma.customerSegment.findMany({
      include: {
        customer: {
          select: {
            customerId: true,
            customerName: true,
            email: true,
            city: true,
          },
        },
      },
      orderBy: { monetaryValue: 'desc' },
    });
    return NextResponse.json(segments);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch customer segments', details: error.message },
      { status: 500 }
    );
  }
}
