import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import { emitCostEvent } from '@/lib/costEvents';
import { prisma } from '@/lib/prisma';

const userSelect = {
    id: true,
    name: true,
    email: true,
    avatar: true,
    role: true,
} as const;

type RouteCtx = { params: Promise<{ id: string }> };

function parseCostId(id: string) {
    const costId = parseInt(id, 10);
    return Number.isNaN(costId) ? null : costId;
}

export async function PATCH(request: Request, context: RouteCtx) {
    try {
        const authUser = getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
        }

        const { id } = await context.params;
        const costId = parseCostId(id);
        if (!costId) {
            return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
        }

        const cost = await prisma.cost.findUnique({ where: { id: costId } });
        if (!cost) {
            return NextResponse.json({ error: 'Chi phí không tồn tại' }, { status: 404 });
        }
        if (cost.approved) {
            return NextResponse.json(
                { error: 'Chi phí đã được duyệt, không thể chỉnh sửa' },
                { status: 403 }
            );
        }
        if (cost.canceled) {
            return NextResponse.json(
                { error: 'Chi phí đã hủy, không thể chỉnh sửa' },
                { status: 403 }
            );
        }

        const data = await request.json();
        if (data.approved === true || data.action === 'approve') {
            if (authUser.role !== 'admin') {
                return NextResponse.json({ error: 'Chỉ admin được duyệt chi phí' }, { status: 403 });
            }

            const updated = await prisma.cost.update({
                where: { id: costId },
                data: {
                    approved: true,
                    approvedAt: new Date(),
                    approverId: authUser.id,
                },
                include: {
                    creator: { select: userSelect },
                    user: { select: userSelect },
                    canceller: { select: userSelect },
                },
            });
            emitCostEvent({ action: 'approved', id: updated.id });
            return NextResponse.json(updated);
        }

        if (authUser.id !== cost.userId) {
            return NextResponse.json({ error: 'Không có quyền chỉnh sửa chi phí này' }, { status: 403 });
        }

        const updateData: {
            type?: string;
            amount?: number;
            description?: string | null;
        } = {};

        if (data.type != null) {
            const type = String(data.type).trim();
            if (!type) {
                return NextResponse.json({ error: 'Thiếu loại chi phí' }, { status: 400 });
            }
            updateData.type = type;
        }
        if (data.amount != null) {
            const amount = parseFloat(String(data.amount));
            if (!Number.isFinite(amount) || amount <= 0) {
                return NextResponse.json({ error: 'Số tiền phải lớn hơn 0' }, { status: 400 });
            }
            updateData.amount = amount;
        }
        if (data.description !== undefined) {
            updateData.description = data.description?.trim() || null;
        }

        const updated = await prisma.cost.update({
            where: { id: costId },
            data: updateData,
            include: {
                creator: { select: userSelect },
                user: { select: userSelect },
                canceller: { select: userSelect },
            },
        });
        emitCostEvent({ action: 'updated', id: updated.id });
        return NextResponse.json(updated);
    } catch (error) {
        console.error('PATCH cost Error:', error);
        return NextResponse.json({ error: 'Failed to update cost record' }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: RouteCtx) {
    try {
        const authUser = getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
        }

        const { id } = await context.params;
        const costId = parseCostId(id);
        if (!costId) {
            return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
        }

        const cost = await prisma.cost.findUnique({ where: { id: costId } });
        if (!cost) {
            return NextResponse.json({ error: 'Chi phí không tồn tại' }, { status: 404 });
        }
        if (cost.approved) {
            return NextResponse.json(
                { error: 'Chi phí đã được duyệt, không thể hủy' },
                { status: 403 }
            );
        }
        if (cost.canceled) {
            return NextResponse.json(
                { error: 'Chi phí đã hủy trước đó' },
                { status: 403 }
            );
        }
        if (authUser.role !== 'admin') {
            return NextResponse.json({ error: 'Chỉ admin được hủy chi phí' }, { status: 403 });
        }

        const updated = await prisma.cost.update({
            where: { id: costId },
            data: {
                canceled: true,
                canceledAt: new Date(),
                cancellerId: authUser.id,
            },
            include: {
                creator: { select: userSelect },
                user: { select: userSelect },
                canceller: { select: userSelect },
            },
        });
        emitCostEvent({ action: 'canceled', id: updated.id });
        return NextResponse.json(updated);
    } catch (error) {
        console.error('DELETE cost Error:', error);
        return NextResponse.json({ error: 'Failed to delete cost record' }, { status: 500 });
    }
}
