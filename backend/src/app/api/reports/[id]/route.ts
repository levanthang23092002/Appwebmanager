import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import { parseId } from '@/lib/userStatus';
import { mapDailyReportRow } from '@/lib/reports/reportMapper';
import { prisma } from '@/lib/prisma';

const userSelect = {
    id: true,
    name: true,
    email: true,
    avatar: true,
} as const;

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authUser = getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
        }

        const { id: idParam } = await params;
        const id = parseId(idParam);
        if (!id) {
            return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
        }

        const row = await prisma.dailyReport.findUnique({
            where: { id },
            include: { user: { select: userSelect } },
        });

        if (!row) {
            return NextResponse.json({ error: 'Không tìm thấy báo cáo' }, { status: 404 });
        }

        if (authUser.role !== 'admin' && row.userId !== authUser.id) {
            return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
        }

        return NextResponse.json(mapDailyReportRow(row));
    } catch (error) {
        console.error('GET reports/[id] Error:', error);
        return NextResponse.json({ error: 'Không tải được báo cáo' }, { status: 500 });
    }
}
