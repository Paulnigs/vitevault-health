import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Notifications } from '@/lib/indexedDB';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const unreadOnly = url.searchParams.get('unread') === 'true';

        const notifications = Notifications.findByUserId(session.user.id, limit, unreadOnly);

        return NextResponse.json({ notifications });
    } catch (error) {
        console.error('Notifications fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch notifications' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { notificationIds, markAll } = body;

        if (markAll) {
            Notifications.markAllRead(session.user.id);
            return NextResponse.json({ message: 'All notifications marked as read' });
        }

        if (notificationIds && Array.isArray(notificationIds)) {
            Notifications.markRead(notificationIds, session.user.id);
            return NextResponse.json({ message: 'Notifications marked as read' });
        }

        return NextResponse.json(
            { error: 'Invalid request parameters' },
            { status: 400 }
        );

    } catch (error) {
        console.error('Notifications update error:', error);
        return NextResponse.json(
            { error: 'Failed to update notifications' },
            { status: 500 }
        );
    }
}
