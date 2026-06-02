import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import { emitTaskEvent } from '@/lib/taskEvents';
import { applyKanbanStatus } from '@/lib/taskTransition';
import { prisma } from '@/lib/prisma';

const userSelect = {
    id: true,
    name: true,
    email: true,
    avatar: true,
    role: true,
    telegram: true,
} as const;

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteCtx) {
    try {
        const authUser = getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
        }

        const { id } = await context.params;
        const taskId = parseInt(id, 10);
        if (Number.isNaN(taskId)) {
            return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
        }

        const data = await request.json();

        if (data.status != null && !data.title && data.assigneeId == null) {
            try {
                const updated = await applyKanbanStatus(
                    taskId,
                    authUser,
                    String(data.status)
                );
                emitTaskEvent({ action: 'transitioned', id: updated.id });
                return NextResponse.json(updated);
            } catch (error) {
                const msg = error instanceof Error ? error.message : '';
                if (msg === 'FORBIDDEN') {
                    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
                }
                if (msg === 'INVALID_TRANSITION' || msg === 'INVALID_STATE') {
                    return NextResponse.json(
                        { error: 'Chuyển trạng thái không hợp lệ. Dùng các nút thao tác trên thẻ.' },
                        { status: 400 }
                    );
                }
                throw error;
            }
        }

        const updateData: Record<string, unknown> = {};

        if (data.title != null) updateData.title = String(data.title).trim();
        if (data.description != null) updateData.description = data.description?.trim() || null;
        if (data.priority != null) updateData.priority = data.priority;
        if (data.deadline !== undefined) {
            updateData.deadline = data.deadline ? new Date(data.deadline) : null;
        }
        if (data.assigneeId != null) {
            updateData.assigneeId = parseInt(String(data.assigneeId), 10);
        }

        const updated = await prisma.task.update({
            where: { id: taskId },
            data: updateData,
            include: {
                assignee: { select: userSelect },
                assigner: { select: userSelect },
            },
        });
        emitTaskEvent({ action: 'updated', id: updated.id });
        return NextResponse.json(updated);
    } catch (error) {
        console.error('PATCH task Error:', error);
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }
}

export async function DELETE(_request: Request, context: RouteCtx) {
    try {
        const { id } = await context.params;
        const taskId = parseInt(id, 10);
        if (Number.isNaN(taskId)) {
            return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
        }

        await prisma.task.delete({ where: { id: taskId } });
        emitTaskEvent({ action: 'deleted', id: taskId });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE task Error:', error);
        return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }
}
