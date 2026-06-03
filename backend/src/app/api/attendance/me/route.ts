import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import { mapAttendanceRow } from '@/lib/attendance/attendanceMapper';
import { monthRange, parseYearMonth, todayDateKey } from '@/lib/attendance/attendanceDate';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const authUser = getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const ym = parseYearMonth(searchParams);
        if (!ym) {
            return NextResponse.json({ error: 'Tham số year/month không hợp lệ' }, { status: 400 });
        }

        const { start, end } = monthRange(ym.year, ym.month);
        const todayKey = todayDateKey();

        const rows = await prisma.attendance.findMany({
            where: {
                userId: authUser.id,
                date: { gte: start, lte: end },
            },
            include: { user: { select: { name: true } } },
            orderBy: { date: 'asc' },
        });

        return NextResponse.json(rows.map((r) => mapAttendanceRow(r, todayKey)));
    } catch (error) {
        console.error('GET attendance/me Error:', error);
        return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
    }
}
