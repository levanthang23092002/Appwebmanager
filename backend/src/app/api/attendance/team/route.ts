import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import { mapAttendanceRow } from '@/lib/attendance/attendanceMapper';
import { monthRange, parseYearMonth, todayDateKey } from '@/lib/attendance/attendanceDate';
import { getAttendanceSettings } from '@/lib/attendance/attendanceSettings';
import { USER_STATUS } from '@/lib/userStatus';
import { prisma } from '@/lib/prisma';

const userSelect = {
    id: true,
    name: true,
    email: true,
    avatar: true,
    role: true,
} as const;

export async function GET(request: Request) {
    try {
        const authUser = getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
        }
        if (authUser.role !== 'admin') {
            return NextResponse.json({ error: 'Chỉ admin được xem' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const ym = parseYearMonth(searchParams);
        if (!ym) {
            return NextResponse.json({ error: 'Tham số year/month không hợp lệ' }, { status: 400 });
        }

        const { start, end } = monthRange(ym.year, ym.month);
        const todayKey = todayDateKey();
        const settings = await getAttendanceSettings();

        const [users, records] = await Promise.all([
            prisma.user.findMany({
                where: { status: USER_STATUS.APPROVED },
                select: userSelect,
                orderBy: { name: 'asc' },
            }),
            prisma.attendance.findMany({
                where: { date: { gte: start, lte: end } },
                include: { user: { select: { name: true } } },
                orderBy: [{ date: 'asc' }, { userId: 'asc' }],
            }),
        ]);

        return NextResponse.json({
            users,
            records: records.map((r) => mapAttendanceRow(r, todayKey, settings)),
        });
    } catch (error) {
        console.error('GET attendance/team Error:', error);
        return NextResponse.json({ error: 'Failed to fetch team attendance' }, { status: 500 });
    }
}
