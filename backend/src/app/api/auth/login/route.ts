import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { USER_STATUS } from '@/lib/userStatus';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'entdash-super-secret-key';

export async function POST(request: Request) {
    try {
        const data = await request.json();
        
        const user = await prisma.user.findUnique({
            where: { email: data.email }
        });
        
        if (!user) {
            return NextResponse.json({ error: 'Tài khoản không tồn tại!' }, { status: 404 });
        }

        const isMatch = await bcrypt.compare(data.password, user.password);
        if (!isMatch) {
            return NextResponse.json({ error: 'Mật khẩu không chính xác!' }, { status: 401 });
        }

        if (user.status === USER_STATUS.PENDING) {
            return NextResponse.json({
                error: 'Tài khoản đang chờ duyệt. Vui lòng liên hệ Admin.'
            }, { status: 403 });
        }

        if (user.status === USER_STATUS.LOCKED) {
            return NextResponse.json({
                error: 'Tài khoản đã bị khóa. Vui lòng liên hệ Admin.'
            }, { status: 403 });
        }

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role,
                name: user.name,
                email: user.email,
                status: user.status,
            },
            SECRET_KEY,
            { expiresIn: '7d' }
        );

        return NextResponse.json({
            message: 'Đăng nhập thành công!',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                telegram: user.telegram ?? null,
                avatar: user.avatar ?? null,
            }
        }, { status: 200 });
    } catch (error) {
        console.error("Login Error:", error);
        return NextResponse.json({ error: 'Lỗi máy chủ khi đăng nhập' }, { status: 500 });
    }
}
