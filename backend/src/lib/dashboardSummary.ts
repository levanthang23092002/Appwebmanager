import { convertAmount, normalizeCurrency, type CurrencyCode } from '@/lib/currency';
import type { AuthPayload } from '@/lib/authRequest';
import { revenueAccountFilter } from '@/lib/affiliateAccess';
import { prisma } from '@/lib/prisma';
import { getDashboardPeriodRanges, type DashboardFilter } from '@/lib/dashboardPeriod';

function calcTrend(current: number, previous: number) {
  if (previous <= 0) {
    return { positive: current >= 0, value: current > 0 ? '100.0' : '0.0' };
  }
  const pct = ((current - previous) / previous) * 100;
  return {
    positive: pct >= 0,
    value: Math.abs(pct).toFixed(1),
  };
}

function sumInRange<T extends { amount: number; currency: string; usdVndRate: number }>(
  rows: T[],
  getDate: (row: T) => Date | null,
  start: Date,
  end: Date,
  display: CurrencyCode
) {
  return rows.reduce((sum, row) => {
    const d = getDate(row);
    if (!d || d < start || d > end) return sum;
    return sum + convertAmount(row.amount, row.currency, row.usdVndRate, display);
  }, 0);
}

export async function getDashboardSummary(
  authUser: AuthPayload,
  opts: { filter: DashboardFilter; display: CurrencyCode; scope: 'mine' | 'team' }
) {
  const ranges = getDashboardPeriodRanges(opts.filter);
  const windowStart = ranges.prevStart;
  const windowEnd = ranges.end;

  const costWhere =
    authUser.role === 'admin'
      ? { approved: true, canceled: false }
      : { userId: authUser.id, approved: true, canceled: false };

  const revenueWhere = revenueAccountFilter(authUser, opts.scope);

  const [costs, revenues] = await Promise.all([
    prisma.cost.findMany({
      where: {
        ...costWhere,
        createdAt: { gte: windowStart, lte: windowEnd },
      },
      select: {
        amount: true,
        currency: true,
        usdVndRate: true,
        createdAt: true,
      },
    }),
    prisma.affiliateRevenue.findMany({
      where: {
        ...(revenueWhere ?? {}),
        revenueDate: { gte: windowStart, lte: windowEnd },
      },
      select: {
        amount: true,
        currency: true,
        usdVndRate: true,
        revenueDate: true,
      },
    }),
  ]);

  const currentCosts = sumInRange(
    costs,
    (r) => r.createdAt,
    ranges.start,
    ranges.end,
    opts.display
  );
  const previousCosts = sumInRange(
    costs,
    (r) => r.createdAt,
    ranges.prevStart,
    ranges.prevEnd,
    opts.display
  );
  const currentRevenue = sumInRange(
    revenues,
    (r) => r.revenueDate,
    ranges.start,
    ranges.end,
    opts.display
  );
  const previousRevenue = sumInRange(
    revenues,
    (r) => r.revenueDate,
    ranges.prevStart,
    ranges.prevEnd,
    opts.display
  );

  const currentProfit = currentRevenue - currentCosts;
  const previousProfit = previousRevenue - previousCosts;

  return {
    displayCurrency: opts.display,
    revenue: currentRevenue,
    costs: currentCosts,
    profit: currentProfit,
    labelSuffix: ranges.labelSuffix,
    revenueTrend: calcTrend(currentRevenue, previousRevenue),
    costTrend: calcTrend(currentCosts, previousCosts),
    profitTrend: calcTrend(currentProfit, previousProfit),
  };
}
