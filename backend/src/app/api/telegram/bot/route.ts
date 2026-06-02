import { NextResponse } from 'next/server';

/** Thông tin bot (username) để hiển thị link t.me trên Dashboard */
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ configured: false, username: null });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      next: { revalidate: 3600 },
    });
    const data = (await res.json()) as {
      ok?: boolean;
      result?: { username?: string; first_name?: string };
    };
    if (!data.ok || !data.result?.username) {
      return NextResponse.json({ configured: true, username: null });
    }
    return NextResponse.json({
      configured: true,
      username: data.result.username,
      name: data.result.first_name,
    });
  } catch {
    return NextResponse.json({ configured: true, username: null });
  }
}
