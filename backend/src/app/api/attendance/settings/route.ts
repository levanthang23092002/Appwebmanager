import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import {
    getAttendanceSettings,
    updateAttendanceSettings,
} from '@/lib/attendance/attendanceSettings';

export async function GET(request: Request) {
    try {
        const authUser = getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
        }

        const settings = await getAttendanceSettings();
        return NextResponse.json(settings);
    } catch (error) {
        console.error('GET attendance/settings Error:', error);
        return NextResponse.json({ error: 'Không tải được cấu hình' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const authUser = getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
        }
        if (authUser.role !== 'admin') {
            return NextResponse.json({ error: 'Chỉ admin được cấu hình giờ làm' }, { status: 403 });
        }

        const data = await request.json().catch(() => ({}));
        const settings = await updateAttendanceSettings(data);
        return NextResponse.json(settings);
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Không lưu được cấu hình';
        console.error('PATCH attendance/settings Error:', error);
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}
