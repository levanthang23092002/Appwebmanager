import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import { getSystemSettings, updateSystemSettings } from '@/lib/systemSettings';

/** Legacy alias — dùng /api/system/settings cho code mới */
export async function GET(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }

    const settings = await getSystemSettings();
    return NextResponse.json({ usdVndRate: settings.usdVndRate });
  } catch (error) {
    console.error('GET finance/settings:', error);
    return NextResponse.json({ error: 'Không tải được cấu hình tỉ giá' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }
    if (authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ admin được cấu hình tỉ giá' }, { status: 403 });
    }

    const data = await request.json().catch(() => ({}));
    const settings = await updateSystemSettings({ usdVndRate: data.usdVndRate });
    return NextResponse.json({ usdVndRate: settings.usdVndRate });
  } catch (error) {
    console.error('PATCH finance/settings:', error);
    return NextResponse.json({ error: 'Không lưu được cấu hình tỉ giá' }, { status: 400 });
  }
}
