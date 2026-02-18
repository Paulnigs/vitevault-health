import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { User, Wallet, Notification } from '@/lib/models';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'pharmacy') {
            return NextResponse.json({ error: 'Unauthorized. Only pharmacies can process payments.' }, { status: 401 });
        }

        const body = await request.json();
        const { linkCode, medicationName, amount } = body;

        if (!linkCode || !amount || amount <= 0) {
            return NextResponse.json({ error: 'Link code and valid amount are required' }, { status: 400 });
        }

        await dbConnect();

        // 1. Verify Parent (User)
        const parent = await User.findOne({ linkCode: linkCode.toUpperCase() });
        if (!parent) {
            return NextResponse.json({ error: 'Invalid link code' }, { status: 404 });
        }

        // 2. Verify Wallet
        const wallet = await Wallet.findOne({ owner: parent._id });
        if (!wallet) {
            return NextResponse.json({ error: 'Parent has no active wallet' }, { status: 404 });
        }

        // 3. Smart Deduction Logic
        let deductedFromLocked = false;
        let lockIdToUpdate = null;
        let remainingToDeduct = amount;

        // Check for active lock for this medication
        const relevantLock = wallet.lockedFunds.find(l =>
            l.isActive &&
            l.medicationName.toLowerCase() === medicationName?.toLowerCase() &&
            l.amount >= remainingToDeduct && // Simpler: Full coverage required for now or partial? Let's say full.
            new Date(l.unlocksAt) > new Date()
        );

        if (relevantLock) {
            // Use Locked Funds
            relevantLock.amount -= remainingToDeduct;
            if (relevantLock.amount <= 0) { // Should not happen with >= check but safe
                relevantLock.isActive = false;
            }
            deductedFromLocked = true;
            lockIdToUpdate = relevantLock._id;
        } else {
            // Check Available Balance (Total - Active Locks)
            if ((wallet as any).availableBalance < remainingToDeduct) {
                return NextResponse.json({
                    error: 'Insufficient available funds. Funds may be locked for other medications.',
                    details: { available: (wallet as any).availableBalance, required: amount }
                }, { status: 400 });
            }
        }

        // Deduct from total balance
        wallet.balance -= amount;

        // Record Transaction
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (wallet.transactions as any).push({
            amount,
            type: 'deduction',
            description: `Pharmacy Payment: ${medicationName || 'Medication'} ${deductedFromLocked ? '(Locked Funds)' : ''}`,
            date: new Date(),
            schedule: 'one-time',
            fromUserId: new mongoose.Types.ObjectId(session.user.id),
        });

        await wallet.save();

        // Notifications
        await Notification.create({
            userId: parent._id,
            type: 'deduction',
            title: 'Pharmacy Payment Processed',
            message: `₦${amount.toLocaleString()} paid to ${session.user.name} for ${medicationName}.`,
            read: false,
            data: { walletId: wallet._id, amount, pharmacyId: session.user.id }
        });

        return NextResponse.json({
            message: 'Payment processed successfully',
            newBalance: wallet.balance,
            transactionId: wallet.transactions[wallet.transactions.length - 1]._id
        });

    } catch (error) {
        console.error('Pharmacy deduction error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
