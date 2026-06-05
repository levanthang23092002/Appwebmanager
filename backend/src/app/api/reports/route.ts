import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import {
    dateKeyToStorageDate,
    monthRange,
    parseYearMonth,
    todayDateKey,
} from '@/lib/attendance/attendanceDate';
import { emitNotificationEvent } from '@/lib/notificationEvents';
import { notifyReportSubmittedToAdmins } from '@/lib/reportNotify';
import {
    mapDailyReportRow,
    normalizeReportContent,
    REPORT_STATUS,
} from '@/lib/reports/reportMapper';
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
        const ym = parseYearMonth(searchParams);
        if (!ym) {
            return NextResponse.json({ error: 'Tham số year/month không hợp lệ' }, { status: 400 });
        }

        const userIdParam = searchParams.get('userId');
        let targetUserId = authUser.id;

        if (userIdParam) {
            const parsed = parseInt(userIdParam, 10);
            if (!Number.isFinite(parsed)) {
                return NextResponse.json({ error: 'userId không hợp lệ' }, { status: 400 });
            }
            if (authUser.role !== 'admin' && parsed !== authUser.id) {
                return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
            }
            targetUserId = parsed;
        }

        const { start, end } = monthRange(ym.year, ym.month);
        const rows = await prisma.dailyReport.findMany({
            where: {
                userId: targetUserId,
                date: { gte: start, lte: end },
            },
            include: { user: { select: userSelect } },
            orderBy: { date: 'desc' },
        });

        return NextResponse.json(rows.map(mapDailyReportRow));
    } catch (error) {
        console.error('GET reports Error:', error);
        return NextResponse.json({ error: 'Không tải được báo cáo' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const authUser = getAuthUser(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
        }

        const data = await request.json().catch(() => ({}));
        const submit = data.submit === true;
        const content = normalizeReportContent(data.content, submit);
        if (submit && !content) {
            return NextResponse.json({ error: 'Nội dung báo cáo không được để trống' }, { status: 400 });
        }

        const dateKey = typeof data.date === 'string' && data.date ? data.date : todayDateKey();
        const storageDate = dateKeyToStorageDate(dateKey);
        const planNext = normalizeReportContent(data.planNext) || null;
        const blockers = normalizeReportContent(data.blockers) || null;

        const existing = await prisma.dailyReport.findUnique({
            where: {
                userId_date: { userId: authUser.id, date: storageDate },
            },
            include: { user: { select: userSelect } },
        });

        if (existing?.status === REPORT_STATUS.SUBMITTED) {
            return NextResponse.json({ error: 'Báo cáo đã nộp, không sửa được' }, { status: 400 });
        }

        const now = new Date();
        const nextStatus = submit ? REPORT_STATUS.SUBMITTED : REPORT_STATUS.DRAFT;
        const wasSubmitted = existing?.status === REPORT_STATUS.SUBMITTED;

        const row = existing
            ? await prisma.dailyReport.update({
                  where: { id: existing.id },
                  data: {
                      content: content ?? existing.content,
                      planNext,
                      blockers,
                      status: nextStatus,
                      submittedAt: submit ? now : existing.submittedAt,
                  },
                  include: { user: { select: userSelect } },
              })
            : await prisma.dailyReport.create({
                  data: {
                      userId: authUser.id,
                      date: storageDate,
                      content: content ?? '',
                      planNext,
                      blockers,
                      status: nextStatus,
                      submittedAt: submit ? now : null,
                  },
                  include: { user: { select: userSelect } },
              });

        if (submit && !wasSubmitted) {
            await notifyReportSubmittedToAdmins({
                id: row.id,
                date: row.date,
                content: row.content,
                user: { name: row.user.name },
            });
        } else {
            emitNotificationEvent();
        }

        return NextResponse.json(mapDailyReportRow(row), { status: existing ? 200 : 201 });
    } catch (error) {
        console.error('POST reports Error:', error);
        return NextResponse.json({ error: 'Không lưu được báo cáo' }, { status: 500 });
    }
}
