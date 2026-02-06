import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Medication, Wallet } from '@/lib/models';

// GET all medications for a wallet
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please login.' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const walletId = searchParams.get('walletId');

        await dbConnect();

        const filter: Record<string, unknown> = { isActive: true };
        if (walletId) {
            filter.walletId = walletId;
        }

        const medications = await Medication.find(filter)
            .populate('pharmacyId', 'name email')
            .sort({ createdAt: -1 });

        return NextResponse.json({ medications });
    } catch (error) {
        console.error('Get medications error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST create new medication
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
        const { name, description, quantity, usageRate, refillCost, walletId, pharmacyId } = body;

        // Validation
        if (!name || !quantity || !usageRate || !refillCost || !walletId) {
            return NextResponse.json(
                { error: 'Name, quantity, usage rate, refill cost, and wallet ID are required' },
                { status: 400 }
            );
        }

        await dbConnect();

        // Verify wallet exists
        const wallet = await Wallet.findById(walletId);
        if (!wallet) {
            return NextResponse.json(
                { error: 'Wallet not found' },
                { status: 404 }
            );
        }

        // Calculate countdown days
        const countdownDays = Math.floor(quantity / usageRate);

        const medication = await Medication.create({
            name,
            description,
            remainingQty: quantity,
            totalQty: quantity,
            usageRate,
            refillCost,
            walletId,
            pharmacyId,
        });

        return NextResponse.json(
            {
                message: 'Medication added successfully',
                medication: {
                    ...medication.toObject(),
                    countdownDays,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Create medication error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
