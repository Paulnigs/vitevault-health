'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button, Card, CountdownTimer, Modal, Input, Skeleton } from '@/components/ui';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRealtime } from '@/hooks/useRealtime';

interface Medication {
    id: string;
    name: string;
    daysRemaining: number;
    totalDays: number;
    refillCost: number;
    remainingQty: number;
}

interface Child {
    id: string;
    name: string;
    avatar: string;
}

interface WalletData {
    id: string;
    balance: number;
    currency: string;
    lastDeposit: {
        amount: number;
        date: string;
        from: string;
    } | null;
}

interface DashboardData {
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
        linkCode: string;
    };
    wallet: WalletData | null;
    medications: Medication[];
    children: Child[];
}

export default function ParentDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [isFastForwardModalOpen, setIsFastForwardModalOpen] = useState(false);
    const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
    const [daysToFastForward, setDaysToFastForward] = useState('1');
    const [isSimulating, setIsSimulating] = useState(false);


    // Setup real-time updates
    useRealtime({
        userId: dashboardData?.user?.id || '',
        onBalanceUpdate: () => {
            fetchDashboardData();
            toast.success('Wallet balance updated!', { icon: '💰' });
        },
        onRefillAlert: (data) => {
            fetchDashboardData();
            toast(`${data.medicationName} needs attention!`, { icon: '💊' });
        },
        onNotification: () => {
            toast('New notification received', { icon: '🔔' });
        }
    });

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

    const handleFastForward = async () => {
        if (!selectedMedication) return;

        setIsSimulating(true);

        try {
            const response = await fetch('/api/simulate-deduction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    medicationId: selectedMedication.id,
                    daysToSimulate: parseInt(daysToFastForward) || 1,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 402) {
                    toast.error(`Low balance! Need ₦${data.refillCost?.toLocaleString()} for ${data.medication}`);
                } else {
                    throw new Error(data.error || 'Simulation failed');
                }
            } else {
                toast.success(data.message, { duration: 5000 });
                // Refresh dashboard data
                fetchDashboardData();
            }
        } catch (error) {
            console.error('Fast forward error:', error);
            toast.error('Failed to simulate time');
        } finally {
            setIsSimulating(false);
            setIsFastForwardModalOpen(false);
            setDaysToFastForward('1');
        }
    };

    if (loading || status === 'loading') {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-64" />
                <Skeleton className="h-40 rounded-2xl" />
                <div className="grid md:grid-cols-3 gap-4">
                    <Skeleton className="h-48 rounded-2xl" />
                    <Skeleton className="h-48 rounded-2xl" />
                    <Skeleton className="h-48 rounded-2xl" />
                </div>
            </div>
        );
    }

    const wallet = dashboardData?.wallet;
    const medications = dashboardData?.medications || [];
    const children = dashboardData?.children || [];

    return (
        <div>
            {/* Welcome Header */}
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-[#343A40]">
                    Your Health Dashboard 🏥
                </h1>
                <p className="text-[#6C757D] mt-1">
                    Welcome back, {dashboardData?.user?.name || session?.user?.name}!
                </p>
            </div>

            {/* Wallet Balance Card */}
            <Card className="mb-8 gradient-hero text-white">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <p className="text-white/80 text-sm mb-1">Wallet Balance</p>
                        <p className="text-4xl md:text-5xl font-bold">
                            ₦{(wallet?.balance || 0).toLocaleString()}
                        </p>
                        {wallet?.lastDeposit ? (
                            <p className="text-white/70 text-sm mt-2">
                                Last deposit: ₦{wallet.lastDeposit.amount.toLocaleString()}
                            </p>
                        ) : (
                            <p className="text-white/70 text-sm mt-2">
                                No deposits yet
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {wallet && (
                            <Link href={`/wallet/${wallet.id}`}>
                                <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                                    View Details
                                </Button>
                            </Link>
                        )}
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Medications Section */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-[#343A40]">Your Medications</h2>
                    {wallet && (
                        <Link href={`/medications/${wallet.id}`}>
                            <Button variant="outline" size="sm">
                                Manage Medications
                            </Button>
                        </Link>
                    )}
                </div>

                {medications.length === 0 ? (
                    <Card className="text-center py-8">
                        <div className="text-4xl mb-2">💊</div>
                        <p className="text-[#6C757D] mb-4">No medications added yet</p>
                        {wallet && (
                            <Link href={`/medications/${wallet.id}`}>
                                <Button variant="primary" size="sm">
                                    Add Medication
                                </Button>
                            </Link>
                        )}
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {medications.map((med) => (
                            <motion.div
                                key={med.id}
                                whileHover={{ scale: 1.02 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Card className="h-full" hover>
                                    <div className="flex flex-col items-center text-center">
                                        <CountdownTimer
                                            daysRemaining={med.daysRemaining}
                                            totalDays={med.totalDays}
                                            size="md"
                                        />

                                        <h3 className="font-bold text-[#343A40] mt-4">{med.name}</h3>
                                        <p className="text-sm text-[#6C757D] mb-4">
                                            Refill cost: ₦{med.refillCost.toLocaleString()}
                                        </p>

                                        <div className="flex gap-2 w-full">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => {
                                                    setSelectedMedication(med);
                                                    setIsFastForwardModalOpen(true);
                                                }}
                                            >
                                                ⏩ Fast Forward
                                            </Button>
                                            {med.daysRemaining <= 3 && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => toast.success('Refill requested!')}
                                                >
                                                    Refill Now
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Connected Children */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-[#343A40]">Connected Children</h2>
                    <Link href="/connections">
                        <Button variant="outline" size="sm">
                            Manage Connections
                        </Button>
                    </Link>
                </div>

                {children.length === 0 ? (
                    <Card className="text-center py-8">
                        <div className="text-4xl mb-2">👨‍👩‍👧‍👦</div>
                        <p className="text-[#6C757D] mb-2">No children connected yet</p>
                        <p className="text-sm text-[#6C757D] mb-4">
                            Share your link code: <span className="font-mono font-bold text-[#007BFF]">{dashboardData?.user?.linkCode}</span>
                        </p>
                        <Link href="/connections">
                            <Button variant="primary" size="sm">
                                Add Connection
                            </Button>
                        </Link>
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {children.map((child) => (
                            <Card key={child.id} className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#FFC107]/10 rounded-full flex items-center justify-center text-2xl">
                                    {child.avatar || '👤'}
                                </div>
                                <div>
                                    <p className="font-bold text-[#343A40]">{child.name}</p>
                                    <p className="text-sm text-[#28A745]">Connected</p>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Fast Forward Modal */}
            <Modal
                isOpen={isFastForwardModalOpen}
                onClose={() => setIsFastForwardModalOpen(false)}
                title="⏩ Fast Forward Simulation"
            >
                <div className="space-y-4">
                    <p className="text-[#6C757D]">
                        Simulate {selectedMedication?.name} usage over time. If days reach 0,
                        auto-deduction will trigger.
                    </p>

                    <div className="p-4 bg-[#F8F9FA] rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[#6C757D]">Current days remaining:</span>
                            <span className="font-bold text-[#343A40]">{selectedMedication?.daysRemaining}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[#6C757D]">Refill cost:</span>
                            <span className="font-bold text-[#DC3545]">
                                ₦{selectedMedication?.refillCost.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <Input
                        label="Days to Fast Forward"
                        type="number"
                        min={1}
                        max={30}
                        value={daysToFastForward}
                        onChange={(e) => setDaysToFastForward(e.target.value)}
                    />

                    <Button
                        variant="accent"
                        size="lg"
                        className="w-full"
                        isLoading={isSimulating}
                        onClick={handleFastForward}
                    >
                        Simulate {daysToFastForward} Day(s)
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
