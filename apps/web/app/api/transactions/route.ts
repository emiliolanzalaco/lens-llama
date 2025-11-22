import { NextRequest, NextResponse } from 'next/server';
import { db, transactions } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const hash = searchParams.get('hash');

    if (hash) {
      const tx = await db.query.transactions.findFirst({
        where: eq(transactions.hash, hash),
      });

      if (!tx) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
      }

      return NextResponse.json(tx);
    }

    if (userId) {
      const userTxs = await db.query.transactions.findMany({
        where: eq(transactions.userId, userId),
      });
      return NextResponse.json(userTxs);
    }

    const allTxs = await db.query.transactions.findMany({
      limit: 100,
    });

    return NextResponse.json(allTxs);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, hash, from, to, value, status } = body;

    if (!userId || !hash || !from || !value || !status) {
      return NextResponse.json(
        { error: 'userId, hash, from, value, and status are required' },
        { status: 400 }
      );
    }

    const [transaction] = await db.insert(transactions).values({
      id: crypto.randomUUID(),
      userId,
      hash,
      from,
      to,
      value: BigInt(value),
      status,
    }).returning();

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
