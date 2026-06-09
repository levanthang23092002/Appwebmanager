import { NextResponse } from 'next/server';
import { canManageNetworks } from '@/lib/affiliateAccess';
import {
  ensureDefaultAffiliateNetworks,
  generateUniqueNetworkCode,
} from '@/lib/affiliateNetworks';
import { getAuthUser } from '@/lib/authRequest';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }

    await ensureDefaultAffiliateNetworks();

    const all = new URL(request.url).searchParams.get('all') === '1';
    const networks = await prisma.affiliateNetwork.findMany({
      where: all && canManageNetworks(authUser.role) ? undefined : { active: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(networks);
  } catch (error) {
    console.error('GET affiliate networks:', error);
    return NextResponse.json({ error: 'Không tải được danh sách network' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }
    if (!canManageNetworks(authUser.role)) {
      return NextResponse.json({ error: 'Chỉ admin được quản lý network' }, { status: 403 });
    }

    const data = await request.json();
    const name = String(data.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Thiếu tên network' }, { status: 400 });
    }

    const code = await generateUniqueNetworkCode(name);

    const network = await prisma.affiliateNetwork.create({
      data: {
        name,
        code,
        syncType: 'manual',
        logo: data.logo?.trim() || null,
        active: data.active !== false,
      },
    });
    return NextResponse.json(network, { status: 201 });
  } catch (error) {
    console.error('POST affiliate network:', error);
    return NextResponse.json({ error: 'Không tạo được network' }, { status: 500 });
  }
}
