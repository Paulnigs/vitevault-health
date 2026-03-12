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

        if (medication.refillStatus === 'requested') {
            return NextResponse.json(
                { error: 'Refill already requested for this medication' },
                { status: 400 }
            );
        }

        // Get the wallet to find the parent
        const wallet = await Wallet.findById(medication.walletId);
        if (!wallet) {
            return NextResponse.json(
                { error: 'Associated wallet not found' },
                { status: 404 }
            );
        }

        // Get the parent user (wallet owner)
        const parent = await User.findById(wallet.owner);
        if (!parent) {
            return NextResponse.json(
                { error: 'Parent user not found' },
                { status: 404 }
            );
        }

        // Find connected pharmacies
        const pharmacies = await User.find({
            _id: { $in: parent.links || [] },
            role: 'pharmacy',
        });

        if (pharmacies.length === 0) {
            return NextResponse.json(
                { error: 'No connected pharmacy. Please connect to a pharmacy first.' },
                { status: 400 }
            );
        }

        // Update medication refill status
        medication.refillStatus = 'requested';
        medication.refillRequestedAt = new Date();
        medication.refillRequestedBy = parent._id;

        // If there's a pharmacyId on the medication, use that; otherwise use first connected pharmacy
        if (!medication.pharmacyId && pharmacies.length > 0) {
            medication.pharmacyId = pharmacies[0]._id;
        }

        await medication.save();

        // Create notification for the pharmacy
        const targetPharmacy = pharmacies.find(
            p => medication.pharmacyId && p._id.toString() === medication.pharmacyId.toString()
        ) || pharmacies[0];

        await Notification.create({
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
        await Notification.create({
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
                refillStatus: medication.refillStatus,
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
