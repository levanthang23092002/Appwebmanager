import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import { mapAttendanceRow } from '@/lib/attendance/attendanceMapper';
import { todayDateKey, toDateKey } from '@/lib/attendance/attendanceDate';
import { resolveAttendanceSsid } from '@/lib/attendance/attendanceWifi';
import { getAttendanceSettings } from '@/lib/attendance/attendanceSettings';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const authUser = getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
        }

        const data = await request.json().catch(() => ({}));
        const ssid = await resolveAttendanceSsid(data.ssid);
        if (!ssid) {
            return NextResponse.json(
                { error: 'Chưa cấu hình WiFi công ty. Liên hệ admin.' },
                { status: 403 }
            );
        }

        const todayKey = todayDateKey();
        const settings = await getAttendanceSettings();

        let existing = await prisma.attendance.findFirst({
            where: {
                userId: authUser.id,
                checkIn: { not: null },
                checkOut: null,
            },
            orderBy: { date: 'desc' },
            include: { user: { select: { name: true } } },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Bạn chưa chấm vào (hoặc đã chấm ra rồi)' }, { status: 400 });
        }

        const row = await prisma.attendance.update({
            where: { id: existing.id },
            data: { checkOut: new Date(), checkOutSsid: ssid },
            include: { user: { select: { name: true } } },
        });

        return NextResponse.json(mapAttendanceRow(row, todayKey, settings));
    } catch (error) {
        console.error('POST attendance/check-out Error:', error);
        return NextResponse.json({ error: 'Không chấm ra được' }, { status: 500 });
    }
}
