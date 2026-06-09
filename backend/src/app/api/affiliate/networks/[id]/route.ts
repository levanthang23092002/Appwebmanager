import { NextResponse } from 'next/server';
import { canManageNetworks } from '@/lib/affiliateAccess';
import { getAuthUser } from '@/lib/authRequest';
import { prisma } from '@/lib/prisma';

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: RouteCtx) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }
    if (!canManageNetworks(authUser.role)) {
      return NextResponse.json({ error: 'Chỉ admin được quản lý network' }, { status: 403 });
    }

    const { id } = await ctx.params;
    const networkId = parseInt(id, 10);
    if (!Number.isFinite(networkId)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
    }

    const data = await request.json();
    const patch: Record<string, unknown> = {};
    if (data.name != null) patch.name = String(data.name).trim();
    if (data.syncType != null) patch.syncType = String(data.syncType).trim();
    if (data.logo != null) patch.logo = data.logo?.trim() || null;
    if (data.active != null) patch.active = Boolean(data.active);

    const updated = await prisma.affiliateNetwork.update({
      where: { id: networkId },
      data: patch,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH affiliate network:', error);
    return NextResponse.json({ error: 'Không cập nhật được network' }, { status: 500 });
  }
}
