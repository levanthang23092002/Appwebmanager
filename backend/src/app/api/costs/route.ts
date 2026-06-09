import { NextResponse } from 'next/server';
import { normalizeCurrency, normalizeUsdVndRate } from '@/lib/currency';
import { getAuthUser } from '@/lib/authRequest';
import { notifyCostCreatedToAdmins } from '@/lib/costNotify';
import { emitCostEvent } from '@/lib/costEvents';
import { getFinanceSettings } from '@/lib/financeSettings';
import { prisma } from '@/lib/prisma';

const userSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
} as const;

export async function GET(request: Request) {
    try {
        const authUser = getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
        }

        const costs = await prisma.cost.findMany({
            where: authUser.role === 'admin' ? undefined : { userId: authUser.id },
            include: {
                creator: { select: userSelect },
                user: { select: userSelect },
                canceller: { select: userSelect },
            },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(costs);
    } catch (error) {
        console.error('GET costs Error:', error);
        return NextResponse.json({ error: 'Failed to fetch costs' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const authUser = getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
        }

        const data = await request.json();
        const type = String(data.type || '').trim();
        const amount = parseFloat(String(data.amount));

        if (!type) {
            return NextResponse.json({ error: 'Thiếu loại chi phí' }, { status: 400 });
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json({ error: 'Số tiền phải lớn hơn 0' }, { status: 400 });
        }

        let createdAt = new Date();
        if (data.costDate) {
            const parsed = new Date(data.costDate);
            if (Number.isFinite(parsed.getTime())) {
                createdAt = parsed;
            }
        }

        const settings = await getFinanceSettings();
        const currency = normalizeCurrency(data.currency, 'VND');
        const usdVndRate = normalizeUsdVndRate(data.usdVndRate, settings.usdVndRate);

        const autoApproved = authUser.role === 'admin';
        const newCost = await prisma.cost.create({
            data: {
                type,
                amount,
                currency,
                usdVndRate,
                description: data.description?.trim() || null,
                createdAt,
                approved: autoApproved,
                approvedAt: autoApproved ? new Date() : null,
                canceled: false,
                canceledAt: null,
                userId: authUser.id,
                approverId: autoApproved ? authUser.id : null,
                cancellerId: null,
            },
            include: {
                creator: { select: userSelect },
                user: { select: userSelect },
                canceller: { select: userSelect },
            },
        });
        if (!autoApproved) {
            await notifyCostCreatedToAdmins(newCost);
        }
        emitCostEvent({ action: autoApproved ? 'approved' : 'created', id: newCost.id });
        return NextResponse.json(newCost, { status: 201 });
    } catch (error) {
        console.error('POST costs Error:', error);
        return NextResponse.json({ error: 'Failed to create cost record' }, { status: 500 });
    }
}
