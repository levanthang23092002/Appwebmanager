export type UserRole = 'staff' | 'manager' | 'admin';
export type UserStatus = 'PENDING' | 'APPROVED' | 'LOCKED';

export interface UserBrief {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
  role?: UserRole;
}

export interface UserTaskKpi {
  percent: number;
  onTime: number;
  expired: number;
  notExpired: number;
  hasScore: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  telegram?: string | null;
  avatar?: string | null;
  salary?: number;
  createdAt?: string;
  updatedAt?: string;
  taskKpi?: UserTaskKpi;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  telegram?: string | null;
  avatar?: string | null;
}

export interface EmployeeCard {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  telegramLinked: boolean;
  joinDate: string;
  salary: number;
  avatar: string;
  kpi: number;
  kpiOnTime: number;
  kpiExpired: number;
  kpiNotExpired: number;
  kpiHasScore: boolean;
}

export type TaskStatus =
  | 'PENDING_ACCEPTANCE'
  | 'REJECTED_BY_ASSIGNEE'
  | 'TODO'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface TaskItem {
  id: number;
  title: string;
  description?: string | null;
  status: TaskStatus | string;
  priority: TaskPriority | string;
  deadline?: string | null;
  assigneeId?: number | null;
  assignerId?: number | null;
  assignee?: UserBrief | null;
  assigner?: UserBrief | null;
  rejectReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CostRecord {
  id: number;
  type: string;
  amount: number;
  description?: string | null;
  approved: boolean;
  approvedAt?: string | null;
  canceled?: boolean;
  canceledAt?: string | null;
  userId?: number | null;
  creator?: UserBrief | null;
  approverId?: number | null;
  user?: UserBrief | null;
  cancellerId?: number | null;
  canceller?: UserBrief | null;
  createdAt?: string;
  updatedAt?: string;
}
