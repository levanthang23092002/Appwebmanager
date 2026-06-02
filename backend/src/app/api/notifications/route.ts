import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import { getNotificationsForUser } from '@/lib/notifications';

export async function GET(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }

    const items = await getNotificationsForUser(authUser);
    return NextResponse.json({ items, count: items.length });
  } catch (error) {
    console.error('GET notifications Error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}
