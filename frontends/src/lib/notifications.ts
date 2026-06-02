export type NotificationKind =
  | 'cost_approve'
  | 'user_approve'
  | 'task_accept'
  | 'task_do'
  | 'task_review';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  href: string;
  createdAt: string;
  entityId: number;
}

export interface NotificationsResponse {
  items: AppNotification[];
  count: number;
}

export const NOTIFICATION_ICONS: Record<NotificationKind, string> = {
  cost_approve: 'bx-wallet',
  user_approve: 'bx-user-plus',
  task_accept: 'bx-user-check',
  task_do: 'bx-task',
  task_review: 'bx-check-shield',
};

export function formatNotificationTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}
