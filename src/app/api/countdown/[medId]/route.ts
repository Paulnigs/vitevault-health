import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Medication } from '@/lib/models';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ medId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please login.' },
                { status: 401 }
            );
        }

        const { medId } = await params;

        await dbConnect();

        const medication = await Medication.findById(medId);

        if (!medication) {
            return NextResponse.json(
                { error: 'Medication not found' },
                { status: 404 }
            );
        }

        const countdownDays = medication.usageRate > 0
            ? Math.floor(medication.remainingQty / medication.usageRate)
            : 999;

        return NextResponse.json({
            id: medication._id,
            name: medication.name,
            remainingQty: medication.remainingQty,
            totalQty: medication.totalQty,
            usageRate: medication.usageRate,
            countdownDays,
            status: countdownDays <= 0 ? 'refill_needed' : countdownDays <= 3 ? 'low' : 'ok',
        });
    } catch (error) {
        console.error('Get countdown error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
