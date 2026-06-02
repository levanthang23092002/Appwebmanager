import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import { emitTaskEvent } from '@/lib/taskEvents';
import { applyTaskAction } from '@/lib/taskTransition';
import type { TaskAction } from '@/lib/taskStatus';

type RouteCtx = { params: Promise<{ id: string }> };

const VALID_ACTIONS: TaskAction[] = [
  'accept',
  'reject',
  'start',
  'submit',
  'approve',
  'reject_review',
];

export async function POST(request: Request, context: RouteCtx) {
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

    const body = await request.json();
    const action = body.action as TaskAction;
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
    }

    const updated = await applyTaskAction(taskId, authUser, action, body.reason);
    emitTaskEvent({ action: 'transitioned', id: updated.id });
    return NextResponse.json(updated);
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Không có quyền thực hiện' }, { status: 403 });
    }
    if (msg === 'REASON_REQUIRED') {
      return NextResponse.json({ error: 'Vui lòng nhập lý do' }, { status: 400 });
    }
    if (msg === 'INVALID_STATE' || msg === 'INVALID_TRANSITION') {
      return NextResponse.json({ error: 'Không thể chuyển trạng thái lúc này' }, { status: 400 });
    }
    if (msg === 'TASK_NOT_FOUND') {
      return NextResponse.json({ error: 'Không tìm thấy task' }, { status: 404 });
    }
    console.error('POST task action Error:', error);
    return NextResponse.json({ error: 'Thao tác thất bại' }, { status: 500 });
  }
}
