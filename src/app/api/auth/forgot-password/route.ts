import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import { User } from '@/lib/models';
import { sendResetPasswordEmail } from '@/lib/mail';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        await dbConnect();
        const user = await User.findOne({ email });

        if (!user) {
            // Return success even if user not found for security
            return NextResponse.json({ message: 'If an account exists, a reset link was sent.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 3600000); // 1 hour

        user.resetToken = token;
        user.resetTokenExpiry = expiry;
        await user.save();

        await sendResetPasswordEmail(email, token);

        return NextResponse.json({ message: 'If an account exists, a reset link was sent.' });
    } catch (error: any) {
        console.error('FORGOT_PASSWORD_ERROR:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
