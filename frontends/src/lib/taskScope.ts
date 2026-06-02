import type { UserRole } from './types';

export type TaskScope = 'assigned' | 'received' | 'all';

export const TASK_SCOPE_LABELS: Record<TaskScope, string> = {
  assigned: 'Đã giao',
  received: 'Được giao',
  all: 'Tất cả task',
};

export const TASK_SCOPE_PAGE_TITLES: Record<TaskScope, string> = {
  assigned: 'Công việc đã giao',
  received: 'Công việc được giao',
  all: 'Tất cả công việc hệ thống',
};

/** Mô tả quyền xem — đồng bộ với API GET /api/tasks?scope= */
export const TASK_SCOPE_HINTS: Record<TaskScope, string> = {
  assigned: 'Task do bạn giao (người giao là bạn).',
  received: 'Task giao cho bạn (người nhận là bạn).',
  all: 'Toàn bộ task của hệ thống (chỉ Admin).',
};

export function parseTaskScope(raw: string | undefined): TaskScope | null {
  if (raw === 'assigned' || raw === 'received' || raw === 'all') return raw;
  return null;
}

export function taskNavItems(role: UserRole): { to: string; label: string; scope: TaskScope }[] {
  const items: { to: string; label: string; scope: TaskScope }[] = [
    { to: '/tasks/assigned', label: 'Đã giao', scope: 'assigned' },
    { to: '/tasks/received', label: 'Được giao', scope: 'received' },
  ];
  if (role === 'admin') {
    items.push({ to: '/tasks/all', label: 'Tất cả task', scope: 'all' });
  }
  return items;
}
