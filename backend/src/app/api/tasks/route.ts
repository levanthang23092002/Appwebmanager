import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import { notifyTaskTransition } from '@/lib/taskNotify';
import { TASK_STATUS } from '@/lib/taskStatus';
import { getTaskWhereForScope, parseTaskScope } from '@/lib/taskScope';
import { prisma } from '@/lib/prisma';
import { emitTaskEvent } from '@/lib/taskEvents';

const userSelect = {
    id: true,
    name: true,
    email: true,
    avatar: true,
    role: true,
    telegram: true,
} as const;

export async function GET(request: Request) {
    try {
        const authUser = getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const scope = parseTaskScope(searchParams.get('scope')) ?? 'assigned';

        const where = getTaskWhereForScope(authUser, scope);
        if (where === null) {
            return NextResponse.json({ error: 'Không có quyền xem tất cả task' }, { status: 403 });
        }

        const lite = searchParams.get('lite') === '1';

        if (lite) {
            const tasks = await prisma.task.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    status: true,
                    deadline: true,
                    updatedAt: true,
                },
                orderBy: { updatedAt: 'desc' },
            });
            return NextResponse.json(tasks);
        }

        const tasks = await prisma.task.findMany({
            where,
            include: {
                assignee: { select: userSelect },
                assigner: { select: userSelect },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(tasks);
    } catch (error) {
        console.error('GET tasks Error:', error);
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();

        if (!data.title?.trim()) {
            return NextResponse.json({ error: 'Thiếu tên công việc' }, { status: 400 });
        }

        const assigneeId =
            data.assigneeId != null ? parseInt(String(data.assigneeId), 10) : null;
        const assignerId =
            data.assignerId != null ? parseInt(String(data.assignerId), 10) : null;

        if (!assigneeId || Number.isNaN(assigneeId)) {
            return NextResponse.json(
                { error: 'Thiếu người nhận việc (assigneeId)' },
                { status: 400 }
            );
        }

        if (!assignerId || Number.isNaN(assignerId)) {
            return NextResponse.json(
                { error: 'Thiếu người giao việc (assignerId) — người tạo task' },
                { status: 400 }
            );
        }

        const newTask = await prisma.task.create({
            data: {
                title: data.title.trim(),
                description: data.description?.trim() || null,
                status: TASK_STATUS.PENDING_ACCEPTANCE,
                priority: data.priority || 'MEDIUM',
                deadline: data.deadline ? new Date(data.deadline) : null,
                assigneeId,
                assignerId,
            },
            include: {
                assignee: { select: userSelect },
                assigner: { select: userSelect },
            },
        });

        if (newTask.assignee && newTask.assigner) {
            await notifyTaskTransition(
                {
                    title: newTask.title,
                    status: newTask.status,
                },
                newTask.assigner,
                newTask.assignee,
                'created'
            );
        }

        emitTaskEvent({ action: 'created', id: newTask.id });
        return NextResponse.json(newTask, { status: 201 });
    } catch (error) {
        console.error('POST tasks Error:', error);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
}
