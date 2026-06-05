import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import { dateKeyToStorageDate, todayDateKey } from '@/lib/attendance/attendanceDate';
import { mapDailyReportRow } from '@/lib/reports/reportMapper';
import { prisma } from '@/lib/prisma';

const userSelect = {
    id: true,
    name: true,
    email: true,
    avatar: true,
} as const;

export async function GET(request: Request) {
    try {
        const authUser = getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const dateKey = searchParams.get('date') || todayDateKey();
        const storageDate = dateKeyToStorageDate(dateKey);

        const row = await prisma.dailyReport.findUnique({
            where: {
                userId_date: { userId: authUser.id, date: storageDate },
            },
            include: { user: { select: userSelect } },
        });

        return NextResponse.json(row ? mapDailyReportRow(row) : null);
    } catch (error) {
        console.error('GET reports/today Error:', error);
        return NextResponse.json({ error: 'Không tải được báo cáo' }, { status: 500 });
    }
}
