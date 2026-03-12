import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { User, Medication, Wallet, Notification } from '@/lib/models';

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

        // Also advance the countdownEndDate backwards by daysToAdvance
        if (medication.countdownEndDate) {
            const newEnd = new Date(medication.countdownEndDate.getTime() - daysToAdvance * 24 * 60 * 60 * 1000);
            medication.countdownEndDate = newEnd;
        } else {
            // Set a countdownEndDate if not set
            const daysLeft = medication.usageRate > 0
                ? Math.floor(medication.remainingQty / medication.usageRate)
                : 999;
            medication.countdownEndDate = new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000);
        }

        let deductionMade = false;
        let newBalance = 0;
        let unlockedAmount = 0;
        let refillRequested = false;

        // Check if medication ran out
        if (medication.remainingQty <= 0) {
            const wallet = await Wallet.findById(medication.walletId);

            if (!wallet) {
                return NextResponse.json(
                    { error: 'Associated wallet not found' },
                    { status: 404 }
                );
            }

            // STEP 1: Release locked funds for this medication
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

                await Notification.create({
                    userId: wallet.owner,
                    type: 'system',
                    title: 'Locked Funds Released',
                    message: `₦${unlockedAmount.toLocaleString()} locked for "${medication.name}" has been released to your available balance.`,
                    read: false,
                    data: {
                        medicationId: medication._id,
                        amount: unlockedAmount,
                        walletId: wallet._id,
                    },
                });
            }

            // STEP 2: Check balance and deduct
            if (wallet.balance < medication.refillCost) {
                await wallet.save();

                // Still send notification that medication finished
                await Notification.create({
                    userId: wallet.owner,
                    type: 'refill',
                    title: 'Medication Finished ⚠️',
                    message: `"${medication.name}" has run out! Insufficient balance (₦${wallet.balance.toLocaleString()}) for refill (₦${medication.refillCost.toLocaleString()}). Please add funds.`,
                    read: false,
                    data: {
                        medicationId: medication._id,
                        refillCost: medication.refillCost,
                        walletId: wallet._id,
                    },
                });

                await medication.save();

                return NextResponse.json(
                    {
                        warning: 'Medication finished. Low balance – add funds!',
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
                description: `Auto-charge for ${medication.name} refill${unlockedAmount > 0 ? ` (₦${unlockedAmount.toLocaleString()} from locked funds)` : ''}`,
                date: new Date(),
                schedule: 'one-time',
                medicationId: medication._id,
            });

            await wallet.save();
            deductionMade = true;
            newBalance = wallet.balance;

            // STEP 4: Send refill request to connected pharmacy
            const parent = await User.findById(wallet.owner);
            if (parent) {
                const pharmacies = await User.find({
                    _id: { $in: parent.links || [] },
                    role: 'pharmacy',
                });

                const targetPharmacy = medication.pharmacyId
                    ? pharmacies.find(p => p._id.toString() === medication.pharmacyId?.toString()) || pharmacies[0]
                    : pharmacies[0];

                if (targetPharmacy) {
                    // Set refill status to 'requested'
                    medication.refillStatus = 'requested';
                    medication.refillRequestedAt = new Date();
                    medication.refillRequestedBy = parent._id;
                    if (!medication.pharmacyId) {
                        medication.pharmacyId = targetPharmacy._id;
                    }
                    refillRequested = true;

                    // Notify pharmacy
                    await Notification.create({
                        userId: targetPharmacy._id,
                        type: 'refill',
                        title: 'Refill Request (Auto-Charge)',
                        message: `${parent.name}'s "${medication.name}" has finished. ₦${medication.refillCost.toLocaleString()} has been charged. Please approve the refill.`,
                        read: false,
                        data: {
                            medicationId: medication._id,
                            parentId: parent._id,
                            walletId: wallet._id,
                            amount: medication.refillCost,
                        },
                    });

                    // Notify parent
                    await Notification.create({
                        userId: wallet.owner,
                        type: 'refill',
                        title: 'Medication Finished — Refill Requested 💊',
                        message: `"${medication.name}" has run out. ₦${medication.refillCost.toLocaleString()} was charged and a refill request has been sent to ${targetPharmacy.name}.`,
                        read: false,
                        data: {
                            medicationId: medication._id,
                            amount: medication.refillCost,
                            walletId: wallet._id,
                            pharmacyName: targetPharmacy.name,
                            unlockedAmount,
                        },
                    });
                } else {
                    // No pharmacy connected — notify parent
                    await Notification.create({
                        userId: wallet.owner,
                        type: 'refill',
                        title: 'Medication Finished ⚠️',
                        message: `"${medication.name}" has run out. ₦${medication.refillCost.toLocaleString()} was charged. No pharmacy connected — please connect a pharmacy to process refills.`,
                        read: false,
                        data: {
                            medicationId: medication._id,
                            amount: medication.refillCost,
                            walletId: wallet._id,
                            unlockedAmount,
                        },
                    });
                }
            }
        }

        await medication.save();

        const countdownDays = medication.countdownEndDate
            ? Math.max(0, Math.floor((new Date(medication.countdownEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : Math.floor(medication.remainingQty / medication.usageRate);

        return NextResponse.json({
            message: deductionMade
                ? `₦${medication.refillCost.toLocaleString()} charged for ${medication.name}.${refillRequested ? ' Refill request sent to pharmacy.' : ''}${unlockedAmount > 0 ? ` ₦${unlockedAmount.toLocaleString()} released from locked funds.` : ''}`
                : `Simulated ${daysToAdvance} day(s) of usage`,
            medication: {
                id: medication._id,
                name: medication.name,
                remainingQty: medication.remainingQty,
                countdownDays,
                countdownEndDate: medication.countdownEndDate?.toISOString() || null,
                refillStatus: medication.refillStatus,
            },
            deducted: deductionMade,
            deductionMade,
            refillRequested,
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

