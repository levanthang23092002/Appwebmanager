import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/authRequest';
import { createTaskEventStream } from '@/lib/taskEvents';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const authUser = verifyAuthToken(searchParams.get('token'));
    if (!authUser) {
        return NextResponse.json({ error: 'Cần đăng nhập' }, { status: 401 });
    }

    return new Response(createTaskEventStream(), {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
