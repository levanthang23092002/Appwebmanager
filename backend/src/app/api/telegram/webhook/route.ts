import { NextResponse } from 'next/server';
import { dispatchTelegramUpdate, type TelegramUpdate } from '@/lib/telegramLink';

export async function POST(request: Request) {
  try {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    if (secret) {
      const header = request.headers.get('x-telegram-bot-api-secret-token');
      if (header !== secret) {
        return NextResponse.json({ ok: false }, { status: 403 });
      }
    }

    const body = (await request.json()) as TelegramUpdate;
    await dispatchTelegramUpdate(body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('telegram webhook Error:', error);
    return NextResponse.json({ ok: true });
  }
}
