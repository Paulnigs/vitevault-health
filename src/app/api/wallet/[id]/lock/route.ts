import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Wallets, Notifications, generateId } from '@/lib/indexedDB';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { action, amount, description } = body;

        const wallet = Wallets.findById(id);

        if (!wallet) {
            return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
        }

        if (action === 'create') {
            if (!amount || amount <= 0) {
                return NextResponse.json({ error: 'Invalid lock details' }, { status: 400 });
            }

            // Check available balance
            if (Wallets.getAvailableBalance(wallet) < amount) {
                return NextResponse.json({ error: 'Insufficient available balance to lock' }, { status: 400 });
            }

            const unlockDate = new Date();
            unlockDate.setFullYear(unlockDate.getFullYear() + 10);

            const existingLock = wallet.lockedFunds.find(f => f.isActive);
            let finalLock;

            if (existingLock) {
                existingLock.amount += amount;
                existingLock.description = description || existingLock.description || 'Medical Reserve';
                finalLock = existingLock;
            } else {
                const newLock = {
                    _id: generateId(),
                    amount,
                    lockedAt: new Date().toISOString(),
                    unlocksAt: unlockDate.toISOString(),
                    isActive: true,
                    description: description || 'Medical Reserve',
                };
                wallet.lockedFunds.push(newLock);
                finalLock = newLock;
            }

            Wallets.save(wallet);

            return NextResponse.json({ message: 'Funds locked successfully', lock: finalLock });
        }



        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Lock API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
