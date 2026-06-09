import { NextResponse } from 'next/server';
import { canViewAccountCredentials } from '@/lib/affiliateAccess';
import {
  decryptAffiliatePassword,
  encryptAffiliatePassword,
} from '@/lib/affiliateCrypto';
import { affiliateAccountInclude } from '@/lib/affiliateSelect';
import { getAuthUser } from '@/lib/authRequest';
import { prisma } from '@/lib/prisma';

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: RouteCtx) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }

    const { id } = await ctx.params;
    const accountId = parseInt(id, 10);
    if (!Number.isFinite(accountId)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
    }

    const reveal = new URL(request.url).searchParams.get('reveal') === '1';
    const account = await prisma.affiliateAccount.findUnique({
      where: { id: accountId },
      include: affiliateAccountInclude,
    });
    if (!account) {
      return NextResponse.json({ error: 'Không tìm thấy account' }, { status: 404 });
    }

    const canView =
      canViewAccountCredentials(authUser, account.ownerId) ||
      authUser.role === 'admin' ||
      authUser.role === 'manager';
    const canAccess =
      authUser.role === 'admin' ||
      authUser.role === 'manager' ||
      account.ownerId === authUser.id;
    if (!canAccess) {
      return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    }

    return NextResponse.json({
      id: account.id,
      networkId: account.networkId,
      ownerId: account.ownerId,
      name: account.name,
      loginEmail: account.loginEmail,
      note: account.note,
      dashboardUrl: account.dashboardUrl,
      active: account.active,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      network: account.network,
      owner: account.owner,
      hasPassword: !!account.passwordEnc,
      ...(reveal && canView
        ? { password: decryptAffiliatePassword(account.passwordEnc) }
        : {}),
    });
  } catch (error) {
    console.error('GET affiliate account:', error);
    return NextResponse.json({ error: 'Không tải được account' }, { status: 500 });
  }
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }

    const { id } = await ctx.params;
    const accountId = parseInt(id, 10);
    if (!Number.isFinite(accountId)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
    }

    const account = await prisma.affiliateAccount.findUnique({ where: { id: accountId } });
    if (!account) {
      return NextResponse.json({ error: 'Không tìm thấy account' }, { status: 404 });
    }
    if (account.ownerId !== authUser.id && authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ chủ account hoặc admin được sửa' }, { status: 403 });
    }

    const data = await request.json();
    const patch: Record<string, unknown> = {};
    if (data.name != null) patch.name = String(data.name).trim();
    if (data.loginEmail != null) patch.loginEmail = String(data.loginEmail).trim().toLowerCase();
    if (data.note != null) patch.note = data.note?.trim() || null;
    if (data.dashboardUrl != null) patch.dashboardUrl = data.dashboardUrl?.trim() || null;
    if (data.active != null) patch.active = Boolean(data.active);
    if (data.password != null && String(data.password).trim()) {
      patch.passwordEnc = encryptAffiliatePassword(String(data.password));
    }

    const updated = await prisma.affiliateAccount.update({
      where: { id: accountId },
      data: patch,
      include: affiliateAccountInclude,
    });

    return NextResponse.json({
      id: updated.id,
      networkId: updated.networkId,
      ownerId: updated.ownerId,
      name: updated.name,
      loginEmail: updated.loginEmail,
      note: updated.note,
      dashboardUrl: updated.dashboardUrl,
      active: updated.active,
      network: updated.network,
      owner: updated.owner,
      hasPassword: !!updated.passwordEnc,
    });
  } catch (error) {
    console.error('PATCH affiliate account:', error);
    return NextResponse.json({ error: 'Không cập nhật được account' }, { status: 500 });
  }
}
