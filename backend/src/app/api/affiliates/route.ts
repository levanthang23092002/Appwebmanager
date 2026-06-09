import { NextResponse } from 'next/server';
import { parseScope, revenueAccountFilter } from '@/lib/affiliateAccess';
import { getAuthUser } from '@/lib/authRequest';
import { prisma } from '@/lib/prisma';

/** Legacy path — dashboard dùng { id, amount, date } */
export async function GET(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }

    const scope = parseScope(request.url);
    const accountFilter = revenueAccountFilter(authUser, scope);

    const rows = await prisma.affiliateRevenue.findMany({
      where: accountFilter,
      select: {
        id: true,
        amount: true,
        currency: true,
        usdVndRate: true,
        revenueDate: true,
      },
      orderBy: { revenueDate: 'desc' },
    });

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        amount: r.amount,
        currency: r.currency,
        usdVndRate: r.usdVndRate,
        date: r.revenueDate.toISOString(),
      }))
    );
  } catch (error) {
    console.error('GET affiliates legacy:', error);
    return NextResponse.json({ error: 'Failed to fetch affiliate transactions' }, { status: 500 });
  }
}
