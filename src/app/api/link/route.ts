import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Users } from '@/lib/indexedDB';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please login.' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { linkCode } = body;

        if (!linkCode) {
            return NextResponse.json(
                { error: 'Link code is required' },
                { status: 400 }
            );
        }

        const currentUser = Users.findById(session.user.id);
        if (!currentUser) {
            return NextResponse.json(
                { error: 'Current user not found' },
                { status: 404 }
            );
        }

        // Find user with the link code
        const targetUser = Users.findByLinkCode(linkCode);
        if (!targetUser) {
            return NextResponse.json(
                { error: 'No user found with this link code' },
                { status: 404 }
            );
        }

        // Prevent self-linking
        if (targetUser._id === currentUser._id) {
            return NextResponse.json(
                { error: 'Cannot link to yourself' },
                { status: 400 }
            );
        }

        // Validate link type based on roles
        const currentRole = currentUser.role;
        const targetRole = targetUser.role;

        const validLinks: Record<string, string[]> = {
            child: ['parent'],
            parent: ['pharmacy', 'child'],
            pharmacy: ['parent'],
        };

        if (!validLinks[currentRole]?.includes(targetRole)) {
            return NextResponse.json(
                { error: `Cannot link ${currentRole} to ${targetRole}` },
                { status: 400 }
            );
        }

        // Check if already linked
        if (currentUser.links.includes(targetUser._id)) {
            return NextResponse.json(
                { error: 'Already linked to this user' },
                { status: 400 }
            );
        }

        // Add bidirectional link
        Users.update(currentUser._id, {
            links: [...currentUser.links, targetUser._id],
        });
        Users.update(targetUser._id, {
            links: [...targetUser.links, currentUser._id],
        });

        return NextResponse.json({
            message: 'Link created successfully',
            linkedUser: {
                id: targetUser._id,
                name: targetUser.name,
                email: targetUser.email,
                role: targetUser.role,
            },
        });
    } catch (error) {
        console.error('Link error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please login.' },
                { status: 401 }
            );
        }

        const user = Users.findById(session.user.id);

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const linkedUsers = Users.findByIds(user.links || []).map(u => ({
            _id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
            avatar: u.avatar,
        }));

        return NextResponse.json({
            linkCode: user.linkCode,
            links: linkedUsers,
        });
    } catch (error) {
        console.error('Get links error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
