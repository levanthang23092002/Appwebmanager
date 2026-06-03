const ATTENDANCE_TZ = 'Asia/Ho_Chi_Minh';

export function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Hôm nay theo giờ VN — khớp backend */
export function todayDateKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ATTENDANCE_TZ }).format(new Date());
}

export function toDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ATTENDANCE_TZ }).format(date);
}

export function parseDateKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1);
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** Thứ Hai = 0 … Chủ nhật = 6 */
export function mondayBasedWeekday(date: Date) {
  return (date.getDay() + 6) % 7;
}

export function isWeekend(date: Date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

export function monthLabel(year: number, month: number) {
  return `Tháng ${month + 1}/${year}`;
}

export interface CalendarCell {
  date: string | null;
  day: number | null;
  isToday: boolean;
  isWeekend: boolean;
  inMonth: boolean;
}

export function buildMonthGrid(year: number, month: number, todayKey = todayDateKey()): CalendarCell[] {
  const first = startOfMonth(year, month);
  const total = daysInMonth(year, month);
  const startPad = mondayBasedWeekday(first);
  const cells: CalendarCell[] = [];

  for (let i = 0; i < startPad; i++) {
    cells.push({ date: null, day: null, isToday: false, isWeekend: false, inMonth: false });
  }

  for (let d = 1; d <= total; d++) {
    const date = new Date(year, month, d);
    const key = `${year}-${pad(month + 1)}-${pad(d)}`;
    cells.push({
      date: key,
      day: d,
      isToday: key === todayKey,
      isWeekend: isWeekend(date),
      inMonth: true,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: null, day: null, isToday: false, isWeekend: false, inMonth: false });
  }

  return cells;
}

export function countWorkdaysInMonth(year: number, month: number, untilDay?: number) {
  const total = daysInMonth(year, month);
  const end = untilDay ?? total;
  let n = 0;
  for (let d = 1; d <= end; d++) {
    const date = new Date(year, month, d);
    if (!isWeekend(date)) n++;
  }
  return n;
}
