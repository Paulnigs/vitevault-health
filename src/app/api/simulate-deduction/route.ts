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
        const { medicationId, daysToSimulate = 1 } = body;

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
        const usedAmount = medication.usageRate * daysToSimulate;
        medication.remainingQty = Math.max(0, medication.remainingQty - usedAmount);

        let deductionMade = false;
        let newBalance = 0;

        // Check if refill is needed
        if (medication.remainingQty <= 0) {
            const wallet = await Wallet.findById(medication.walletId);

            if (!wallet) {
                return NextResponse.json(
                    { error: 'Associated wallet not found' },
                    { status: 404 }
                );
            }

            // Check balance
            if (wallet.balance < medication.refillCost) {
                return NextResponse.json(
                    {
                        warning: 'Low balance – add funds?',
                        currentBalance: wallet.balance,
                        refillCost: medication.refillCost,
                        medication: medication.name,
                    },
                    { status: 402 } // Payment Required
                );
            }

            // Deduct and refill
            wallet.balance -= medication.refillCost;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (wallet.transactions as any).push({
                amount: medication.refillCost,
                type: 'deduction',
                description: `Auto-refill for ${medication.name}`,
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

            // Create notification
            await Notification.create({
                userId: wallet.owner,
                type: 'deduction',
                title: 'Auto-Refill Processed',
                message: `₦${medication.refillCost.toLocaleString()} was deducted for ${medication.name} refill.`,
                read: false,
                data: {
                    medicationId: medication._id,
                    amount: medication.refillCost,
                    walletId: wallet._id
                }
            });
        }

        await medication.save();

        const countdownDays = Math.floor(medication.remainingQty / medication.usageRate);

        return NextResponse.json({
            message: deductionMade
                ? `₦${medication.refillCost.toLocaleString()} deducted for ${medication.name} refill`
                : `Simulated ${daysToSimulate} day(s) of usage`,
            medication: {
                id: medication._id,
                name: medication.name,
                remainingQty: medication.remainingQty,
                countdownDays,
            },
            deductionMade,
            ...(deductionMade && {
                deductedAmount: medication.refillCost,
                newBalance,
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
