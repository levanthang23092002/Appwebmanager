import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import { mapAttendanceRow } from '@/lib/attendance/attendanceMapper';
import { monthRange, parseYearMonth, todayDateKey } from '@/lib/attendance/attendanceDate';
import { prisma } from '@/lib/prisma';

/** Admin xem lịch 1 nhân viên */
export async function GET(request: Request) {
    try {
        const authUser = getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = parseInt(searchParams.get('userId') || '', 10);
        const ym = parseYearMonth(searchParams);

        if (!Number.isFinite(userId) || !ym) {
            return NextResponse.json({ error: 'Thiếu userId hoặc year/month' }, { status: 400 });
        }

        if (authUser.role !== 'admin' && authUser.id !== userId) {
            return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
        }

        const { start, end } = monthRange(ym.year, ym.month);
        const todayKey = todayDateKey();

        const rows = await prisma.attendance.findMany({
            where: {
                userId,
                date: { gte: start, lte: end },
            },
            include: { user: { select: { name: true } } },
            orderBy: { date: 'asc' },
        });

        return NextResponse.json(rows.map((r) => mapAttendanceRow(r, todayKey)));
    } catch (error) {
        console.error('GET attendance Error:', error);
        return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
    }
}
