import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { USER_STATUS, parseId } from '@/lib/userStatus';
import { emitNotificationEvent } from '@/lib/notificationEvents';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const { id: idStr } = await params;
        const id = parseId(idStr);
        if (id === null) {
            return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
        }

        const data = await request.json();

        if (data.status === USER_STATUS.APPROVED) {
            const existing = await prisma.user.findUnique({ where: { id } });
            if (!existing) {
                return NextResponse.json({ error: 'Không tìm thấy user' }, { status: 404 });
            }
            const nextSalary =
                data.salary !== undefined ? parseFloat(String(data.salary)) || 0 : existing.salary;
            if (existing.status === USER_STATUS.PENDING && nextSalary <= 0) {
                return NextResponse.json(
                    { error: 'Cần nhập lương trước khi duyệt tài khoản' },
                    { status: 400 }
                );
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                ...(data.role !== undefined && { role: data.role }),
                ...(data.salary !== undefined && { salary: parseFloat(data.salary) || 0 }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.telegram !== undefined && {
                    telegram: data.telegram?.trim() || null,
                }),
                ...(data.avatar !== undefined && {
                    avatar: data.avatar?.trim() || null,
                }),
                ...(data.name !== undefined && {
                    name: String(data.name).trim(),
                }),
            }
        });

        const { password: _, ...safe } = updatedUser;
        emitNotificationEvent();
        return NextResponse.json(safe, { status: 200 });
    } catch (error) {
        console.error("PATCH User Error:", error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id: idStr } = await params;
        const id = parseId(idStr);
        if (id === null) {
            return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
        }

        await prisma.user.delete({ where: { id } });

        return NextResponse.json({ message: 'Xóa user thành công' }, { status: 200 });
    } catch (error) {
        console.error("DELETE User Error:", error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
