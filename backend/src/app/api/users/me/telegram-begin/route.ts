import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import { createTelegramLinkSession } from '@/lib/telegramLink';

export async function POST(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }

    const session = await createTelegramLinkSession(authUser.id);
    return NextResponse.json(session);
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (msg === 'BOT_NOT_CONFIGURED') {
      return NextResponse.json(
        { error: 'Chưa cấu hình TELEGRAM_BOT_TOKEN trong backend/.env' },
        { status: 503 }
      );
    }
    console.error('telegram-begin Error:', error);
    return NextResponse.json({ error: 'Không tạo được link liên kết' }, { status: 500 });
  }
}
