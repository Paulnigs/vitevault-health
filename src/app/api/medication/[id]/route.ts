import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Medication, Wallet } from '@/lib/models';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please login.' },
                { status: 401 }
            );
        }

        const { id: medicationId } = await params;

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

        // Get wallet to verify ownership
        const wallet = await Wallet.findById(medication.walletId);
        if (!wallet || wallet.owner.toString() !== session.user.id) {
            return NextResponse.json(
                { error: 'Unauthorized. You do not own this medication.' },
                { status: 403 }
            );
        }

        // If medication is approved (has locked funds), release them
        if (medication.refillStatus === 'approved' && medication.lockedFundId) {
            const lockedFundIndex = wallet.lockedFunds.findIndex(
                l => l._id.toString() === medication.lockedFundId?.toString()
            );

            if (lockedFundIndex !== -1) {
                wallet.lockedFunds[lockedFundIndex].isActive = false;
            }

            await wallet.save();
        }

        // Delete the medication
        await Medication.findByIdAndDelete(medicationId);

        return NextResponse.json({
            message: 'Medication deleted successfully',
            medicationId,
        });
    } catch (error) {
        console.error('Delete medication error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
