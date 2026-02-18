import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Notification } from '@/lib/models';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        await dbConnect();

        // Get query parameters
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const unreadOnly = url.searchParams.get('unread') === 'true';

        const query: Record<string, unknown> = { userId: session.user.id };
        if (unreadOnly) {
            query.read = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(limit);

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

        await dbConnect();

        if (markAll) {
            await Notification.updateMany(
                { userId: session.user.id, read: false },
                { $set: { read: true } }
            );
            return NextResponse.json({ message: 'All notifications marked as read' });
        }

        if (notificationIds && Array.isArray(notificationIds)) {
            await Notification.updateMany(
                { _id: { $in: notificationIds }, userId: session.user.id },
                { $set: { read: true } }
            );
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

// Function to easily create notifications from other APIs (internal use)
// This isn't an export for the route, but a helper if we were in the same file.
// Since we are not, code in other files should import Notification model directly.
