import { prisma } from '@/lib/prisma';
import { emitNotificationEvent } from '@/lib/notificationEvents';
import { sendTelegramMessage } from '@/lib/telegram';
import { storageDateToDateKey } from '@/lib/attendance/attendanceDate';

type ReportForNotify = {
    id: number;
    date: Date;
    content: string;
    user: { name: string };
};

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatReportDate(date: Date) {
    const key = storageDateToDateKey(date);
    const [y, m, d] = key.split('-');
    return `${d}/${m}/${y}`;
}

function reportMessage(report: ReportForNotify) {
    const preview = escapeHtml(report.content.trim().slice(0, 180));
    const more = report.content.trim().length > 180 ? '…' : '';
    const appUrl = process.env.APP_URL?.replace(/\/$/, '');
    const link = appUrl ? `\n\n<a href="${appUrl}/reports">Xem trên web</a>` : '';

    return [
        '📋 <b>Báo cáo cuối ngày mới</b>',
        `Nhân viên: <b>${escapeHtml(report.user.name)}</b>`,
        `Ngày: ${formatReportDate(report.date)}`,
        '',
        preview + more,
        link,
    ].join('\n');
}

export async function notifyReportSubmittedToAdmins(report: ReportForNotify) {
    const admins = await prisma.user.findMany({
        where: {
            role: 'admin',
            telegram: { not: null },
        },
        select: { telegram: true },
    });

    await Promise.all(
        admins.map((admin) =>
            sendTelegramMessage(admin.telegram, reportMessage(report)).catch(() => undefined)
        )
    );

    emitNotificationEvent();
}
