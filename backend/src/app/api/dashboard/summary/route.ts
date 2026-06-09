import { NextResponse } from 'next/server';
import { normalizeCurrency, type CurrencyCode } from '@/lib/currency';
import { getDashboardSummary } from '@/lib/dashboardSummary';
import { parseDashboardFilter } from '@/lib/dashboardPeriod';
import { parseScope } from '@/lib/affiliateAccess';
import { getAuthUser } from '@/lib/authRequest';

export async function GET(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }

    const url = new URL(request.url);
    const filter = parseDashboardFilter(url.searchParams.get('filter'));
    const display = normalizeCurrency(url.searchParams.get('display'), 'USD') as CurrencyCode;
    const scope = parseScope(request.url);

    const summary = await getDashboardSummary(authUser, { filter, display, scope });
    return NextResponse.json(summary);
  } catch (error) {
    console.error('GET dashboard/summary:', error);
    return NextResponse.json({ error: 'Không tải được tổng quan' }, { status: 500 });
  }
}
