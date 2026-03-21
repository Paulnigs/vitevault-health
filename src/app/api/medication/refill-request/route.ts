import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Users, Wallets, Medications, Notifications } from '@/lib/indexedDB';

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

        if (medication.refillStatus === 'pending_approval') {
            return NextResponse.json(
                { error: 'Refill already requested for this medication' },
                { status: 400 }
            );
        }

        // Get the wallet to find the parent
        const wallet = Wallets.findById(medication.walletId);
        if (!wallet) {
            return NextResponse.json(
                { error: 'Associated wallet not found' },
                { status: 404 }
            );
        }

        // Get the parent user (wallet owner)
        const parent = Users.findById(wallet.owner);
        if (!parent) {
            return NextResponse.json(
                { error: 'Parent user not found' },
                { status: 404 }
            );
        }

        // Find connected pharmacies
        const pharmacies = Users.findByIdsAndRole(parent.links || [], 'pharmacy');

        if (pharmacies.length === 0) {
            return NextResponse.json(
                { error: 'No connected pharmacy. Please connect to a pharmacy first.' },
                { status: 400 }
            );
        }

        // Update medication refill status
        const targetPharmacy = medication.pharmacyId
            ? (pharmacies.find(p => p._id === medication.pharmacyId) || pharmacies[0])
            : pharmacies[0];

        Medications.update(medicationId, {
            refillStatus: 'pending_approval',
            refillRequestedAt: new Date().toISOString(),
            refillRequestedBy: parent._id,
            pharmacyId: targetPharmacy._id,
            countdownActive: false,
        });

        // Create notification for the pharmacy
        Notifications.create({
            userId: targetPharmacy._id,
            type: 'refill',
            title: 'New Refill Request',
            message: `${parent.name} has requested a refill for "${medication.name}" — ₦${medication.refillCost.toLocaleString()}.`,
            read: false,
            data: {
                medicationId: medication._id,
                parentId: parent._id,
                walletId: wallet._id,
                amount: medication.refillCost,
            },
        });

        // Also notify the parent
        Notifications.create({
            userId: parent._id,
            type: 'refill',
            title: 'Refill Request Sent',
            message: `Your refill request for "${medication.name}" has been sent to ${targetPharmacy.name}.`,
            read: false,
            data: {
                medicationId: medication._id,
                pharmacyName: targetPharmacy.name,
            },
        });

        return NextResponse.json({
            message: `Refill request sent to ${targetPharmacy.name}!`,
            medication: {
                id: medication._id,
                name: medication.name,
                refillStatus: 'pending_approval',
            },
        });
    } catch (error) {
        console.error('Refill request error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
