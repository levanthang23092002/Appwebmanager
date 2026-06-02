import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Aggregate Total Revenue from Affiliate Transactions
        const revenueResult = await prisma.affiliateTx.aggregate({
            _sum: {
                amount: true
            }
        });
        
        // Aggregate Total Cost from Costs
        const costResult = await prisma.cost.aggregate({
            where: { approved: true, canceled: false },
            _sum: {
                amount: true
            }
        });

        const totalRevenue = revenueResult._sum.amount || 0;
        const totalCost = costResult._sum.amount || 0;
        const netProfit = totalRevenue - totalCost;

        return NextResponse.json({
            data: {
                totalRevenue,
                totalCost,
                netProfit
            },
            message: "Phép tính xử lý thành công trên Server Node.js"
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to calculate finance summary' }, { status: 500 });
    }
}
