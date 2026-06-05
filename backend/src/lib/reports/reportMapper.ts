import { storageDateToDateKey } from '@/lib/attendance/attendanceDate';

export const REPORT_STATUS = {
    DRAFT: 'DRAFT',
    SUBMITTED: 'SUBMITTED',
} as const;

export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

type Row = {
    id: number;
    userId: number;
    date: Date;
    content: string;
    planNext: string | null;
    blockers: string | null;
    status: string;
    submittedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    user?: { id: number; name: string; email?: string; avatar?: string | null } | null;
};

export function mapDailyReportRow(row: Row) {
    return {
        id: row.id,
        userId: row.userId,
        userName: row.user?.name ?? '',
        userEmail: row.user?.email,
        userAvatar: row.user?.avatar ?? undefined,
        date: storageDateToDateKey(row.date),
        content: row.content,
        planNext: row.planNext ?? undefined,
        blockers: row.blockers ?? undefined,
        status: row.status as ReportStatus,
        submittedAt: row.submittedAt?.toISOString(),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function normalizeReportContent(value: unknown, required = false): string | null {
    const text = String(value ?? '').trim();
    if (!text) return required ? null : '';
    return text;
}
