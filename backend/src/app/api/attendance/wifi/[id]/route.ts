import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import { normalizeSsid } from '@/lib/attendance/attendanceWifi';
import { prisma } from '@/lib/prisma';

type RouteCtx = { params: Promise<{ id: string }> };

function parseId(id: string) {
    const n = parseInt(id, 10);
    return Number.isNaN(n) ? null : n;
}

export async function PATCH(request: Request, context: RouteCtx) {
    try {
        const authUser = getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
        }
        if (authUser.role !== 'admin') {
            return NextResponse.json({ error: 'Chỉ admin được sửa WiFi' }, { status: 403 });
        }

        const { id } = await context.params;
        const wifiId = parseId(id);
        if (!wifiId) {
            return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
        }

        const data = await request.json().catch(() => ({}));
        const updateData: { ssid?: string; label?: string | null; active?: boolean } = {};

        if (data.ssid != null) {
            const ssid = normalizeSsid(data.ssid);
            if (!ssid) {
                return NextResponse.json({ error: 'SSID không hợp lệ' }, { status: 400 });
            }
            updateData.ssid = ssid;
        }
        if (data.label !== undefined) {
            updateData.label = data.label?.trim() || null;
        }
        if (data.active !== undefined) {
            updateData.active = !!data.active;
        }

        const updated = await prisma.companyWifi.update({
            where: { id: wifiId },
            data: updateData,
        });
        return NextResponse.json(updated);
    } catch (error) {
        console.error('PATCH attendance/wifi Error:', error);
        return NextResponse.json({ error: 'Không sửa được WiFi' }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: RouteCtx) {
    try {
        const authUser = getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
        }
        if (authUser.role !== 'admin') {
            return NextResponse.json({ error: 'Chỉ admin được xóa WiFi' }, { status: 403 });
        }

        const { id } = await context.params;
        const wifiId = parseId(id);
        if (!wifiId) {
            return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
        }

        await prisma.companyWifi.delete({ where: { id: wifiId } });
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('DELETE attendance/wifi Error:', error);
        return NextResponse.json({ error: 'Không xóa được WiFi' }, { status: 500 });
    }
}
