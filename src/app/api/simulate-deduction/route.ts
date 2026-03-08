import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Medication, Wallet, Notification } from '@/lib/models';

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
        const { medicationId, daysToSimulate = 1, daysToSkip } = body;

        // Support both field names (daysToSimulate and daysToSkip)
        const daysToAdvance = daysToSkip || daysToSimulate;

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

        // Simulate days passing
        const usedAmount = medication.usageRate * daysToAdvance;
        medication.remainingQty = Math.max(0, medication.remainingQty - usedAmount);

        let deductionMade = false;
        let newBalance = 0;
        let unlockedAmount = 0;

        // Check if refill is needed (medication ran out)
        if (medication.remainingQty <= 0) {
            const wallet = await Wallet.findById(medication.walletId);

            if (!wallet) {
                return NextResponse.json(
                    { error: 'Associated wallet not found' },
                    { status: 404 }
                );
            }

            // STEP 1: Check if there are locked funds for this medication
            // If so, "unlock" (release) them to the available balance first
            const matchingLocks = wallet.lockedFunds.filter(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (lock: any) =>
                    lock.isActive &&
                    (lock.medicationName === medication.name ||
                        (lock.medicationId && lock.medicationId.toString() === medication._id.toString()))
            );

            if (matchingLocks.length > 0) {
                // Move locked funds to available balance (mark locks as inactive)
                for (const lock of matchingLocks) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (lock as any).isActive = false;
                    unlockedAmount += lock.amount;
                }

                // Create a notification for the unlock
                await Notification.create({
                    userId: wallet.owner,
                    type: 'system',
                    title: 'Locked Funds Released',
                    message: `₦${unlockedAmount.toLocaleString()} locked for "${medication.name}" has been released to your available balance for refill.`,
                    read: false,
                    data: {
                        medicationId: medication._id,
                        amount: unlockedAmount,
                        walletId: wallet._id,
                    },
                });
            }

            // STEP 2: Now check the total available balance (including just-unlocked funds)
            // Note: The wallet.balance already includes locked amounts, 
            // but now those locked amounts are available since we unlocked them above
            if (wallet.balance < medication.refillCost) {
                // Even after unlocking, not enough balance
                await wallet.save(); // Save the unlock changes
                return NextResponse.json(
                    {
                        warning: 'Low balance – add funds?',
                        currentBalance: wallet.balance,
                        refillCost: medication.refillCost,
                        medication: medication.name,
                        unlockedAmount,
                    },
                    { status: 402 }
                );
            }

            // STEP 3: Deduct refill cost from wallet balance
            wallet.balance -= medication.refillCost;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (wallet.transactions as any).push({
                amount: medication.refillCost,
                type: 'deduction',
                description: `Auto-refill for ${medication.name}${unlockedAmount > 0 ? ` (₦${unlockedAmount.toLocaleString()} from locked funds)` : ''}`,
                date: new Date(),
                schedule: 'one-time',
                medicationId: medication._id,
            });

            await wallet.save();

            // Refill medication
            medication.remainingQty = medication.totalQty;
            medication.lastRefillDate = new Date();

            deductionMade = true;
            newBalance = wallet.balance;

            // Create notification for the deduction
            await Notification.create({
                userId: wallet.owner,
                type: 'deduction',
                title: 'Auto-Refill Processed',
                message: `₦${medication.refillCost.toLocaleString()} was deducted for ${medication.name} refill.${unlockedAmount > 0 ? ` ₦${unlockedAmount.toLocaleString()} was released from locked funds.` : ''}`,
                read: false,
                data: {
                    medicationId: medication._id,
                    amount: medication.refillCost,
                    walletId: wallet._id,
                    unlockedAmount,
                }
            });
        }

        await medication.save();

        const countdownDays = Math.floor(medication.remainingQty / medication.usageRate);

        return NextResponse.json({
            message: deductionMade
                ? `₦${medication.refillCost.toLocaleString()} deducted for ${medication.name} refill${unlockedAmount > 0 ? ` (₦${unlockedAmount.toLocaleString()} released from locked funds)` : ''}`
                : `Simulated ${daysToAdvance} day(s) of usage`,
            medication: {
                id: medication._id,
                name: medication.name,
                remainingQty: medication.remainingQty,
                countdownDays,
            },
            deducted: deductionMade,
            deductionMade,
            newCountdownDays: countdownDays,
            ...(deductionMade && {
                deductedAmount: medication.refillCost,
                newBalance,
                unlockedAmount,
            }),
        });
    } catch (error) {
        console.error('Simulate deduction error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
