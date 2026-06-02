import type { AuthPayload } from './authRequest';
import type { Prisma } from '@prisma/client';

export type TaskScopeParam = 'assigned' | 'received' | 'all';

export function parseTaskScope(raw: string | null): TaskScopeParam | null {
  if (raw === 'assigned' || raw === 'received' || raw === 'all') return raw;
  return null;
}

/**
 * - assigned (Đã giao): assignerId = user — Staff, Manager, Admin
 * - received (Được giao): assigneeId = user — Staff, Manager, Admin
 * - all: toàn hệ thống — chỉ Admin
 */
export function getTaskWhereForScope(
  user: AuthPayload,
  scope: TaskScopeParam
): Prisma.TaskWhereInput | null {
  if (scope === 'all') {
    if (user.role !== 'admin') return null;
    return {};
  }
  if (scope === 'received') {
    return { assigneeId: user.id };
  }
  return { assignerId: user.id };
}
