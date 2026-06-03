import { LATE_AFTER_HOUR, LATE_AFTER_MINUTE } from './config';
import { isWeekend, parseDateKey, toDateKey } from './calendar';
import type { AttendanceDayStatus, AttendanceRecord, DaySummary } from './types';

export function formatAttendanceTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function formatAttendanceDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isLateCheckIn(checkIn: Date) {
  const limit = new Date(checkIn);
  limit.setHours(LATE_AFTER_HOUR, LATE_AFTER_MINUTE, 0, 0);
  return checkIn > limit;
}

export function deriveStatus(
  record: AttendanceRecord | undefined,
  dateKey: string,
  todayKey: string
): AttendanceDayStatus {
  const date = parseDateKey(dateKey);
  if (!date) return 'absent';
  if (isWeekend(date)) return 'weekend';
  if (!record?.checkIn) return dateKey > todayKey ? 'absent' : 'absent';

  if (record.checkOut || dateKey < todayKey) {
    return isLateCheckIn(new Date(record.checkIn)) ? 'late' : 'present';
  }

  return isLateCheckIn(new Date(record.checkIn)) ? 'late' : 'working';
}

export function statusLabel(status: AttendanceDayStatus) {
  const map: Record<AttendanceDayStatus, string> = {
    present: 'Đúng giờ',
    late: 'Đi muộn',
    absent: 'Vắng',
    working: 'Đang làm',
    leave: 'Nghỉ phép',
    weekend: 'Cuối tuần',
  };
  return map[status] || status;
}

export function statusClass(status: AttendanceDayStatus) {
  return `att-status att-status--${status}`;
}

export function buildDaySummary(
  userId: number,
  dateKey: string,
  records: AttendanceRecord[],
  todayKey = toDateKey(new Date())
): DaySummary {
  const record = records.find((r) => r.userId === userId && r.date === dateKey);
  const status = record?.status ?? deriveStatus(record, dateKey, todayKey);
  return {
    date: dateKey,
    status,
    checkIn: record?.checkIn,
    checkOut: record?.checkOut,
    record,
  };
}

export function countMonthStats(
  userId: number,
  year: number,
  month: number,
  records: AttendanceRecord[],
  today = new Date()
) {
  const todayKey = toDateKey(today);
  let present = 0;
  let late = 0;
  let absent = 0;
  const dim = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= dim; d++) {
    const date = new Date(year, month, d);
    if (isWeekend(date)) continue;
    const key = toDateKey(date);
    if (key > todayKey) continue;

    const summary = buildDaySummary(userId, key, records, todayKey);
    if (summary.status === 'present') present++;
    else if (summary.status === 'late' || summary.status === 'working') late++;
    else if (summary.status === 'absent') absent++;
  }

  return { present, late, absent };
}
