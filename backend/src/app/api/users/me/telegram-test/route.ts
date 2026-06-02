import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { name: true, telegram: true },
    });

    if (!user?.telegram?.trim()) {
      return NextResponse.json(
        { error: 'Chưa lưu Chat ID Telegram. Hãy liên kết trước.' },
        { status: 400 }
      );
    }

    const sent = await sendTelegramMessage(
      user.telegram,
      `✅ <b>Eagle Rise</b>\nXin chào ${user.name}! Liên kết Telegram thành công — bạn sẽ nhận thông báo khi task đổi trạng thái.`
    );

    if (!sent) {
      return NextResponse.json(
        {
          error:
            'Không gửi được tin. Kiểm tra Chat ID, đã /start bot chưa, và TELEGRAM_BOT_TOKEN trong backend/.env',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, message: 'Đã gửi tin thử thành công' });
  } catch (error) {
    console.error('telegram-test Error:', error);
    return NextResponse.json({ error: 'Lỗi gửi tin thử' }, { status: 500 });
  }
}
