import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Wallet } from '@/lib/models';
import { validateCard } from '@/lib/cardValidation';
import type { ScheduleType } from '@/lib/models/Wallet';
import mongoose from 'mongoose';

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
        const { walletId, amount, cardDetails, schedule = 'one-time' } = body;

        // Validation
        if (!walletId || !amount || !cardDetails) {
            return NextResponse.json(
                { error: 'Wallet ID, amount, and card details are required' },
                { status: 400 }
            );
        }

        if (amount <= 0) {
            return NextResponse.json(
                { error: 'Amount must be greater than 0' },
                { status: 400 }
            );
        }

        // Validate card (demo mode)
        const cardValidation = validateCard(cardDetails);
        if (!cardValidation.valid) {
            return NextResponse.json(
                { error: cardValidation.error },
                { status: 400 }
            );
        }

        await dbConnect();

        // Find wallet
        const wallet = await Wallet.findById(walletId);
        if (!wallet) {
            return NextResponse.json(
                { error: 'Wallet not found' },
                { status: 404 }
            );
        }

        // Add transaction directly to wallet
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (wallet.transactions as any).push({
            amount,
            type: 'deposit',
            description: `Deposit via ${cardValidation.cardType?.toUpperCase() || 'Card'} ending in ${cardDetails.number.slice(-4)}`,
            date: new Date(),
            schedule: schedule as ScheduleType,
            fromUserId: new mongoose.Types.ObjectId(session.user.id),
        });
        wallet.balance += amount;

        // If scheduled deposit, add to schedule
        if (schedule !== 'one-time') {
            const scheduleMap = {
                daily: 1,
                weekly: 7,
                monthly: 30,
            };
            const daysToAdd = scheduleMap[schedule as keyof typeof scheduleMap] || 30;
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + daysToAdd);

            wallet.scheduledDeposits.push({
                amount,
                schedule: schedule as ScheduleType,
                nextDate,
                fromUserId: new mongoose.Types.ObjectId(session.user.id),
                isActive: true,
            });
        }

        await wallet.save();

        return NextResponse.json(
            {
                message: 'Deposit successful',
                balance: wallet.balance,
                transaction: {
                    amount,
                    type: 'deposit',
                    cardType: cardValidation.cardType,
                    schedule,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Deposit error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
