const LATE_HOUR = parseInt(process.env.ATTENDANCE_LATE_HOUR || '9', 10);
const LATE_MINUTE = parseInt(process.env.ATTENDANCE_LATE_MINUTE || '0', 10);

export type AttendanceStatus = 'present' | 'late' | 'working' | 'absent';

function isLate(checkIn: Date) {
    const limit = new Date(checkIn);
    limit.setHours(LATE_HOUR, LATE_MINUTE, 0, 0);
    return checkIn > limit;
}

export function deriveAttendanceStatus(
    checkIn: Date | null | undefined,
    checkOut: Date | null | undefined,
    isToday: boolean
): AttendanceStatus {
    if (!checkIn) return 'absent';
    if (!checkOut) {
        return isToday ? (isLate(checkIn) ? 'late' : 'working') : isLate(checkIn) ? 'late' : 'present';
    }
    return isLate(checkIn) ? 'late' : 'present';
}
