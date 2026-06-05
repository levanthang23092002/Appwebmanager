import type { AttendanceWorkHours } from '@/lib/attendance/attendanceSettings';

export type AttendanceStatus = 'present' | 'late' | 'working' | 'absent';

function isLateCheckIn(checkIn: Date, settings: AttendanceWorkHours) {
    const limit = new Date(checkIn);
    limit.setHours(settings.workStartHour, settings.workStartMinute, 0, 0);
    return checkIn > limit;
}

export function deriveAttendanceStatus(
    checkIn: Date | null | undefined,
    checkOut: Date | null | undefined,
    isToday: boolean,
    settings: AttendanceWorkHours
): AttendanceStatus {
    if (!checkIn) return 'absent';
    if (!checkOut) {
        return isToday
            ? isLateCheckIn(checkIn, settings)
                ? 'late'
                : 'working'
            : isLateCheckIn(checkIn, settings)
              ? 'late'
              : 'present';
    }
    return isLateCheckIn(checkIn, settings) ? 'late' : 'present';
}
