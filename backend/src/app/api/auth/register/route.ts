import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { USER_STATUS } from '@/lib/userStatus';
import { emitNotificationEvent } from '@/lib/notificationEvents';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const data = await request.json();
        
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email }
        });
        
        if (existingUser) {
            return NextResponse.json({ error: 'Email đã tồn tại!' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const newUser = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                role: 'staff',
                status: USER_STATUS.PENDING,
                telegram: data.telegram?.trim() || null,
                salary: parseFloat(data.salary) || 0,
                ...(data.avatar && { avatar: data.avatar })
            }
        });

        emitNotificationEvent();

        return NextResponse.json({
            message: 'Đăng ký thành công! Tài khoản đang chờ duyệt. Bạn sẽ đăng nhập được sau khi Admin phê duyệt.',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                status: newUser.status,
                telegram: newUser.telegram,
            }
        }, { status: 201 });
    } catch (error) {
        console.error("Register Error:", error);
        return NextResponse.json({ error: 'Lỗi khởi tạo tài khoản' }, { status: 500 });
    }
}
