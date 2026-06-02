import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAuthUser } from '@/lib/authRequest';
import { prisma } from '@/lib/prisma';

const profileSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  telegram: true,
  avatar: true,
  salary: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: profileSelect,
    });

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy user' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('GET users/me Error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }

    const data = await request.json();
    const existing = await prisma.user.findUnique({
      where: { id: authUser.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy user' }, { status: 404 });
    }

    const updateData: {
      name?: string;
      email?: string;
      avatar?: string | null;
      telegram?: string | null;
      password?: string;
    } = {};

    if (data.name !== undefined) {
      const name = String(data.name).trim();
      if (!name) {
        return NextResponse.json({ error: 'Họ tên không được để trống' }, { status: 400 });
      }
      updateData.name = name;
    }

    if (data.email !== undefined) {
      const email = String(data.email).trim().toLowerCase();
      if (!email || !email.includes('@')) {
        return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 });
      }
      if (email !== existing.email) {
        const taken = await prisma.user.findUnique({ where: { email } });
        if (taken) {
          return NextResponse.json({ error: 'Email đã được sử dụng' }, { status: 409 });
        }
      }
      updateData.email = email;
    }

    if (data.avatar !== undefined) {
      updateData.avatar = data.avatar?.trim() || null;
    }

    if (data.telegram !== undefined) {
      updateData.telegram = data.telegram?.trim() || null;
    }

    const newPassword = data.newPassword ? String(data.newPassword) : '';
    if (newPassword) {
      const currentPassword = String(data.currentPassword || '');
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Nhập mật khẩu hiện tại để đổi mật khẩu' },
          { status: 400 }
        );
      }
      const match = await bcrypt.compare(currentPassword, existing.password);
      if (!match) {
        return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng' }, { status: 401 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'Mật khẩu mới tối thiểu 6 ký tự' },
          { status: 400 }
        );
      }
      if (newPassword !== String(data.confirmPassword || '')) {
        return NextResponse.json({ error: 'Xác nhận mật khẩu không khớp' }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Không có thay đổi' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: authUser.id },
      data: updateData,
      select: profileSelect,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH users/me Error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
