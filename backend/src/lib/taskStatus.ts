/** Trạng thái workflow công việc */
export const TASK_STATUS = {
  PENDING_ACCEPTANCE: 'PENDING_ACCEPTANCE',
  REJECTED_BY_ASSIGNEE: 'REJECTED_BY_ASSIGNEE',
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  REVIEW: 'REVIEW',
  DONE: 'DONE',
} as const;

export type TaskStatusValue = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING_ACCEPTANCE: 'Chờ xác nhận',
  REJECTED_BY_ASSIGNEE: 'Đã từ chối (người nhận)',
  TODO: 'Cần làm',
  IN_PROGRESS: 'Đang thực hiện',
  REVIEW: 'Đang review',
  DONE: 'Hoàn thành',
};

export type TaskAction =
  | 'accept'
  | 'reject'
  | 'start'
  | 'submit'
  | 'approve'
  | 'reject_review';
