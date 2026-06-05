export type ReportStatus = 'DRAFT' | 'SUBMITTED';

export interface DailyReport {
  id: number;
  userId: number;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  date: string;
  content: string;
  planNext?: string;
  blockers?: string;
  status: ReportStatus;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportUserBrief {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
}

export interface TeamMemberReportRow {
  user: ReportUserBrief;
  todaySubmitted: boolean;
  todayReport: DailyReport | null;
  monthSubmitted: number;
  monthTotal: number;
}

export function reportStatusLabel(status: ReportStatus) {
  return status === 'SUBMITTED' ? 'Đã nộp' : 'Nháp';
}

export function reportStatusClass(status: ReportStatus) {
  return `rep-status rep-status--${status.toLowerCase()}`;
}

export function formatReportDate(dateKey: string) {
  const [y, m, d] = dateKey.split('-');
  if (!y || !m || !d) return dateKey;
  return `${d}/${m}/${y}`;
}

export function formatReportDateTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
