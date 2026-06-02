import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeTaskKpi } from '@/lib/taskKpi';
import { USER_STATUS } from '@/lib/userStatus';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                telegram: true,
                salary: true,
                avatar: true,
                createdAt: true,
                updatedAt: true,
                tasksAssigned: {
                    select: {
                        deadline: true,
                        status: true,
                        updatedAt: true,
                    },
                },
            },
            orderBy: { id: 'asc' },
        });
        const payload = users.map(({ tasksAssigned, ...user }) => {
            const kpi = computeTaskKpi(tasksAssigned);
            return {
                ...user,
                taskKpi: {
                    percent: kpi.percent,
                    onTime: kpi.onTimeCount,
                    expired: kpi.expiredCount,
                    notExpired: kpi.notExpiredCount,
                    hasScore: kpi.hasScore,
                },
            };
        });
        return NextResponse.json(payload);
    } catch (error) {
        console.error("GET users Error:", error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

/** Admin tạo nhân sự — mặc định Đã duyệt */
export async function POST(request: Request) {
    try {
        const data = await request.json();

        if (!data.name || !data.email || !data.password) {
            return NextResponse.json({ error: 'Thiếu tên, email hoặc mật khẩu' }, { status: 400 });
        }

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
                role: data.role || 'staff',
                status: data.status || USER_STATUS.APPROVED,
                telegram: data.telegram?.trim() || null,
                salary: parseFloat(data.salary) || 0,
                ...(data.avatar && { avatar: data.avatar }),
            }
        });

        const { password: _, ...safe } = newUser;
        return NextResponse.json(safe, { status: 201 });
    } catch (error) {
        console.error("POST users Error:", error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
