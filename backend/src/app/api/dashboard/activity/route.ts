import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import { getRecentActivities } from '@/lib/dashboardActivity';

export async function GET(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limitRaw = parseInt(searchParams.get('limit') || '12', 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 30) : 12;

    const items = await getRecentActivities(authUser, limit);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('GET dashboard activity Error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
