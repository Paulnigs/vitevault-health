import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Wallet, Notification } from '@/lib/models';
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
        const {
            walletId,
            amount,
            cardNumber, // direct fields from frontend
            expiry,
            cvv,
            schedule = 'one-time',
            lockSettings // { enabled, medicationName, amount, durationDays }
        } = body;

        // Map fields to cardDetails expectation
        const cardDetails = {
            number: cardNumber || body.cardDetails?.number,
            expiry: expiry || body.cardDetails?.expiry,
            cvv: cvv || body.cardDetails?.cvv
        };

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

        // Handle Locked Funds
        if (lockSettings?.enabled && lockSettings.medicationName && lockSettings.amount) {
            const lockAmount = Number(lockSettings.amount);
            const duration = Number(lockSettings.durationDays) || 30;

            if (lockAmount > 0 && lockAmount <= wallet.balance) {
                const unlockDate = new Date();
                unlockDate.setDate(unlockDate.getDate() + duration);

                wallet.lockedFunds.push({
                    _id: new mongoose.Types.ObjectId(),
                    medicationName: lockSettings.medicationName,
                    amount: lockAmount,
                    lockedAt: new Date(),
                    unlocksAt: unlockDate,
                    isActive: true,
                });
            }
        }

        await wallet.save();

        // Create notification for wallet owner
        await Notification.create({
            userId: wallet.owner,
            type: 'deposit',
            title: 'Deposit Received',
            message: `₦${amount.toLocaleString()} was deposited to your wallet via ${cardValidation.cardType || 'Card'}.`,
            read: false,
            data: {
                walletId: wallet._id,
                amount,
                fromUserId: session.user.id
            }
        });

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
