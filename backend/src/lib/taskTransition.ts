import { prisma } from '@/lib/prisma';
import type { AuthPayload } from './authRequest';
import { notifyTaskTransition } from './taskNotify';
import { TASK_STATUS, type TaskAction } from './taskStatus';

const userSelect = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  role: true,
  telegram: true,
} as const;

export async function applyTaskAction(
  taskId: number,
  authUser: AuthPayload,
  action: TaskAction,
  reason?: string
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: userSelect },
      assigner: { select: userSelect },
    },
  });

  if (!task || !task.assignee || !task.assigner) {
    throw new Error('TASK_NOT_FOUND');
  }

  const trimmedReason = reason?.trim() || '';
  let nextStatus = task.status;
  let nextRejectReason: string | null = task.rejectReason;
  let notifyEvent = '';

  const isAssignee = authUser.id === task.assigneeId;
  const isAssigner = authUser.id === task.assignerId;

  switch (action) {
    case 'accept':
      if (!isAssignee) throw new Error('FORBIDDEN');
      if (task.status !== TASK_STATUS.PENDING_ACCEPTANCE) throw new Error('INVALID_STATE');
      nextStatus = TASK_STATUS.TODO;
      nextRejectReason = null;
      notifyEvent = 'accepted';
      break;

    case 'reject':
      if (!isAssignee) throw new Error('FORBIDDEN');
      if (task.status !== TASK_STATUS.PENDING_ACCEPTANCE) throw new Error('INVALID_STATE');
      if (!trimmedReason) throw new Error('REASON_REQUIRED');
      nextStatus = TASK_STATUS.REJECTED_BY_ASSIGNEE;
      nextRejectReason = trimmedReason;
      notifyEvent = 'rejected_by_assignee';
      break;

    case 'start':
      if (!isAssignee) throw new Error('FORBIDDEN');
      if (task.status !== TASK_STATUS.TODO) throw new Error('INVALID_STATE');
      nextStatus = TASK_STATUS.IN_PROGRESS;
      notifyEvent = 'started';
      break;

    case 'submit':
      if (!isAssignee) throw new Error('FORBIDDEN');
      if (task.status !== TASK_STATUS.IN_PROGRESS) throw new Error('INVALID_STATE');
      nextStatus = TASK_STATUS.REVIEW;
      notifyEvent = 'submitted';
      break;

    case 'approve':
      if (!isAssigner) throw new Error('FORBIDDEN');
      if (task.status !== TASK_STATUS.REVIEW) throw new Error('INVALID_STATE');
      nextStatus = TASK_STATUS.DONE;
      nextRejectReason = null;
      notifyEvent = 'approved';
      break;

    case 'reject_review':
      if (!isAssigner) throw new Error('FORBIDDEN');
      if (task.status !== TASK_STATUS.REVIEW) throw new Error('INVALID_STATE');
      if (!trimmedReason) throw new Error('REASON_REQUIRED');
      nextStatus = TASK_STATUS.IN_PROGRESS;
      nextRejectReason = trimmedReason;
      notifyEvent = 'rejected_review';
      break;

    default:
      throw new Error('UNKNOWN_ACTION');
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: nextStatus,
      rejectReason: nextRejectReason,
    },
    include: {
      assignee: { select: userSelect },
      assigner: { select: userSelect },
    },
  });

  if (notifyEvent) {
    await notifyTaskTransition(
      {
        title: updated.title,
        status: updated.status,
        rejectReason: updated.rejectReason,
      },
      updated.assigner!,
      updated.assignee!,
      notifyEvent
    );
  }

  return updated;
}

/** Kéo thả Kanban — chỉ một số chuyển đổi hợp lệ */
export async function applyKanbanStatus(
  taskId: number,
  authUser: AuthPayload,
  targetStatus: string
) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error('TASK_NOT_FOUND');

  if (targetStatus === TASK_STATUS.IN_PROGRESS && task.status === TASK_STATUS.TODO) {
    return applyTaskAction(taskId, authUser, 'start');
  }
  if (targetStatus === TASK_STATUS.REVIEW && task.status === TASK_STATUS.IN_PROGRESS) {
    return applyTaskAction(taskId, authUser, 'submit');
  }
  if (targetStatus === TASK_STATUS.DONE && task.status === TASK_STATUS.REVIEW) {
    return applyTaskAction(taskId, authUser, 'approve');
  }

  // Cho phép assignee kéo ngược IN_PROGRESS từ REVIEW chỉ qua reject_review (không kéo)
  if (
    authUser.id === task.assigneeId &&
    task.status === TASK_STATUS.TODO &&
    targetStatus === TASK_STATUS.IN_PROGRESS
  ) {
    return applyTaskAction(taskId, authUser, 'start');
  }

  throw new Error('INVALID_TRANSITION');
}
