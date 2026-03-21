import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Users, Wallets, Notifications, generateId } from '@/lib/indexedDB';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'pharmacy') {
            return NextResponse.json({ error: 'Unauthorized. Only pharmacies can process payments.' }, { status: 401 });
        }

        const body = await request.json();
        const { linkCode, medicationName, amount } = body;

        if (!linkCode || !amount || amount <= 0) {
            return NextResponse.json({ error: 'Link code and valid amount are required' }, { status: 400 });
        }

        // 1. Verify Parent (User)
        const parent = Users.findByLinkCode(linkCode);
        if (!parent) {
            return NextResponse.json({ error: 'Invalid link code' }, { status: 404 });
        }

        // 2. Verify Wallet
        const wallet = Wallets.findByOwner(parent._id);
        if (!wallet) {
            return NextResponse.json({ error: 'Parent has no active wallet' }, { status: 404 });
        }

        // ✅ KEY: Pharmacy can ONLY charge from locked funds
        const totalLocked = Wallets.getTotalLocked(wallet);

        if (totalLocked < amount) {
            return NextResponse.json({
                error: 'Insufficient locked funds. The pharmacy can only charge from locked funds.',
                details: { lockedFunds: totalLocked, required: amount }
            }, { status: 400 });
        }

        // Deduct from locked funds (proportionally from active locks)
        let remainingToDeduct = amount;
        for (const lock of wallet.lockedFunds) {
            if (!lock.isActive || remainingToDeduct <= 0) continue;

            const deductFromThis = Math.min(lock.amount, remainingToDeduct);
            lock.amount -= deductFromThis;
            remainingToDeduct -= deductFromThis;

            if (lock.amount <= 0) {
                lock.isActive = false;
            }
        }

        // Deduct from total balance
        wallet.balance -= amount;

        // Record Transaction
        wallet.transactions.push({
            _id: generateId(),
            amount,
            type: 'deduction',
            description: `Pharmacy Payment: ${medicationName || 'Medication'} (from Locked Funds)`,
            date: new Date().toISOString(),
            schedule: 'one-time',
            fromUserId: session.user.id,
        });

        Wallets.save(wallet);

        // Notifications
        Notifications.create({
            userId: parent._id,
            type: 'deduction',
            title: 'Pharmacy Payment Processed',
            message: `₦${amount.toLocaleString()} paid to ${session.user.name} for ${medicationName || 'Medication'} (from locked funds).`,
            read: false,
            data: { walletId: wallet._id, amount, pharmacyId: session.user.id }
        });

        return NextResponse.json({
            message: 'Payment processed successfully from locked funds',
            newBalance: wallet.balance,
            transactionId: wallet.transactions[wallet.transactions.length - 1]._id
        });

    } catch (error) {
        console.error('Pharmacy deduction error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
