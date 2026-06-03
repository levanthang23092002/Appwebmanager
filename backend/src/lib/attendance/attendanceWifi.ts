import { prisma } from '@/lib/prisma';

export function normalizeSsid(ssid: unknown): string {
    return String(ssid ?? '').trim();
}

/** Chỉ lấy từ bảng CompanyWifi (active) */
export async function getAllowedSsids(): Promise<string[]> {
    const rows = await prisma.companyWifi.findMany({
        where: { active: true },
        select: { ssid: true },
        orderBy: { ssid: 'asc' },
    });
    return rows.map((r) => r.ssid.trim());
}

export async function listCompanyWifi(activeOnly = false) {
    return prisma.companyWifi.findMany({
        where: activeOnly ? { active: true } : undefined,
        orderBy: { ssid: 'asc' },
    });
}

export async function isAllowedSsid(ssid: unknown): Promise<boolean> {
    const normalized = normalizeSsid(ssid);
    if (!normalized) return false;
    if (process.env.ATTENDANCE_DEV_BYPASS === 'true') return true;

    const allowed = await getAllowedSsids();
    const lower = normalized.toLowerCase();
    return allowed.some((a) => a.toLowerCase() === lower);
}

/** SSID gửi lên hoặc mặc định wifi đầu tiên trong DB (web không đọc được tên WiFi thật) */
export async function resolveAttendanceSsid(ssid: unknown): Promise<string | null> {
    const allowed = await getAllowedSsids();
    if (allowed.length === 0) return null;

    const normalized = normalizeSsid(ssid);
    if (normalized && (await isAllowedSsid(normalized))) {
        return normalized;
    }

    return allowed[0];
}

export async function createCompanyWifi(ssid: string, label?: string) {
    const normalized = normalizeSsid(ssid);
    if (!normalized) throw new Error('SSID không hợp lệ');
    return prisma.companyWifi.create({
        data: {
            ssid: normalized,
            label: label?.trim() || normalized,
            active: true,
        },
    });
}
