import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import {
    createCompanyWifi,
    getAllowedSsids,
    listCompanyWifi,
    normalizeSsid,
} from '@/lib/attendance/attendanceWifi';

export async function GET(request: Request) {
    try {
        const authUser = getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const manage = searchParams.get('manage') === '1';

        if (manage) {
            if (authUser.role !== 'admin') {
                return NextResponse.json({ error: 'Chỉ admin được quản lý WiFi' }, { status: 403 });
            }
            const items = await listCompanyWifi(false);
            return NextResponse.json({ items });
        }

        const ssids = await getAllowedSsids();
        return NextResponse.json({ ssids });
    } catch (error) {
        console.error('GET attendance/wifi Error:', error);
        return NextResponse.json({ error: 'Failed to fetch wifi list' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const authUser = getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
        }
        if (authUser.role !== 'admin') {
            return NextResponse.json({ error: 'Chỉ admin được thêm WiFi' }, { status: 403 });
        }

        const data = await request.json().catch(() => ({}));
        const ssid = normalizeSsid(data.ssid);
        if (!ssid) {
            return NextResponse.json({ error: 'Thiếu tên WiFi (SSID)' }, { status: 400 });
        }

        const existing = await createCompanyWifi(ssid, data.label);
        return NextResponse.json(existing, { status: 201 });
    } catch (error: unknown) {
        const msg = error && typeof error === 'object' && 'code' in error && error.code === 'P2002'
            ? 'Tên WiFi đã tồn tại'
            : 'Không thêm được WiFi';
        console.error('POST attendance/wifi Error:', error);
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}
