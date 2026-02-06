'use server';

import { NextResponse } from 'next/server';

// Note: Next.js App Router doesn't natively support WebSocket connections in API routes.
// For production real-time features, you would need one of these approaches:
// 1. Use a separate Socket.io server (e.g., Express.js running on a different port)
// 2. Use Vercel's Edge Functions with WebSocket support
// 3. Use a third-party service like Pusher, Ably, or Supabase Realtime
// 4. Use Server-Sent Events (SSE) as shown below

// This implementation uses Server-Sent Events (SSE) as a fallback
// SSE works with Next.js App Router and provides real-time updates

interface BalanceUpdate {
    walletId: string;
    newBalance: number;
    type: 'deposit' | 'deduction';
    amount: number;
    timestamp: string;
}

interface Notification {
    id: string;
    type: 'deposit' | 'deduction' | 'refill' | 'connection' | 'system';
    title: string;
    message: string;
    timestamp: string;
}

// In-memory store for demo purposes
// In production, use Redis or similar for multi-instance support
const clients: Map<string, WritableStreamDefaultWriter> = new Map();
const notifications: Notification[] = [];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Create a TransformStream for SSE
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Store the client connection
    clients.set(userId, writer);

    // Send initial connection message
    const connectMessage = `data: ${JSON.stringify({ type: 'connected', userId })}\n\n`;
    writer.write(encoder.encode(connectMessage));

    // Clean up on disconnect
    request.signal.addEventListener('abort', () => {
        clients.delete(userId);
        writer.close();
    });

    return new Response(stream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, targetUserId, data } = body;

        if (!type || !targetUserId) {
            return NextResponse.json(
                { error: 'type and targetUserId are required' },
                { status: 400 }
            );
        }

        const encoder = new TextEncoder();

        switch (type) {
            case 'balance:update': {
                const balanceUpdate: BalanceUpdate = {
                    walletId: data.walletId,
                    newBalance: data.newBalance,
                    type: data.type,
                    amount: data.amount,
                    timestamp: new Date().toISOString(),
                };

                // Send to specific user if connected
                const client = clients.get(targetUserId);
                if (client) {
                    const message = `data: ${JSON.stringify({ eventType: 'balance:update', ...balanceUpdate })}\n\n`;
                    await client.write(encoder.encode(message));
                }

                return NextResponse.json({ success: true, sent: !!client });
            }

            case 'notification': {
                const notification: Notification = {
                    id: `notif_${Date.now()}`,
                    type: data.notificationType || 'system',
                    title: data.title,
                    message: data.message,
                    timestamp: new Date().toISOString(),
                };

                // Store notification
                notifications.push(notification);

                // Send to specific user if connected
                const client = clients.get(targetUserId);
                if (client) {
                    const message = `data: ${JSON.stringify({ eventType: 'notification', ...notification })}\n\n`;
                    await client.write(encoder.encode(message));
                }

                return NextResponse.json({ success: true, notification, sent: !!client });
            }

            case 'refill:alert': {
                const client = clients.get(targetUserId);
                if (client) {
                    const message = `data: ${JSON.stringify({
                        type: 'refill:alert',
                        medicationId: data.medicationId,
                        medicationName: data.medicationName,
                        daysRemaining: data.daysRemaining,
                        timestamp: new Date().toISOString()
                    })}\n\n`;
                    await client.write(encoder.encode(message));
                }

                return NextResponse.json({ success: true, sent: !!client });
            }

            case 'broadcast': {
                // Send to all connected clients
                let sentCount = 0;
                for (const [, client] of clients) {
                    try {
                        const message = `data: ${JSON.stringify({ type: 'broadcast', ...data })}\n\n`;
                        await client.write(encoder.encode(message));
                        sentCount++;
                    } catch {
                        // Client disconnected
                    }
                }

                return NextResponse.json({ success: true, sentCount });
            }

            default:
                return NextResponse.json({ error: 'Unknown event type' }, { status: 400 });
        }
    } catch (error) {
        console.error('Socket API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Get connected clients count (for debugging)
export async function HEAD() {
    return new Response(null, {
        headers: {
            'X-Connected-Clients': clients.size.toString(),
        },
    });
}
