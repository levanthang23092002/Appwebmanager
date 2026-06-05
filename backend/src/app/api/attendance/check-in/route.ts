import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import { mapAttendanceRow } from '@/lib/attendance/attendanceMapper';
import { dateKeyToStorageDate, todayDateKey, toDateKey } from '@/lib/attendance/attendanceDate';
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
        const today = dateKeyToStorageDate(todayKey);
        const settings = await getAttendanceSettings();

        const existing = await prisma.attendance.findUnique({
            where: {
                userId_date: { userId: authUser.id, date: today },
            },
            include: { user: { select: { name: true } } },
        });

        if (existing?.checkIn) {
            return NextResponse.json({ error: 'Bạn đã chấm vào hôm nay' }, { status: 400 });
        }

        const now = new Date();
        const row = existing
            ? await prisma.attendance.update({
                  where: { id: existing.id },
                  data: { checkIn: now, checkInSsid: ssid },
                  include: { user: { select: { name: true } } },
              })
            : await prisma.attendance.create({
                  data: {
                      userId: authUser.id,
                      date: today,
                      checkIn: now,
                      checkInSsid: ssid,
                  },
                  include: { user: { select: { name: true } } },
              });

        return NextResponse.json(mapAttendanceRow(row, todayKey, settings), { status: 201 });
    } catch (error) {
        console.error('POST attendance/check-in Error:', error);
        return NextResponse.json({ error: 'Không chấm vào được' }, { status: 500 });
    }
}
