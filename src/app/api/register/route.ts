import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Users, Wallets } from '@/lib/indexedDB';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password, name, role } = body;

        // Validation
        if (!email || !password || !name || !role) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        if (!['child', 'parent', 'pharmacy'].includes(role)) {
            return NextResponse.json(
                { error: 'Invalid role. Must be child, parent, or pharmacy' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = Users.findByEmail(email);
        if (existingUser) {
            return NextResponse.json(
                { error: 'Email already registered' },
                { status: 409 }
            );
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const user = Users.create({
            email: email.toLowerCase(),
            passwordHash,
            name,
            role,
        });

        // If parent, create a wallet
        if (role === 'parent') {
            const wallet = Wallets.create({
                owner: user._id,
                balance: 0,
            });
            Users.update(user._id, { walletId: wallet._id });
        }

        return NextResponse.json(
            {
                message: 'User registered successfully',
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    linkCode: user.linkCode,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
