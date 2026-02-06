import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { User } from '@/lib/models';

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
        const { linkCode, linkType } = body;

        if (!linkCode) {
            return NextResponse.json(
                { error: 'Link code is required' },
                { status: 400 }
            );
        }

        await dbConnect();

        const currentUser = await User.findById(session.user.id);
        if (!currentUser) {
            return NextResponse.json(
                { error: 'Current user not found' },
                { status: 404 }
            );
        }

        // Find user with the link code
        const targetUser = await User.findOne({ linkCode: linkCode.toUpperCase() });
        if (!targetUser) {
            return NextResponse.json(
                { error: 'No user found with this link code' },
                { status: 404 }
            );
        }

        // Prevent self-linking
        if (targetUser._id.toString() === currentUser._id.toString()) {
            return NextResponse.json(
                { error: 'Cannot link to yourself' },
                { status: 400 }
            );
        }

        // Validate link type based on roles
        const currentRole = currentUser.role;
        const targetRole = targetUser.role;

        // Valid links:
        // - child -> parent
        // - parent -> pharmacy
        // - pharmacy -> parent
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
        currentUser.links.push(targetUser._id);
        targetUser.links.push(currentUser._id);

        await currentUser.save();
        await targetUser.save();

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

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please login.' },
                { status: 401 }
            );
        }

        await dbConnect();

        const user = await User.findById(session.user.id)
            .populate('links', 'name email role avatar');

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            linkCode: user.linkCode,
            links: user.links,
        });
    } catch (error) {
        console.error('Get links error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
