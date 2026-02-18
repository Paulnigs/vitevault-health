import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Wallet, Notification } from '@/lib/models';
import mongoose from 'mongoose';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { action, medicationName, amount, durationDays, lockId } = body;

        await dbConnect();
        const wallet = await Wallet.findById(id);

        if (!wallet) {
            return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
        }

        // Check ownership (or if user is authorized) -> simple check for now
        // if (wallet.owner.toString() !== session.user.id) ... 

        if (action === 'create') {
            if (!medicationName || !amount || amount <= 0) {
                return NextResponse.json({ error: 'Invalid lock details' }, { status: 400 });
            }

            // Check available balance (Total - Existing Locks)
            if ((wallet as any).availableBalance < amount) {
                return NextResponse.json({ error: 'Insufficient available balance to lock' }, { status: 400 });
            }

            const unlockDate = new Date();
            unlockDate.setDate(unlockDate.getDate() + (Number(durationDays) || 30));

            const newLock = {
                _id: new mongoose.Types.ObjectId(),
                medicationName,
                amount,
                lockedAt: new Date(),
                unlocksAt: unlockDate,
                isActive: true,
            };

            wallet.lockedFunds.push(newLock);
            await wallet.save();

            return NextResponse.json({ message: 'Funds locked successfully', lock: newLock });
        }

        if (action === 'emergency_unlock') {
            if (!lockId) {
                return NextResponse.json({ error: 'Lock ID required' }, { status: 400 });
            }

            const lockIndex = wallet.lockedFunds.findIndex(l => l._id.toString() === lockId && l.isActive);
            if (lockIndex === -1) {
                return NextResponse.json({ error: 'Active lock not found' }, { status: 404 });
            }

            const lock = wallet.lockedFunds[lockIndex];
            const penalty = lock.amount * 0.05; // 5% fee

            // Deduct fee from balance
            wallet.balance -= penalty;

            // Add transaction for fee
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (wallet.transactions as any).push({
                amount: penalty,
                type: 'deduction',
                description: `Emergency Unlock Fee (5%) for ${lock.medicationName}`,
                date: new Date(),
                schedule: 'one-time',
                fromUserId: new mongoose.Types.ObjectId(session.user.id),
            });

            // Deactivate lock
            wallet.lockedFunds[lockIndex].isActive = false;

            await wallet.save();

            // Notify
            await Notification.create({
                userId: wallet.owner,
                type: 'system',
                title: 'Funds Unlocked (Emergency)',
                message: `Locked funds for ${lock.medicationName} released. Fee: ₦${penalty.toLocaleString()}`,
                read: false,
                data: { walletId: wallet._id, fee: penalty }
            });

            return NextResponse.json({
                message: 'Funds unlocked',
                fee: penalty,
                remainingAmount: lock.amount - penalty
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Lock API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
