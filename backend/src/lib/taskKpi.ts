import { TASK_STATUS } from '@/lib/taskStatus';

export interface TaskKpiInput {
  deadline: Date | string | null;
  status: string;
  updatedAt: Date | string;
}

export interface TaskKpiResult {
  /** 0–100; 0 khi chưa có CV hết hạn để tính */
  percent: number;
  onTimeCount: number;
  expiredCount: number;
  notExpiredCount: number;
  hasScore: boolean;
}

export function endOfDeadlineDay(deadline: Date): Date {
  return new Date(
    deadline.getFullYear(),
    deadline.getMonth(),
    deadline.getDate(),
    23,
    59,
    59,
    999
  );
}

export function isDeadlineExpired(deadline: Date, now = new Date()): boolean {
  return now.getTime() > endOfDeadlineDay(deadline).getTime();
}

export function isTaskCompletedOnTime(
  task: Pick<TaskKpiInput, 'status' | 'updatedAt'>,
  deadline: Date
): boolean {
  if (task.status !== TASK_STATUS.DONE) return false;
  const completedAt = new Date(task.updatedAt);
  if (Number.isNaN(completedAt.getTime())) return false;
  return completedAt.getTime() <= endOfDeadlineDay(deadline).getTime();
}

/** KPI = (CV hết hạn & hoàn thành đúng hạn) / (tổng CV đã hết hạn). CV còn hạn không tính. */
export function computeTaskKpi(tasks: TaskKpiInput[], now = new Date()): TaskKpiResult {
  let onTimeCount = 0;
  let expiredCount = 0;
  let notExpiredCount = 0;

  for (const task of tasks) {
    if (!task.deadline) continue;
    if (task.status === TASK_STATUS.REJECTED_BY_ASSIGNEE) continue;

    const deadline = new Date(task.deadline);
    if (Number.isNaN(deadline.getTime())) continue;

    if (!isDeadlineExpired(deadline, now)) {
      notExpiredCount += 1;
      continue;
    }

    expiredCount += 1;
    if (isTaskCompletedOnTime(task, deadline)) {
      onTimeCount += 1;
    }
  }

  const hasScore = expiredCount > 0;
  const percent = hasScore ? Math.round((onTimeCount / expiredCount) * 100) : 0;

  return {
    percent,
    onTimeCount,
    expiredCount,
    notExpiredCount,
    hasScore,
  };
}
