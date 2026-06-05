import { prisma } from '@/lib/prisma';

export type AttendanceWorkHours = {
    workStartHour: number;
    workStartMinute: number;
    workEndHour: number;
    workEndMinute: number;
};

const DEFAULTS: AttendanceWorkHours = {
    workStartHour: parseInt(process.env.ATTENDANCE_LATE_HOUR || '9', 10),
    workStartMinute: parseInt(process.env.ATTENDANCE_LATE_MINUTE || '0', 10),
    workEndHour: parseInt(process.env.ATTENDANCE_WORK_END_HOUR || '18', 10),
    workEndMinute: parseInt(process.env.ATTENDANCE_WORK_END_MINUTE || '0', 10),
};

function clampHour(value: unknown, fallback: number) {
    const n = parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(n) || n < 0 || n > 23) return fallback;
    return n;
}

function clampMinute(value: unknown, fallback: number) {
    const n = parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(n) || n < 0 || n > 59) return fallback;
    return n;
}

export function normalizeWorkHours(input: Partial<AttendanceWorkHours>): AttendanceWorkHours {
    return {
        workStartHour: clampHour(input.workStartHour, DEFAULTS.workStartHour),
        workStartMinute: clampMinute(input.workStartMinute, DEFAULTS.workStartMinute),
        workEndHour: clampHour(input.workEndHour, DEFAULTS.workEndHour),
        workEndMinute: clampMinute(input.workEndMinute, DEFAULTS.workEndMinute),
    };
}

export async function getAttendanceSettings(): Promise<AttendanceWorkHours> {
    try {
        const row = await prisma.attendanceSettings.findUnique({ where: { id: 1 } });
        if (!row) return DEFAULTS;
        return normalizeWorkHours(row);
    } catch {
        return DEFAULTS;
    }
}

export async function updateAttendanceSettings(
    input: Partial<AttendanceWorkHours>
): Promise<AttendanceWorkHours> {
    const current = await getAttendanceSettings();
    const next = normalizeWorkHours({ ...current, ...input });

    const startMins = next.workStartHour * 60 + next.workStartMinute;
    const endMins = next.workEndHour * 60 + next.workEndMinute;
    if (endMins <= startMins) {
        throw new Error('Giờ ra phải sau giờ vào');
    }

    const row = await prisma.attendanceSettings.upsert({
        where: { id: 1 },
        create: { id: 1, ...next },
        update: next,
    });

    return normalizeWorkHours(row);
}
