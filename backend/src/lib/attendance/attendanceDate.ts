/** Múi giờ chấm công (Việt Nam) */
export const ATTENDANCE_TZ = process.env.ATTENDANCE_TIMEZONE || 'Asia/Ho_Chi_Minh';

function pad(n: number) {
    return String(n).padStart(2, '0');
}

/** YYYY-MM-DD theo giờ VN */
export function todayDateKey(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: ATTENDANCE_TZ }).format(new Date());
}

/** Chuyển YYYY-MM-DD → Date lưu DB (giữa trưa UTC, tránh lệch ngày) */
export function dateKeyToStorageDate(dateKey: string): Date {
    const [y, m, d] = dateKey.split('-').map(Number);
    if (!y || !m || !d) return new Date(`${dateKey}T12:00:00.000Z`);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

/** Đọc Date từ DB → YYYY-MM-DD */
export function storageDateToDateKey(date: Date): string {
    const y = date.getUTCFullYear();
    const m = pad(date.getUTCMonth() + 1);
    const d = pad(date.getUTCDate());
    return `${y}-${m}-${d}`;
}

/** @deprecated dùng todayDateKey + dateKeyToStorageDate */
export function startOfToday(): Date {
    return dateKeyToStorageDate(todayDateKey());
}

export function toDateKey(date: Date): string {
    return storageDateToDateKey(date);
}

export function parseYearMonth(searchParams: URLSearchParams) {
    const todayKey = todayDateKey();
    const [y, m] = todayKey.split('-').map(Number);
    const year = parseInt(searchParams.get('year') || String(y), 10);
    const month = parseInt(searchParams.get('month') || String(m), 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
        return null;
    }
    return { year, month: month - 1 };
}

export function monthRange(year: number, monthIndex: number) {
    const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const startKey = `${year}-${pad(monthIndex + 1)}-01`;
    const endKey = `${year}-${pad(monthIndex + 1)}-${pad(lastDay)}`;
    return {
        start: dateKeyToStorageDate(startKey),
        end: dateKeyToStorageDate(endKey),
    };
}
