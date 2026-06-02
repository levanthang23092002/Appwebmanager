import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const affiliates = await prisma.affiliateTx.findMany({
            include: { assignee: true },
            orderBy: { date: 'desc' }
        });
        return NextResponse.json(affiliates);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch affiliate transactions' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const newAffiliate = await prisma.affiliateTx.create({
            data: {
                source: data.source,
                amount: parseFloat(data.amount),
                status: data.status || 'PAID',
                date: data.date ? new Date(data.date) : new Date(),
                assigneeId: data.assigneeId ? parseInt(String(data.assigneeId), 10) : null
            }
        });
        return NextResponse.json(newAffiliate, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create affiliate record' }, { status: 500 });
    }
}
