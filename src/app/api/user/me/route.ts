import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Users } from '@/lib/indexedDB';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const user = Users.findByEmail(session.user.email);

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                links: user.links || [],
                walletId: user.walletId,
                createdAt: user.createdAt,
                notifications: user.notifications,
            },
        });
    } catch (error) {
        console.error('User fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch user data' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { name, notificationPrefs } = body;

        const user = Users.findByEmail(session.user.email);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const updateData: Record<string, unknown> = {};
        if (name) updateData.name = name;
        if (notificationPrefs) updateData.notifications = notificationPrefs;

        Users.update(user._id, updateData);
        
        const updatedUser = Users.findById(user._id)!;

        return NextResponse.json({
            user: {
                id: updatedUser._id,
                email: updatedUser.email,
                name: updatedUser.name,
                role: updatedUser.role,
                links: updatedUser.links || [],
                walletId: updatedUser.walletId,
                notifications: updatedUser.notifications,
            },
        });
    } catch (error) {
        console.error('User update error:', error);
        return NextResponse.json(
            { error: 'Failed to update user data' },
            { status: 500 }
        );
    }
}
