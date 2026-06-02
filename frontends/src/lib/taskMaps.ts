import type { TaskPriority, TaskStatus } from './types';

export const TASK_STATUS = {
  PENDING_ACCEPTANCE: 'PENDING_ACCEPTANCE',
  REJECTED_BY_ASSIGNEE: 'REJECTED_BY_ASSIGNEE',
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  REVIEW: 'REVIEW',
  DONE: 'DONE',
} as const;

export type TaskAction =
  | 'accept'
  | 'reject'
  | 'start'
  | 'submit'
  | 'approve'
  | 'reject_review';

export const KANBAN_TO_STATUS: Record<string, TaskStatus> = {
  todo: 'TODO',
  inprogress: 'IN_PROGRESS',
  review: 'REVIEW',
  done: 'DONE',
};

export const STATUS_TO_KANBAN: Record<string, string> = {
  TODO: 'todo',
  IN_PROGRESS: 'inprogress',
  REVIEW: 'review',
  DONE: 'done',
};

export const KANBAN_STATUS_LABELS: Record<string, string> = {
  todo: 'Cần làm',
  inprogress: 'Đang thực hiện',
  review: 'Đang review',
  done: 'Hoàn thành',
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING_ACCEPTANCE: 'Chờ xác nhận',
  REJECTED_BY_ASSIGNEE: 'Đã từ chối',
  TODO: 'Cần làm',
  IN_PROGRESS: 'Đang thực hiện',
  REVIEW: 'Đang review',
  DONE: 'Hoàn thành',
};

const LABEL_TO_PRIORITY: Record<string, TaskPriority> = {
  Thấp: 'LOW',
  'Trung bình': 'MEDIUM',
  Cao: 'HIGH',
};

export const PRIORITY_TO_LABEL: Record<string, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
};

export function priorityLabel(p: string): string {
  return PRIORITY_TO_LABEL[p] || p;
}

export function priorityCode(label: string): TaskPriority {
  return LABEL_TO_PRIORITY[label] || 'MEDIUM';
}

export function statusLabel(status: string): string {
  return TASK_STATUS_LABELS[status] || KANBAN_STATUS_LABELS[STATUS_TO_KANBAN[status] || ''] || status;
}

export function isKanbanStatus(status: string): boolean {
  return !!STATUS_TO_KANBAN[status];
}
