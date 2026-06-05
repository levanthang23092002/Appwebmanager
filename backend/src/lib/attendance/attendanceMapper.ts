import { toDateKey } from '@/lib/attendance/attendanceDate';
import type { AttendanceWorkHours } from '@/lib/attendance/attendanceSettings';
import { deriveAttendanceStatus } from '@/lib/attendance/attendanceStatus';

type Row = {
    id: number;
    userId: number;
    date: Date;
    checkIn: Date | null;
    checkOut: Date | null;
    checkInSsid: string | null;
    checkOutSsid: string | null;
    user?: { name: string } | null;
};

export function mapAttendanceRow(row: Row, todayKey: string, settings: AttendanceWorkHours) {
    const dateKey = toDateKey(row.date);
    const isToday = dateKey === todayKey;
    const status = deriveAttendanceStatus(row.checkIn, row.checkOut, isToday, settings);
    return {
        id: row.id,
        userId: row.userId,
        userName: row.user?.name ?? '',
        date: dateKey,
        checkIn: row.checkIn?.toISOString() ?? undefined,
        checkOut: row.checkOut?.toISOString() ?? undefined,
        checkInSsid: row.checkInSsid ?? undefined,
        checkOutSsid: row.checkOutSsid ?? undefined,
        status,
        wifiVerified: true,
    };
}
