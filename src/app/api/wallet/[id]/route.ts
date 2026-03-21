import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Wallets } from '@/lib/indexedDB';

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

        const wallet = Wallets.findById(id);

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

        const availableBalance = Wallets.getAvailableBalance(wallet);

        return NextResponse.json({
            wallet: {
                id: wallet._id,
                balance: wallet.balance,
                availableBalance,
                currency: wallet.currency,
                owner: wallet.owner,
                transactions: sortedTransactions.map((t) => ({
                    id: t._id,
                    amount: t.amount,
                    type: t.type,
                    date: t.date,
                    description: t.description,
                    schedule: t.schedule,
                })),
                lockedFunds: (wallet.lockedFunds || []).map((lf) => ({
                    _id: lf._id,
                    amount: lf.amount,
                    lockedAt: lf.lockedAt,
                    unlocksAt: lf.unlocksAt,
                    isActive: lf.isActive,
                    description: lf.description || '',
                })),
                scheduledDeposits: wallet.scheduledDeposits.filter((d) => d.isActive),
                createdAt: wallet.createdAt,
                updatedAt: wallet.updatedAt,
            },
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
