'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button, Card, Modal, Input, CountdownTimer, Skeleton } from '@/components/ui';
import { DEMO_CARDS, formatCardNumber } from '@/lib/cardValidation';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Medication {
    id: string;
    name: string;
    daysRemaining: number;
    totalDays: number;
}

interface LockedFund {
    id: string;
    medicationName: string;
    amount: number;
    unlocksAt: string;
}

interface Parent {
    id: string;
    name: string;
    avatar: string;
    walletId: string | null;
    balance: number;
    availableBalance: number;
    totalLocked: number;
    lockedFunds: LockedFund[];
    medications: Medication[];
}

interface DashboardData {
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
        linkCode: string;
    };
    parents: Parent[];
    totalDeposited: number;
    depositsThisMonth: number;
}

export default function ChildDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [depositForm, setDepositForm] = useState({
        amount: '',
        cardNumber: '',
        expiry: '',
        cvv: '',
        schedule: 'one-time',
    });

    // Lock State
    const [isLockEnabled, setIsLockEnabled] = useState(false);
    const [lockMedicationName, setLockMedicationName] = useState('');
    const [lockDuration, setLockDuration] = useState(30);

    const presetAmounts = [1000, 5000, 10000, 20000];

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }

        if (status === 'authenticated') {
            fetchDashboardData();
        }
    }, [status, router]);

    const fetchDashboardData = async () => {
        try {
            const response = await fetch('/api/dashboard');
            if (!response.ok) {
                throw new Error('Failed to fetch dashboard data');
            }
            const data = await response.json();
            setDashboardData(data);
        } catch (error) {
            console.error('Dashboard fetch error:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleDeposit = (parent: Parent) => {
        if (!parent.walletId) {
            toast.error('This parent does not have a wallet yet');
            return;
        }
        setSelectedParent(parent);
        setIsDepositModalOpen(true);
    };

    const handleSubmitDeposit = async () => {
        if (!depositForm.amount || !depositForm.cardNumber || !depositForm.expiry || !depositForm.cvv) {
            toast.error('Please fill all card details');
            return;
        }

        if (!selectedParent?.walletId) {
            toast.error('No wallet selected');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletId: selectedParent.walletId,
                    amount: parseInt(depositForm.amount),
                    cardDetails: {
                        number: depositForm.cardNumber.replace(/\s/g, ''),
                        expiry: depositForm.expiry,
                        cvv: depositForm.cvv,
                    },
                    schedule: depositForm.schedule,
                    lockSettings: {
                        enabled: isLockEnabled,
                        medicationName: lockMedicationName,
                        amount: isLockEnabled ? parseInt(depositForm.amount) : 0,
                        durationDays: lockDuration
                    }
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Deposit failed');
            }

            toast.success(`₦${parseInt(depositForm.amount).toLocaleString()} deposited to ${selectedParent.name}'s wallet! 🎉`);
            setIsDepositModalOpen(false);
            setDepositForm({
                amount: '',
                cardNumber: '',
                expiry: '',
                cvv: '',
                schedule: 'one-time',
            });
            setIsLockEnabled(false);
            setLockMedicationName('');
            setLockDuration(30);

            // Refresh dashboard data
            fetchDashboardData();
        } catch (error) {
            console.error('Deposit error:', error);
            toast.error(error instanceof Error ? error.message : 'Deposit failed');
        } finally {
            setIsLoading(false);
        }
    };

    if (loading || status === 'loading') {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-64" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Skeleton className="h-24 rounded-2xl" />
                    <Skeleton className="h-24 rounded-2xl" />
                    <Skeleton className="h-24 rounded-2xl" />
                    <Skeleton className="h-24 rounded-2xl" />
                </div>
                <Skeleton className="h-32 rounded-2xl" />
                <Skeleton className="h-32 rounded-2xl" />
            </div>
        );
    }

    const parents = dashboardData?.parents || [];
    const allMedications = parents.flatMap((p) => p.medications);

    // Aggregate wallet data across all parents
    const totalBalance = parents.reduce((s, p) => s + (p.balance || 0), 0);
    const totalAvailable = parents.reduce((s, p) => s + (p.availableBalance || 0), 0);
    const totalLocked = parents.reduce((s, p) => s + (p.totalLocked || 0), 0);

    return (
        <div>
            {/* Welcome Header */}
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-[#343A40]">
                    Welcome Back, {dashboardData?.user?.name || session?.user?.name}! 👋
                </h1>
                <p className="text-[#6C757D] mt-1">
                    Manage your family&apos;s health with ease
                </p>
            </div>

            {/* Wallet Summary — links to /wallet */}
            <Link href="/wallet">
                <div className="rounded-2xl p-5 mb-8 text-white cursor-pointer hover:shadow-lg transition-shadow" style={{ background: 'linear-gradient(135deg, #007BFF 0%, #0056b3 50%, #003d80 100%)' }}>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="text-sm opacity-80">Total Balance</p>
                            <p className="text-3xl font-bold">₦{totalBalance.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/15 rounded-full p-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/15 backdrop-blur-sm rounded-lg p-2 text-center">
                            <p className="text-xs opacity-70">Available</p>
                            <p className="text-lg font-bold">₦{totalAvailable.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/15 backdrop-blur-sm rounded-lg p-2 text-center">
                            <p className="text-xs opacity-70">🔒 Locked</p>
                            <p className="text-lg font-bold">₦{totalLocked.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </Link>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card className="text-center">
                    <p className="text-[#6C757D] text-sm mb-1">Linked Parents</p>
                    <p className="text-3xl font-bold text-[#007BFF]">{parents.length}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-[#6C757D] text-sm mb-1">Total Deposited</p>
                    <p className="text-3xl font-bold text-[#28A745]">
                        ₦{((dashboardData?.totalDeposited || 0) / 1000).toFixed(0)}K
                    </p>
                </Card>
                <Card className="text-center">
                    <p className="text-[#6C757D] text-sm mb-1">Active Meds</p>
                    <p className="text-3xl font-bold text-[#FFC107]">{allMedications.length}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-[#6C757D] text-sm mb-1">This Month</p>
                    <p className="text-3xl font-bold text-[#343A40]">{dashboardData?.depositsThisMonth || 0}</p>
                    <p className="text-xs text-[#6C757D]">deposits</p>
                </Card>
            </div>

            {/* Linked Parents */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-[#343A40]">Linked Parents</h2>
                    <Link href="/connections">
                        <Button variant="outline" size="sm">
                            Manage Connections
                        </Button>
                    </Link>
                </div>

                {parents.length === 0 ? (
                    <Card className="text-center py-8">
                        <div className="text-4xl mb-2">👨‍👩‍👧‍👦</div>
                        <p className="text-[#6C757D] mb-2">No parents connected yet</p>
                        <p className="text-sm text-[#6C757D] mb-4">
                            Ask your parent for their link code to connect
                        </p>
                        <Link href="/connections">
                            <Button variant="primary" size="sm">
                                Add Connection
                            </Button>
                        </Link>
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {parents.map((parent) => (
                            <motion.div
                                key={parent.id}
                                whileHover={{ scale: 1.02 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Card hover>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-[#007BFF]/10 rounded-full flex items-center justify-center text-3xl">
                                                {parent.avatar || '👤'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#343A40]">{parent.name}</p>
                                                <p className="text-xs text-[#6C757D]">Total: ₦{parent.balance.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        <div className="bg-green-50 p-2 rounded-lg text-center">
                                            <p className="text-xs text-green-600 font-medium">Available</p>
                                            <p className="text-sm font-bold text-green-700">₦{(parent.availableBalance || 0).toLocaleString()}</p>
                                        </div>
                                        <div className="bg-amber-50 p-2 rounded-lg text-center">
                                            <p className="text-xs text-amber-600 font-medium">🔒 Locked</p>
                                            <p className="text-sm font-bold text-amber-700">₦{(parent.totalLocked || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => handleDeposit(parent)}
                                        disabled={!parent.walletId}
                                    >
                                        Deposit
                                    </Button>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Medication Alerts */}
            <div>
                <h2 className="text-xl font-bold text-[#343A40] mb-4">Medication Status</h2>

                {allMedications.length === 0 ? (
                    <Card className="text-center py-8">
                        <div className="text-4xl mb-2">💊</div>
                        <p className="text-[#6C757D]">No medications tracked yet</p>
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allMedications.map((med, index) => (
                            <Card key={`${med.id}-${index}`} className="flex items-center gap-4">
                                <CountdownTimer
                                    daysRemaining={med.daysRemaining}
                                    totalDays={med.totalDays}
                                    size="sm"
                                    showLabel={false}
                                />
                                <div>
                                    <p className="font-semibold text-[#343A40]">{med.name}</p>
                                    <p className="text-sm text-[#6C757D]">
                                        {med.daysRemaining} days remaining
                                    </p>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Deposit Modal */}
            <Modal
                isOpen={isDepositModalOpen}
                onClose={() => setIsDepositModalOpen(false)}
                title={`Deposit to ${selectedParent?.name}'s Wallet`}
                size="lg"
            >
                <div className="space-y-4">
                    {/* Preset Amounts */}
                    <div>
                        <label className="block text-sm font-medium text-[#343A40] mb-2">
                            Quick Amount
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {presetAmounts.map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => setDepositForm((prev) => ({ ...prev, amount: amount.toString() }))}
                                    className={`
                    px-4 py-2 rounded-lg border-2 font-medium transition-colors
                    ${depositForm.amount === amount.toString()
                                            ? 'border-[#FFC107] bg-[#FFC107]/10 text-[#343A40]'
                                            : 'border-gray-200 hover:border-[#FFC107] text-[#6C757D]'
                                        }
                  `}
                                >
                                    ₦{amount.toLocaleString()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Amount */}
                    <Input
                        label="Or Enter Amount"
                        type="number"
                        placeholder="Enter amount in Naira"
                        value={depositForm.amount}
                        onChange={(e) => setDepositForm((prev) => ({ ...prev, amount: e.target.value }))}
                        leftIcon={<span className="text-[#6C757D]">₦</span>}
                    />

                    {/* Card Details */}
                    <div className="p-4 bg-[#F8F9FA] rounded-lg">
                        <p className="text-sm text-[#6C757D] mb-3">
                            💳 Card Details (Demo - use test card: {DEMO_CARDS.visa})
                        </p>

                        <Input
                            placeholder="Card Number"
                            value={depositForm.cardNumber}
                            onChange={(e) => setDepositForm((prev) => ({
                                ...prev,
                                cardNumber: formatCardNumber(e.target.value).slice(0, 19)
                            }))}
                            className="mb-3"
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                placeholder="MM/YY"
                                value={depositForm.expiry}
                                onChange={(e) => {
                                    let value = e.target.value.replace(/\D/g, '');
                                    if (value.length >= 2) {
                                        value = value.slice(0, 2) + '/' + value.slice(2, 4);
                                    }
                                    setDepositForm((prev) => ({ ...prev, expiry: value }));
                                }}
                                maxLength={5}
                            />
                            <Input
                                placeholder="CVV"
                                type="password"
                                value={depositForm.cvv}
                                onChange={(e) => setDepositForm((prev) => ({
                                    ...prev,
                                    cvv: e.target.value.replace(/\D/g, '').slice(0, 4)
                                }))}
                                maxLength={4}
                            />
                        </div>
                    </div>

                    {/* Schedule */}
                    <div>
                        <label className="block text-sm font-medium text-[#343A40] mb-2">
                            Payment Schedule
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {['one-time', 'weekly', 'monthly'].map((schedule) => (
                                <button
                                    key={schedule}
                                    onClick={() => setDepositForm((prev) => ({ ...prev, schedule }))}
                                    className={`
                    px-4 py-2 rounded-lg border-2 font-medium transition-colors capitalize
                    ${depositForm.schedule === schedule
                                            ? 'border-[#007BFF] bg-[#007BFF]/10 text-[#007BFF]'
                                            : 'border-gray-200 hover:border-[#007BFF] text-[#6C757D]'
                                        }
                  `}
                                >
                                    {schedule.replace('-', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>


                    {/* Lock Funds Option */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-[#343A40]">Lock Funds?</h3>
                                <p className="text-xs text-[#6C757D]">Reserve money for specific medication</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isLockEnabled}
                                    onChange={(e) => setIsLockEnabled(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#007BFF]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007BFF]"></div>
                            </label>
                        </div>

                        {isLockEnabled && (
                            <div className="space-y-3">
                                <Input
                                    label="Medication Name"
                                    placeholder="e.g. Insulin"
                                    value={lockMedicationName}
                                    onChange={(e) => setLockMedicationName(e.target.value)}
                                    required={isLockEnabled}
                                />
                                <Input
                                    label="Duration (Days)"
                                    type="number"
                                    value={lockDuration}
                                    onChange={(e) => setLockDuration(Number(e.target.value))}
                                    min={1}
                                    required={isLockEnabled}
                                />
                                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                    ⚠️ Unlocking early incurs a 5% fee. Auto-unlocks in {lockDuration} days.
                                </p>
                            </div>
                        )}


                    </div>

                    {/* Submit */}
                    <Button
                        variant="secondary"
                        size="lg"
                        className="w-full"
                        isLoading={isLoading}
                        onClick={handleSubmitDeposit}
                    >
                        {depositForm.amount
                            ? `Deposit ₦${parseInt(depositForm.amount || '0').toLocaleString()}`
                            : 'Enter Amount'
                        }
                    </Button>
                </div>
            </Modal >
        </div >
    );
}
