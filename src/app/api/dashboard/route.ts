import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { User, Wallet, Medication } from '@/lib/models';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please login.' },
                { status: 401 }
            );
        }

        await dbConnect();

        const user = await User.findById(session.user.id)
            .populate('links', 'name email role avatar');

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const role = user.role;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dashboardData: Record<string, any> = {
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                linkCode: user.linkCode,
            },
            links: user.links || [],
        };

        if (role === 'parent') {
            // Get parent's wallet
            const wallet = await Wallet.findOne({ owner: user._id });

            // Get medications linked to this wallet
            const medications = wallet
                ? await Medication.find({ walletId: wallet._id, isActive: true })
                : [];

            // Get linked children
            const children = await User.find({
                _id: { $in: user.links || [] },
                role: 'child',
            }).select('name email avatar');

            // Calculate last deposit
            let lastDeposit = null;
            if (wallet && wallet.transactions.length > 0) {
                const deposits = wallet.transactions.filter((t: { type: string }) => t.type === 'deposit');
                if (deposits.length > 0) {
                    const latest = deposits[deposits.length - 1];
                    lastDeposit = {
                        amount: latest.amount,
                        date: latest.date,
                        from: 'Deposit',
                    };
                }
            }

            dashboardData.wallet = wallet ? {
                id: wallet._id.toString(),
                balance: wallet.balance,
                currency: wallet.currency,
                lastDeposit,
            } : null;

            dashboardData.medications = medications.map((med) => ({
                id: med._id.toString(),
                name: med.name,
                daysRemaining: med.usageRate > 0 ? Math.floor(med.remainingQty / med.usageRate) : 999,
                totalDays: med.usageRate > 0 ? Math.floor(med.totalQty / med.usageRate) : 30,
                refillCost: med.refillCost,
                remainingQty: med.remainingQty,
            }));

            dashboardData.children = children.map((child) => ({
                id: child._id.toString(),
                name: child.name,
                avatar: child.avatar || '👤',
            }));

        } else if (role === 'child') {
            // Get linked parents with their wallets
            const parents = await User.find({
                _id: { $in: user.links || [] },
                role: 'parent',
            }).select('name email avatar');

            const parentsWithWallets = await Promise.all(
                parents.map(async (parent) => {
                    const wallet = await Wallet.findOne({ owner: parent._id });

                    // Get medications for this parent's wallet
                    const medications = wallet
                        ? await Medication.find({ walletId: wallet._id, isActive: true })
                        : [];

                    // Calculate locked funds info
                    const activeLocks = wallet?.lockedFunds?.filter(
                        (l: { isActive: boolean; unlocksAt: Date }) =>
                            l.isActive && new Date(l.unlocksAt) > new Date()
                    ) || [];

                    const totalLocked = activeLocks.reduce(
                        (sum: number, l: { amount: number }) => sum + l.amount, 0
                    );

                    return {
                        id: parent._id.toString(),
                        name: parent.name,
                        avatar: parent.avatar || '👤',
                        walletId: wallet?._id.toString() || null,
                        balance: wallet?.balance || 0,
                        availableBalance: (wallet?.balance || 0) - totalLocked,
                        totalLocked,
                        lockedFunds: activeLocks.map((l: { _id: { toString(): string }; medicationName: string; amount: number; unlocksAt: Date }) => ({
                            id: l._id.toString(),
                            medicationName: l.medicationName,
                            amount: l.amount,
                            unlocksAt: l.unlocksAt,
                        })),
                        medications: medications.map((med) => ({
                            id: med._id.toString(),
                            name: med.name,
                            daysRemaining: med.usageRate > 0 ? Math.floor(med.remainingQty / med.usageRate) : 999,
                            totalDays: med.usageRate > 0 ? Math.floor(med.totalQty / med.usageRate) : 30,
                        })),
                    };
                })
            );

            // Calculate total deposited by this child
            let totalDeposited = 0;
            let depositsThisMonth = 0;
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            for (const parent of parentsWithWallets) {
                if (parent.walletId) {
                    const wallet = await Wallet.findById(parent.walletId);
                    if (wallet) {
                        const childDeposits = wallet.transactions.filter(
                            (t: { type: string; fromUserId?: { toString(): string } }) =>
                                t.type === 'deposit' &&
                                t.fromUserId?.toString() === session.user.id
                        );
                        totalDeposited += childDeposits.reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
                        depositsThisMonth += childDeposits.filter(
                            (t: { date: Date }) => new Date(t.date) >= startOfMonth
                        ).length;
                    }
                }
            }

            dashboardData.parents = parentsWithWallets;
            dashboardData.totalDeposited = totalDeposited;
            dashboardData.depositsThisMonth = depositsThisMonth;

        } else if (role === 'pharmacy') {
            // Get linked parents (patients)
            const patients = await User.find({
                _id: { $in: user.links || [] },
                role: 'parent',
            }).select('name email avatar');

            const patientsWithData = await Promise.all(
                patients.map(async (patient) => {
                    const wallet = await Wallet.findOne({ owner: patient._id });
                    const medications = wallet
                        ? await Medication.find({
                            walletId: wallet._id,
                            isActive: true,
                            pharmacyId: user._id,
                        })
                        : [];

                    return {
                        id: patient._id.toString(),
                        name: patient.name,
                        walletBalance: wallet?.balance || 0,
                        medications: medications.map((med) => ({
                            id: med._id.toString(),
                            name: med.name,
                            daysRemaining: med.usageRate > 0 ? Math.floor(med.remainingQty / med.usageRate) : 999,
                            refillCost: med.refillCost,
                            status: med.remainingQty <= 0 ? 'pending' : 'none',
                        })),
                    };
                })
            );

            // Get pending refills (medications with 0 days remaining)
            const pendingRefills = patientsWithData.flatMap((patient) =>
                patient.medications
                    .filter((med) => med.daysRemaining <= 0)
                    .map((med) => ({
                        id: med.id,
                        patient: patient.name,
                        medication: med.name,
                        amount: med.refillCost,
                    }))
            );

            dashboardData.patients = patientsWithData;
            dashboardData.pendingRefills = pendingRefills;
        }

        return NextResponse.json(dashboardData);
    } catch (error) {
        console.error('Dashboard data error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
