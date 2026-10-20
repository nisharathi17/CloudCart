import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: {
          select: { categoryName: true },
        },
      },
      orderBy: { productId: 'asc' },
    });

    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch products', details: error.message },
      { status: 500 }
    );
  }
}
