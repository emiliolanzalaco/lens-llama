import { NextRequest, NextResponse } from 'next/server';
import { db, payments } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (userId) {
      const userPayments = await db.query.payments.findMany({
        where: eq(payments.userId, userId),
      });
      return NextResponse.json(userPayments);
    }

    const allPayments = await db.query.payments.findMany({
      limit: 100,
    });

    return NextResponse.json(allPayments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount, currency } = body;

    if (!userId || !amount || !currency) {
      return NextResponse.json(
        { error: 'userId, amount, and currency are required' },
        { status: 400 }
      );
    }

    const [payment] = await db.insert(payments).values({
      id: crypto.randomUUID(),
      userId,
      amount: BigInt(amount),
      currency,
      status: 'pending',
      settled: false,
    }).returning();

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
