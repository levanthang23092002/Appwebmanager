import { NextResponse } from 'next/server';
import { convertAmount, normalizeCurrency, type CurrencyCode } from '@/lib/currency';
import { getAuthUser } from '@/lib/authRequest';
import { prisma } from '@/lib/prisma';

function parseDisplayCurrency(url: string): CurrencyCode {
  const display = new URL(url).searchParams.get('display');
  return normalizeCurrency(display, 'USD');
}

export async function GET(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }

    const display = parseDisplayCurrency(request.url);
    const isTeam = authUser.role === 'admin' || authUser.role === 'manager';
    const revenueWhere = isTeam ? undefined : { account: { ownerId: authUser.id } };

    const [revenues, costs] = await Promise.all([
      prisma.affiliateRevenue.findMany({
        where: revenueWhere,
        select: { amount: true, currency: true, usdVndRate: true },
      }),
      prisma.cost.findMany({
        where: { approved: true, canceled: false },
        select: { amount: true, currency: true, usdVndRate: true },
      }),
    ]);

    const totalRevenue = revenues.reduce(
      (sum, row) => sum + convertAmount(row.amount, row.currency, row.usdVndRate, display),
      0
    );
    const totalCost = costs.reduce(
      (sum, row) => sum + convertAmount(row.amount, row.currency, row.usdVndRate, display),
      0
    );
    const netProfit = totalRevenue - totalCost;

    return NextResponse.json({
      data: { totalRevenue, totalCost, netProfit, displayCurrency: display },
      message: 'Phép tính xử lý thành công trên Server Node.js',
    });
  } catch (error) {
    console.error('GET finance:', error);
    return NextResponse.json({ error: 'Failed to calculate finance summary' }, { status: 500 });
  }
}
