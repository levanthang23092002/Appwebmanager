import { NextResponse } from 'next/server';
import { notifyAffiliateRevenueCreated } from '@/lib/affiliateNotify';
import { parseScope, revenueAccountFilter } from '@/lib/affiliateAccess';
import { affiliateRevenueInclude } from '@/lib/affiliateSelect';
import { findOrCreateAffiliateStore } from '@/lib/affiliateStore';
import { normalizeCurrency, normalizeUsdVndRate } from '@/lib/currency';
import { getAuthUser } from '@/lib/authRequest';
import { getFinanceSettings } from '@/lib/financeSettings';
import { prisma } from '@/lib/prisma';

function parseRevenueDate(raw: unknown): Date | null {
  if (!raw) return null;
  const d = new Date(String(raw));
  if (!Number.isFinite(d.getTime())) return null;
  return d;
}

export async function GET(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }

    const scope = parseScope(request.url);
    const accountFilter = revenueAccountFilter(authUser, scope);
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const networkId = url.searchParams.get('networkId');
    const accountId = url.searchParams.get('accountId');
    const ownerId = url.searchParams.get('ownerId');

    const dateFilter: { gte?: Date; lte?: Date } = {};
    const fromDate = from ? parseRevenueDate(from) : null;
    const toDate = to ? parseRevenueDate(to) : null;
    if (fromDate) dateFilter.gte = fromDate;
    if (toDate) dateFilter.lte = toDate;

    const revenues = await prisma.affiliateRevenue.findMany({
      where: {
        ...(accountFilter ? accountFilter : {}),
        ...(Object.keys(dateFilter).length ? { revenueDate: dateFilter } : {}),
        ...(networkId ? { networkId: parseInt(networkId, 10) } : {}),
        ...(accountId ? { accountId: parseInt(accountId, 10) } : {}),
        ...(ownerId && scope === 'team'
          ? { account: { ownerId: parseInt(ownerId, 10) } }
          : {}),
      },
      include: affiliateRevenueInclude,
      orderBy: [{ revenueDate: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(revenues);
  } catch (error) {
    console.error('GET affiliate revenue:', error);
    return NextResponse.json({ error: 'Không tải được doanh thu' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }

    const data = await request.json();
    const accountId = parseInt(String(data.accountId), 10);
    const amount = parseFloat(String(data.amount));
    const revenueDate = parseRevenueDate(data.revenueDate) || new Date();
    const orderCountRaw = data.orderCount;
    const orderCount =
      orderCountRaw != null && orderCountRaw !== ''
        ? parseInt(String(orderCountRaw), 10)
        : null;
    const settings = await getFinanceSettings();
    const currency = normalizeCurrency(data.currency, 'USD');
    const usdVndRate = normalizeUsdVndRate(data.usdVndRate, settings.usdVndRate);
    const storeDomain = data.storeDomain?.trim() || null;

    if (!Number.isFinite(accountId)) {
      return NextResponse.json({ error: 'Thiếu account' }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Số tiền phải lớn hơn 0' }, { status: 400 });
    }
    if (orderCount != null && (!Number.isFinite(orderCount) || orderCount < 0)) {
      return NextResponse.json({ error: 'Số lượng order không hợp lệ' }, { status: 400 });
    }

    const account = await prisma.affiliateAccount.findUnique({
      where: { id: accountId },
      include: { network: true },
    });
    if (!account || !account.active) {
      return NextResponse.json({ error: 'Account không tồn tại' }, { status: 404 });
    }

    const canUse =
      authUser.role === 'admin' ||
      authUser.role === 'manager' ||
      account.ownerId === authUser.id;
    if (!canUse) {
      return NextResponse.json({ error: 'Không có quyền nhập cho account này' }, { status: 403 });
    }

    const { storeId, storeDomain: normalizedDomain } = await findOrCreateAffiliateStore(
      accountId,
      storeDomain
    );

    const revenue = await prisma.affiliateRevenue.create({
      data: {
        networkId: account.networkId,
        accountId,
        storeId,
        storeDomain: normalizedDomain,
        amount,
        orderCount: orderCount != null && orderCount > 0 ? orderCount : null,
        currency,
        usdVndRate,
        revenueDate,
        source: 'MANUAL',
        status: 'APPROVED',
        note: data.note?.trim() || null,
        createdById: authUser.id,
      },
      include: affiliateRevenueInclude,
    });

    notifyAffiliateRevenueCreated(revenue).catch((err) =>
      console.error('affiliate notify:', err)
    );

    return NextResponse.json(revenue, { status: 201 });
  } catch (error) {
    console.error('POST affiliate revenue:', error);
    return NextResponse.json({ error: 'Không lưu được doanh thu' }, { status: 500 });
  }
}
