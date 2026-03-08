import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Wallet } from '@/lib/models';

export async function GET(
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

        const { id } = await params;

        await dbConnect();

        const wallet = await Wallet.findById(id).populate('owner', 'name email role');

        if (!wallet) {
            return NextResponse.json(
                { error: 'Wallet not found' },
                { status: 404 }
            );
        }

        // Sort transactions by date (newest first)
        const sortedTransactions = [...wallet.transactions].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        // Calculate locked funds total and available balance
        const walletObj = wallet.toObject({ virtuals: true });

        return NextResponse.json({
            wallet: {
                id: wallet._id,
                balance: wallet.balance,
                availableBalance: walletObj.availableBalance,
                currency: wallet.currency,
                owner: typeof wallet.owner === 'object' && wallet.owner._id
                    ? wallet.owner._id.toString()
                    : wallet.owner.toString(),
                transactions: sortedTransactions.map((t: any) => ({
                    id: t._id?.toString() || t.id,
                    amount: t.amount,
                    type: t.type,
                    date: t.date,
                    description: t.description,
                    schedule: t.schedule,
                })),
                lockedFunds: (wallet.lockedFunds || []).map((lf: any) => ({
                    _id: lf._id.toString(),
                    medicationName: lf.medicationName,
                    amount: lf.amount,
                    lockedAt: lf.lockedAt,
                    unlocksAt: lf.unlocksAt,
                    isActive: lf.isActive,
                })),
                scheduledDeposits: wallet.scheduledDeposits.filter((d) => d.isActive),
                createdAt: wallet.createdAt,
                updatedAt: wallet.updatedAt,
            },
            // Also keep top-level fields for backward compatibility
            id: wallet._id,
            balance: wallet.balance,
            currency: wallet.currency,
            owner: wallet.owner,
            transactions: sortedTransactions,
            scheduledDeposits: wallet.scheduledDeposits.filter((d) => d.isActive),
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt,
        });
    } catch (error) {
        console.error('Get wallet error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
