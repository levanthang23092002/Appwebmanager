import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import {
    monthRange,
    parseYearMonth,
    storageDateToDateKey,
    todayDateKey,
} from '@/lib/attendance/attendanceDate';
import { mapDailyReportRow, REPORT_STATUS } from '@/lib/reports/reportMapper';
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

        const [users, records] = await Promise.all([
            prisma.user.findMany({
                where: { status: USER_STATUS.APPROVED },
                select: userSelect,
                orderBy: { name: 'asc' },
            }),
            prisma.dailyReport.findMany({
                where: { date: { gte: start, lte: end } },
                include: { user: { select: userSelect } },
                orderBy: [{ date: 'desc' }, { userId: 'asc' }],
            }),
        ]);

        const todayReports = records.filter((r) => storageDateToDateKey(r.date) === todayKey);
        const todayByUser = new Map(todayReports.map((r) => [r.userId, r]));

        const monthByUser = new Map<number, typeof records>();
        for (const row of records) {
            const list = monthByUser.get(row.userId) ?? [];
            list.push(row);
            monthByUser.set(row.userId, list);
        }

        const members = users.map((u) => {
            const monthRows = monthByUser.get(u.id) ?? [];
            const submittedCount = monthRows.filter((r) => r.status === REPORT_STATUS.SUBMITTED).length;
            const todayReport = todayByUser.get(u.id);
            return {
                user: u,
                todaySubmitted: todayReport?.status === REPORT_STATUS.SUBMITTED,
                todayReport: todayReport ? mapDailyReportRow(todayReport) : null,
                monthSubmitted: submittedCount,
                monthTotal: monthRows.length,
            };
        });

        return NextResponse.json({
            todayKey,
            members,
            records: records.map(mapDailyReportRow),
        });
    } catch (error) {
        console.error('GET reports/team Error:', error);
        return NextResponse.json({ error: 'Không tải được dữ liệu' }, { status: 500 });
    }
}
