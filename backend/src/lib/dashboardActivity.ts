import { prisma } from '@/lib/prisma';
import type { AuthPayload } from './authRequest';
import { TASK_STATUS } from './taskStatus';

export type DashboardActivityKind =
  | 'task_assigned'
  | 'task_done'
  | 'task_review'
  | 'task_rejected'
  | 'cost_created'
  | 'cost_approved'
  | 'cost_canceled'
  | 'user_registered';

export interface DashboardActivity {
  id: string;
  kind: DashboardActivityKind;
  dotClass: 'indigo-bg' | 'purple-bg' | 'green-bg' | 'slate-bg';
  actor: string;
  text: string;
  detail: string;
  createdAt: string;
}

const userSelect = { id: true, name: true, role: true } as const;

function formatAmount(amount: number) {
  return `${amount.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} ₫`;
}

function taskActivitiesForUser(user: AuthPayload) {
  if (user.role === 'admin') return {};
  return {
    OR: [{ assignerId: user.id }, { assigneeId: user.id }],
  };
}

function costActivitiesForUser(user: AuthPayload) {
  if (user.role === 'admin') return {};
  return { userId: user.id };
}

export async function getRecentActivities(
  user: AuthPayload,
  limit = 12
): Promise<DashboardActivity[]> {
  const isAdmin = user.role === 'admin';
  const items: DashboardActivity[] = [];

  const [tasks, costs, users] = await Promise.all([
    prisma.task.findMany({
      where: taskActivitiesForUser(user),
      include: {
        assignee: { select: userSelect },
        assigner: { select: userSelect },
      },
      orderBy: { updatedAt: 'desc' },
      take: 40,
    }),
    prisma.cost.findMany({
      where: costActivitiesForUser(user),
      include: {
        creator: { select: userSelect },
        user: { select: userSelect },
        canceller: { select: userSelect },
      },
      orderBy: { updatedAt: 'desc' },
      take: 40,
    }),
    isAdmin
      ? prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
          take: 15,
          select: { id: true, name: true, status: true, createdAt: true, updatedAt: true },
        })
      : Promise.resolve([]),
  ]);

  for (const task of tasks) {
    const assigneeName = task.assignee?.name || '—';
    const assignerName = task.assigner?.name || '—';

    if (task.status === TASK_STATUS.DONE) {
      items.push({
        id: `task-done-${task.id}`,
        kind: 'task_done',
        dotClass: 'indigo-bg',
        actor: assigneeName,
        text: 'vừa hoàn thành công việc',
        detail: task.title,
        createdAt: task.updatedAt.toISOString(),
      });
      continue;
    }

    if (task.status === TASK_STATUS.REVIEW) {
      items.push({
        id: `task-review-${task.id}`,
        kind: 'task_review',
        dotClass: 'purple-bg',
        actor: assigneeName,
        text: 'nộp review công việc',
        detail: task.title,
        createdAt: task.updatedAt.toISOString(),
      });
      continue;
    }

    if (task.status === TASK_STATUS.REJECTED_BY_ASSIGNEE) {
      items.push({
        id: `task-reject-${task.id}`,
        kind: 'task_rejected',
        dotClass: 'slate-bg',
        actor: assigneeName,
        text: 'từ chối công việc',
        detail: task.title,
        createdAt: task.updatedAt.toISOString(),
      });
      continue;
    }

    const isNew =
      Math.abs(task.updatedAt.getTime() - task.createdAt.getTime()) < 60_000;
    if (task.status === TASK_STATUS.PENDING_ACCEPTANCE || isNew) {
      items.push({
        id: `task-assigned-${task.id}`,
        kind: 'task_assigned',
        dotClass: 'indigo-bg',
        actor: assignerName,
        text: `giao công việc cho ${assigneeName}`,
        detail: task.title,
        createdAt: task.createdAt.toISOString(),
      });
    }
  }

  for (const cost of costs) {
    if (cost.canceled) {
      items.push({
        id: `cost-canceled-${cost.id}`,
        kind: 'cost_canceled',
        dotClass: 'slate-bg',
        actor: cost.canceller?.name || cost.creator?.name || '—',
        text: 'hủy chi phí',
        detail: `${cost.type} — ${formatAmount(cost.amount)}`,
        createdAt: (cost.canceledAt ?? cost.updatedAt).toISOString(),
      });
      continue;
    }

    if (cost.approved) {
      items.push({
        id: `cost-approved-${cost.id}`,
        kind: 'cost_approved',
        dotClass: 'green-bg',
        actor: cost.user?.name || 'Admin',
        text: 'duyệt chi phí',
        detail: `${cost.type} — ${formatAmount(cost.amount)}`,
        createdAt: (cost.approvedAt ?? cost.updatedAt).toISOString(),
      });
      continue;
    }

    items.push({
      id: `cost-created-${cost.id}`,
      kind: 'cost_created',
      dotClass: 'slate-bg',
      actor: cost.creator?.name || '—',
      text: 'tạo chi phí chờ duyệt',
      detail: `${cost.type} — ${formatAmount(cost.amount)}`,
      createdAt: cost.createdAt.toISOString(),
    });
  }

  for (const u of users) {
    items.push({
      id: `user-reg-${u.id}`,
      kind: 'user_registered',
      dotClass: 'purple-bg',
      actor: u.name,
      text: 'đăng ký tài khoản mới',
      detail: u.status === 'PENDING' ? 'Đang chờ phê duyệt' : 'Đã duyệt',
      createdAt: u.createdAt.toISOString(),
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return items.slice(0, limit);
}
