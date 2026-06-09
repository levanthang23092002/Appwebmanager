import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/authRequest';
import { getSystemSettings, updateSystemSettings } from '@/lib/systemSettings';

/** Cấu hình hệ thống — GET công khai (logo/tên), PATCH chỉ admin */
export async function GET(request: Request) {
  try {
    const lite = new URL(request.url).searchParams.get('lite') === '1';
    const settings = await getSystemSettings();
    if (lite) {
      return NextResponse.json({
        usdVndRate: settings.usdVndRate,
        appName: settings.appName,
        logo: null,
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error('GET system/settings:', error);
    return NextResponse.json({ error: 'Không tải được cấu hình hệ thống' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }
    if (authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ admin được cấu hình hệ thống' }, { status: 403 });
    }

    const data = await request.json().catch(() => ({}));
    const settings = await updateSystemSettings(data);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('PATCH system/settings:', error);
    return NextResponse.json({ error: 'Không lưu được cấu hình hệ thống' }, { status: 400 });
  }
}
