import { NextResponse } from 'next/server';
import {
  accountOwnerFilter,
  canViewAccountCredentials,
  parseScope,
} from '@/lib/affiliateAccess';
import {
  decryptAffiliatePassword,
  encryptAffiliatePassword,
} from '@/lib/affiliateCrypto';
import { affiliateAccountInclude } from '@/lib/affiliateSelect';
import { getAuthUser } from '@/lib/authRequest';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }

    const scope = parseScope(request.url);
    const reveal = new URL(request.url).searchParams.get('reveal') === '1';
    const ownerFilter = accountOwnerFilter(authUser, scope);

    const accounts = await prisma.affiliateAccount.findMany({
      where: ownerFilter,
      include: affiliateAccountInclude,
      orderBy: { createdAt: 'desc' },
    });

    const mapped = accounts.map((acc) => {
      const canView = canViewAccountCredentials(authUser, acc.ownerId);
      return {
        id: acc.id,
        networkId: acc.networkId,
        ownerId: acc.ownerId,
        name: acc.name,
        loginEmail: acc.loginEmail,
        note: acc.note,
        dashboardUrl: acc.dashboardUrl,
        active: acc.active,
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt,
        network: acc.network,
        owner: acc.owner,
        hasPassword: !!acc.passwordEnc,
        ...(reveal && canView
          ? { password: decryptAffiliatePassword(acc.passwordEnc) }
          : {}),
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('GET affiliate accounts:', error);
    return NextResponse.json({ error: 'Không tải được danh sách account' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }

    const data = await request.json();
    const networkId = parseInt(String(data.networkId), 10);
    const name = String(data.name || '').trim();
    const loginEmail = String(data.loginEmail || '').trim().toLowerCase();
    const password = String(data.password || '');

    if (!Number.isFinite(networkId) || !name || !loginEmail || !password) {
      return NextResponse.json(
        { error: 'Thiếu network, tên account, email hoặc mật khẩu' },
        { status: 400 }
      );
    }

    const network = await prisma.affiliateNetwork.findFirst({
      where: { id: networkId, active: true },
    });
    if (!network) {
      return NextResponse.json({ error: 'Network không tồn tại hoặc đã tắt' }, { status: 400 });
    }

    const existing = await prisma.affiliateAccount.findUnique({
      where: { networkId_loginEmail: { networkId, loginEmail } },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Email này đã được dùng cho network này' },
        { status: 409 }
      );
    }

    const account = await prisma.affiliateAccount.create({
      data: {
        networkId,
        ownerId: authUser.id,
        name,
        loginEmail,
        passwordEnc: encryptAffiliatePassword(password),
        note: data.note?.trim() || null,
        dashboardUrl: data.dashboardUrl?.trim() || null,
        active: true,
      },
      include: affiliateAccountInclude,
    });

    return NextResponse.json(
      {
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
        hasPassword: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST affiliate account:', error);
    return NextResponse.json({ error: 'Không tạo được account' }, { status: 500 });
  }
}
