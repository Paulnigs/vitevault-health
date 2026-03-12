import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { User, Medication, Wallet, Notification } from '@/lib/models';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== 'pharmacy') {
            return NextResponse.json(
                { error: 'Unauthorized. Only pharmacies can approve refills.' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { medicationId } = body;

        if (!medicationId) {
            return NextResponse.json(
                { error: 'Medication ID is required' },
                { status: 400 }
            );
        }

        await dbConnect();

        const medication = await Medication.findById(medicationId);

        if (!medication) {
            return NextResponse.json(
                { error: 'Medication not found' },
                { status: 404 }
            );
        }

        if (medication.refillStatus !== 'requested') {
            return NextResponse.json(
                { error: 'This medication does not have a pending refill request' },
                { status: 400 }
            );
        }

        // Get the wallet
        const wallet = await Wallet.findById(medication.walletId);
        if (!wallet) {
            return NextResponse.json(
                { error: 'Associated wallet not found' },
                { status: 404 }
            );
        }

        // Check for locked funds for this medication and release them
        let unlockedAmount = 0;
        const matchingLocks = wallet.lockedFunds.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (lock: any) =>
                lock.isActive &&
                (lock.medicationName === medication.name ||
                    (lock.medicationId && lock.medicationId.toString() === medication._id.toString()))
        );

        if (matchingLocks.length > 0) {
            for (const lock of matchingLocks) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (lock as any).isActive = false;
                unlockedAmount += lock.amount;
            }
        }

        // Check if wallet has enough balance for refill
        if (wallet.balance < medication.refillCost) {
            // Save unlock changes even if insufficient
            await wallet.save();
            return NextResponse.json(
                {
                    error: 'Insufficient wallet balance for refill',
                    currentBalance: wallet.balance,
                    refillCost: medication.refillCost,
                    unlockedAmount,
                },
                { status: 402 }
            );
        }

        // Deduct refill cost from wallet
        wallet.balance -= medication.refillCost;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (wallet.transactions as any).push({
            amount: medication.refillCost,
            type: 'deduction',
            description: `Refill approved by ${session.user.name} for ${medication.name}${unlockedAmount > 0 ? ` (₦${unlockedAmount.toLocaleString()} from locked funds)` : ''}`,
            date: new Date(),
            schedule: 'one-time',
            medicationId: medication._id,
        });

        await wallet.save();

        // Refill the medication (resets qty, countdown, status)
        medication.refill();
        medication.refillStatus = 'approved';

        await medication.save();

        // Notify the parent
        await Notification.create({
            userId: wallet.owner,
            type: 'refill',
            title: 'Refill Approved! 💊',
            message: `${session.user.name} approved your refill for "${medication.name}". ₦${medication.refillCost.toLocaleString()} was deducted.${unlockedAmount > 0 ? ` ₦${unlockedAmount.toLocaleString()} was released from locked funds.` : ''}`,
            read: false,
            data: {
                medicationId: medication._id,
                amount: medication.refillCost,
                walletId: wallet._id,
                pharmacyId: session.user.id,
                unlockedAmount,
            },
        });

        return NextResponse.json({
            message: `Refill approved for ${medication.name}!`,
            medication: {
                id: medication._id,
                name: medication.name,
                refillStatus: medication.refillStatus,
                remainingQty: medication.remainingQty,
                countdownDays: medication.countdownDays,
            },
            deductedAmount: medication.refillCost,
            newBalance: wallet.balance,
            unlockedAmount,
        });
    } catch (error) {
        console.error('Refill approve error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
