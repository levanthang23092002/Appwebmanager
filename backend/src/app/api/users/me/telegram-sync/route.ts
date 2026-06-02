import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import { getTelegramLinkStatus, processTelegramInbox } from '@/lib/telegramLink';

/** Poll Telegram + trả về đã lưu chat_id vào User chưa */
export async function POST(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }

    await processTelegramInbox();
    const status = await getTelegramLinkStatus(authUser.id);

    return NextResponse.json(status);
  } catch (error) {
    console.error('telegram-sync Error:', error);
    return NextResponse.json({ error: 'Đồng bộ thất bại' }, { status: 500 });
  }
}
