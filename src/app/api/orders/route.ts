
import { NextRequest, NextResponse } from 'next/server';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export const runtime = 'nodejs';

const sqs = new SQSClient({
  region: process.env.AWS_REGION || 'ap-southeast-2',
  
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    if (!user.email || user.email_verified !== true) {
      return NextResponse.json(
        { error: 'Your account must have a verified email address.' },
        { status: 403 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { email: user.email },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer record not found.' },
        { status: 403 }
      );
    }

    const orders = await prisma.order.findMany({
      where: { customerId: customer.customerId },
      include: {
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
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch orders.' },
      { status: 500 }
    );
  }
}
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the signed-in Cognito user.
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    if (!user.email || user.email_verified !== true) {
      return NextResponse.json(
        { error: 'Your account must have a verified email address.' },
        { status: 403 }
      );
    }

    // 2. Find the database customer using the verified account email.
    const customer = await prisma.customer.findUnique({
      where: { email: user.email },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'No customer record matches your signed-in email.' },
        { status: 403 }
      );
    }

    // 3. Validate the order payload.
    const body = await request.json();
    const { items, payment_method = 'UPI' } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'A non-empty items array is required.' },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (
        !Number.isInteger(Number(item.product_id)) ||
        Number(item.product_id) <= 0 ||
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) <= 0
      ) {
        return NextResponse.json(
          { error: 'Each item must have a valid product_id and positive integer quantity.' },
          { status: 400 }
        );
      }
    }

    // 4. Create the order through PostgreSQL business logic.
    // The database procedure and triggers validate stock and calculate totals.
    const itemsJson = JSON.stringify(items);

    const result = await prisma.$queryRaw<{ new_order_id: number }[]>`
      SELECT fn_place_order(
        ${customer.customerId}::INT,
        ${itemsJson}::jsonb
      ) AS new_order_id;
    `;

    const generatedOrderId = result[0]?.new_order_id;

    if (!generatedOrderId) {
      throw new Error('Database failed to return a valid order ID.');
    }

    const orderRecord = await prisma.order.findUnique({
      where: { orderId: generatedOrderId },
    });

    if (!orderRecord) {
      throw new Error(`Could not retrieve order ${generatedOrderId}.`);
    }

    const totalAmount = Number(orderRecord.totalAmount);

    // 5. Create the payment record.
    await prisma.payment.create({
      data: {
        orderId: generatedOrderId,
        method: payment_method,
        amount: totalAmount,
        paymentStatus: 'Completed',
        paymentDate: new Date(),
      },
    });

    // 6. Publish the confirmation email message to SQS.
    // Email delivery failure must not make the client retry the order,
    // because the order and payment have already been created.
    const queueUrl = process.env.ORDER_EMAIL_QUEUE_URL;
    let emailQueued = false;

    if (!queueUrl) {
      console.error(
        'ORDER_EMAIL_QUEUE_URL is not configured. Order email was not queued.',
        { orderId: generatedOrderId }
      );
    } else {
      try {
        await sqs.send(
          new SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify({
              orderId: generatedOrderId,
              customerEmail: customer.email,
              totalAmount,
            }),
          })
        );

        emailQueued = true;

        console.log('Order email queued successfully', {
          orderId: generatedOrderId,
          customerEmail: customer.email,
        });
      } catch (error) {
        console.error('Failed to enqueue order confirmation email', {
          orderId: generatedOrderId,
          error:
            error instanceof Error ? error.message : 'Unknown SQS error',
        });
      }
    }

    // 7. Return the successful order result.
    return NextResponse.json(
      {
        status: 'success',
        orderId: generatedOrderId,
        totalAmount,
        emailQueued,
        message: 'Order created successfully.',
        triggersFired: [
          'trg_validate_and_deduct_stock: verified stock and decremented inventory',
          'trg_update_order_total: recalculated the order total',
        ],
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';

    console.error('Order creation failed:', message);

    return NextResponse.json(
      { error: 'Order creation failed. Please check your order and try again.' },
      { status: 400 }
    );
  }
}
