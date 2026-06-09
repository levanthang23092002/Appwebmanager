import { prisma } from '@/lib/prisma';
import type { AuthPayload } from './authRequest';
import { REPORT_STATUS } from './reports/reportMapper';
import { TASK_STATUS } from './taskStatus';

export type NotificationKind =
  | 'cost_approve'
  | 'user_approve'
  | 'task_accept'
  | 'task_do'
  | 'task_review'
  | 'report_submit';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  href: string;
  createdAt: string;
  entityId: number;
}

function formatAmount(amount: number) {
  return `${amount.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} ₫`;
}

export async function getNotificationsForUser(user: AuthPayload): Promise<AppNotification[]> {
  const items: AppNotification[] = [];

  if (user.role === 'admin') {
    const [pendingCosts, pendingUsers, recentReports] = await Promise.all([
      prisma.cost.findMany({
        where: { approved: false, canceled: false },
        include: { creator: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.user.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.dailyReport.findMany({
        where: {
          status: REPORT_STATUS.SUBMITTED,
          submittedAt: { not: null },
        },
        include: { user: { select: { name: true } } },
        orderBy: { submittedAt: 'desc' },
        take: 30,
      }),
    ]);

    for (const cost of pendingCosts) {
      items.push({
        id: `cost-${cost.id}`,
        kind: 'cost_approve',
        title: 'Chi phí chờ duyệt',
        message: `${cost.type} — ${formatAmount(cost.amount)}${
          cost.creator?.name ? ` · ${cost.creator.name}` : ''
        }`,
        href: '/costs',
        createdAt: cost.createdAt.toISOString(),
        entityId: cost.id,
      });
    }

    for (const u of pendingUsers) {
      items.push({
        id: `user-${u.id}`,
        kind: 'user_approve',
        title: 'Tài khoản mới',
        message: `${u.name} (${u.email}) cần phê duyệt`,
        href: '/hr',
        createdAt: u.createdAt.toISOString(),
        entityId: u.id,
      });
    }

    for (const report of recentReports) {
      items.push({
        id: `report-${report.id}`,
        kind: 'report_submit',
        title: 'Báo cáo cuối ngày',
        message: `${report.user.name} đã nộp báo cáo`,
        href: '/reports',
        createdAt: report.submittedAt!.toISOString(),
        entityId: report.id,
      });
    }
  }

  const [assigneeTasks, reviewTasks] = await Promise.all([
    prisma.task.findMany({
      where: {
        assigneeId: user.id,
        status: {
          in: [TASK_STATUS.PENDING_ACCEPTANCE, TASK_STATUS.TODO, TASK_STATUS.IN_PROGRESS],
        },
      },
      include: { assigner: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 40,
    }),
    prisma.task.findMany({
      where: {
        assignerId: user.id,
        status: TASK_STATUS.REVIEW,
      },
      include: { assignee: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    }),
  ]);

  for (const task of assigneeTasks) {
    if (task.status === TASK_STATUS.PENDING_ACCEPTANCE) {
      items.push({
        id: `task-${task.id}-accept`,
        kind: 'task_accept',
        title: 'Công việc chờ xác nhận',
        message: `「${task.title}」— giao bởi ${task.assigner?.name || '—'}`,
        href: '/tasks/received',
        createdAt: task.updatedAt.toISOString(),
        entityId: task.id,
      });
    } else if (task.status === TASK_STATUS.TODO) {
      items.push({
        id: `task-${task.id}-do`,
        kind: 'task_do',
        title: 'Công việc cần làm',
        message: `「${task.title}」— cần bắt đầu thực hiện`,
        href: '/tasks/received',
        createdAt: task.updatedAt.toISOString(),
        entityId: task.id,
      });
    } else if (task.status === TASK_STATUS.IN_PROGRESS) {
      items.push({
        id: `task-${task.id}-do`,
        kind: 'task_do',
        title: 'Công việc đang thực hiện',
        message: `「${task.title}」— nộp review khi hoàn thành`,
        href: '/tasks/received',
        createdAt: task.updatedAt.toISOString(),
        entityId: task.id,
      });
    }
  }

  for (const task of reviewTasks) {
    items.push({
      id: `task-${task.id}-review`,
      kind: 'task_review',
      title: 'Công việc chờ duyệt review',
      message: `「${task.title}」— ${task.assignee?.name || '—'} đã nộp`,
      href: '/tasks/assigned',
      createdAt: task.updatedAt.toISOString(),
      entityId: task.id,
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return items;
}
