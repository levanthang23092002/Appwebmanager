import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import { getAllowedSsids, isAllowedSsid, normalizeSsid } from '@/lib/attendance/attendanceWifi';

export async function GET(request: Request) {
    try {
        const authUser = getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const ssid = normalizeSsid(searchParams.get('ssid') || '');
        const allowed = await getAllowedSsids();

        if (!ssid) {
            return NextResponse.json({
                ok: false,
                message: 'Chưa chọn WiFi công ty',
                ssids: allowed,
                detail: 'Chọn đúng tên WiFi bạn đang kết nối.',
            });
        }

        const ok = await isAllowedSsid(ssid);
        return NextResponse.json({
            ok,
            message: ok ? 'Đã xác nhận WiFi công ty' : 'WiFi không thuộc công ty',
            ssid,
            ssids: allowed,
            detail: ok
                ? `Đang dùng: ${ssid}`
                : `WiFi "${ssid}" không có trong danh sách. Danh sách: ${allowed.join(', ')}`,
        });
    } catch (error) {
        console.error('GET attendance/network-check Error:', error);
        return NextResponse.json({ error: 'Failed to check network' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const authUser = getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
        }

        const data = await request.json().catch(() => ({}));
        const ssid = normalizeSsid(data.ssid);
        const allowed = await getAllowedSsids();

        if (!ssid) {
            return NextResponse.json({
                ok: false,
                message: 'Thiếu tên WiFi',
                ssids: allowed,
            });
        }

        const ok = await isAllowedSsid(ssid);
        return NextResponse.json({
            ok,
            message: ok ? 'Đã xác nhận WiFi công ty' : 'WiFi không thuộc công ty',
            ssid,
            ssids: allowed,
            detail: ok
                ? `Đang dùng: ${ssid}`
                : `WiFi "${ssid}" không hợp lệ.`,
        });
    } catch (error) {
        console.error('POST attendance/network-check Error:', error);
        return NextResponse.json({ error: 'Failed to check network' }, { status: 500 });
    }
}
