import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Users, Medications, Wallets, Notifications } from '@/lib/indexedDB';

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

        const daysToAdvance = daysToSkip || daysToSimulate;

        if (!medicationId) {
            return NextResponse.json(
                { error: 'Medication ID is required' },
                { status: 400 }
            );
        }

        const medication = Medications.findById(medicationId);

        if (!medication) {
            return NextResponse.json(
                { error: 'Medication not found' },
                { status: 404 }
            );
        }

        // Simulate days passing
        const usedAmount = medication.usageRate * daysToAdvance;
        medication.remainingQty = Math.max(0, medication.remainingQty - usedAmount);

        // Advance the countdownEndDate backwards by daysToAdvance
        if (medication.countdownEndDate) {
            const newEnd = new Date(new Date(medication.countdownEndDate).getTime() - daysToAdvance * 24 * 60 * 60 * 1000);
            medication.countdownEndDate = newEnd.toISOString();
        } else {
            const daysLeft = medication.usageRate > 0
                ? Math.floor(medication.remainingQty / medication.usageRate)
                : 999;
            medication.countdownEndDate = new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000).toISOString();
        }

        let refillRequested = false;

        // Check if medication ran out
        if (medication.remainingQty <= 0) {
            const wallet = Wallets.findById(medication.walletId);

            if (wallet) {
                // Countdown expired - medication ran out
                const parent = Users.findById(wallet.owner);
                if (parent) {
                    // Find connected pharmacies
                    const pharmacies = Users.findByIdsAndRole(parent.links || [], 'pharmacy');

                    if (pharmacies.length > 0) {
                        // Trigger refill request automatically
                        medication.refillStatus = 'pending_approval';
                        medication.refillRequestedAt = new Date().toISOString();
                        medication.refillRequestedBy = parent._id;
                        medication.countdownActive = false;

                        const targetPharmacy = pharmacies[0];
                        if (!medication.pharmacyId) {
                            medication.pharmacyId = targetPharmacy._id;
                        }

                        // Notify pharmacy
                        Notifications.create({
                            userId: targetPharmacy._id,
                            type: 'refill',
                            title: 'Auto Refill Request',
                            message: `${parent.name}'s "${medication.name}" has run out! Refill request sent. Amount: ₦${medication.refillCost.toLocaleString()}`,
                            read: false,
                            data: {
                                medicationId: medication._id,
                                parentId: parent._id,
                                walletId: wallet._id,
                                amount: medication.refillCost,
                            },
                        });

                        // Notify parent
                        Notifications.create({
                            userId: parent._id,
                            type: 'refill',
                            title: 'Medication Finished - Refill Requested',
                            message: `"${medication.name}" has run out! Refill request auto-sent to ${targetPharmacy.name}.`,
                            read: false,
                            data: {
                                medicationId: medication._id,
                                pharmacyName: targetPharmacy.name,
                            },
                        });

                        refillRequested = true;
                    } else {
                        // No pharmacy connected
                        Notifications.create({
                            userId: parent._id,
                            type: 'refill',
                            title: 'Medication Finished - No Pharmacy Connected',
                            message: `"${medication.name}" has run out, but no pharmacy is connected.`,
                            read: false,
                            data: { medicationId: medication._id },
                        });
                    }
                }
            }
        }

        Medications.save(medication);

        const countdownDays = medication.countdownEndDate
            ? Math.max(0, Math.floor((new Date(medication.countdownEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : Math.floor(medication.remainingQty / medication.usageRate);

        return NextResponse.json({
            message: `Simulated ${daysToAdvance} day(s) of usage${refillRequested ? '. Refill request sent to pharmacy.' : ''}`,
            medication: {
                id: medication._id,
                name: medication.name,
                remainingQty: medication.remainingQty,
                countdownDays,
                countdownEndDate: medication.countdownEndDate || null,
                refillStatus: medication.refillStatus,
            },
            refillRequested,
            newCountdownDays: countdownDays,
        });
    } catch (error) {
        console.error('Simulate deduction error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
