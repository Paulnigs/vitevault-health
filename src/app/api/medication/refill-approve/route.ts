import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Users, Wallets, Medications, Notifications } from '@/lib/indexedDB';

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

        const medication = Medications.findById(medicationId);

        if (!medication) {
            return NextResponse.json(
                { error: 'Medication not found' },
                { status: 404 }
            );
        }

        if (medication.refillStatus !== 'pending_approval') {
            return NextResponse.json(
                { error: 'This medication does not have a pending refill request' },
                { status: 400 }
            );
        }

        // Get the wallet
        const wallet = Wallets.findById(medication.walletId);
        if (!wallet) {
            return NextResponse.json(
                { error: 'Associated wallet not found' },
                { status: 404 }
            );
        }

        // ✅ KEY CHANGE: NO automatic deduction on approval
        // The pharmacy will manually charge from locked funds when countdown expires

        // Calculate countdown end date (when medication will run out)
        const daysSupply = medication.usageRate > 0
            ? Math.floor(medication.totalQty / medication.usageRate)
            : 30;
        const countdownEndDate = new Date(Date.now() + daysSupply * 24 * 60 * 60 * 1000);

        // Update medication: approve and start countdown
        Medications.update(medicationId, {
            refillStatus: 'approved',
            countdownActive: true,
            countdownEndDate: countdownEndDate.toISOString(),
            remainingQty: medication.totalQty,
            lastRefillDate: new Date().toISOString(),
        });

        const updatedMed = Medications.findById(medicationId)!;

        // Notify the parent
        Notifications.create({
            userId: wallet.owner,
            type: 'refill',
            title: 'Medication Approved! 💊',
            message: `${session.user.name} approved your medication "${medication.name}". The countdown has started (${daysSupply} days).`,
            read: false,
            data: {
                medicationId: medication._id,
                walletId: wallet._id,
                pharmacyId: session.user.id,
                daysSupply,
            },
        });

        return NextResponse.json({
            message: `Medication "${medication.name}" approved! Countdown started.`,
            medication: {
                id: updatedMed._id,
                name: updatedMed.name,
                refillStatus: updatedMed.refillStatus,
                remainingQty: updatedMed.remainingQty,
                countdownDays: daysSupply,
                countdownActive: updatedMed.countdownActive,
                countdownEndDate: updatedMed.countdownEndDate,
            },
        });
    } catch (error) {
        console.error('Refill approve error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
