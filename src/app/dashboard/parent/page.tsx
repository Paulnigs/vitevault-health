'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Card, CountdownTimer, Modal, Input } from '@/components/ui';
import toast from 'react-hot-toast';

// Demo data
const demoWallet = {
    balance: 45000,
    lastDeposit: { amount: 10000, from: 'Adaeze', date: '2026-02-03' },
};

const demoMedications = [
    { id: '1', name: 'Lisinopril 10mg', daysRemaining: 5, totalDays: 30, refillCost: 8500 },
    { id: '2', name: 'Metformin 500mg', daysRemaining: 2, totalDays: 30, refillCost: 6000 },
    { id: '3', name: 'Atorvastatin 20mg', daysRemaining: 18, totalDays: 30, refillCost: 12000 },
];

const demoChildren = [
    { id: '1', name: 'Adaeze', avatar: '👩', lastDeposit: '₦10,000' },
    { id: '2', name: 'Chidi', avatar: '👨', lastDeposit: '₦5,000' },
];

export default function ParentDashboard() {
    const [isFastForwardModalOpen, setIsFastForwardModalOpen] = useState(false);
    const [selectedMedication, setSelectedMedication] = useState<typeof demoMedications[0] | null>(null);
    const [daysToFastForward, setDaysToFastForward] = useState('1');
    const [isSimulating, setIsSimulating] = useState(false);

    const handleFastForward = async () => {
        if (!selectedMedication) return;

        setIsSimulating(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const days = parseInt(daysToFastForward) || 1;
        const newDaysRemaining = Math.max(0, selectedMedication.daysRemaining - days);

        if (newDaysRemaining <= 0) {
            toast.success(
                `₦${selectedMedication.refillCost.toLocaleString()} deducted for ${selectedMedication.name} refill! 💊`,
                { duration: 5000 }
            );
        } else {
            toast(`Simulated ${days} day(s). ${newDaysRemaining} days remaining.`, { icon: '⏰' });
        }

        setIsSimulating(false);
        setIsFastForwardModalOpen(false);
        setDaysToFastForward('1');
    };

    return (
        <div>
            {/* Welcome Header */}
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-[#343A40]">
                    Your Health Dashboard 🏥
                </h1>
                <p className="text-[#6C757D] mt-1">
                    Track your medications and wallet balance
                </p>
            </div>

            {/* Wallet Balance Card */}
            <Card className="mb-8 gradient-hero text-white">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <p className="text-white/80 text-sm mb-1">Wallet Balance</p>
                        <p className="text-4xl md:text-5xl font-bold">
                            ₦{demoWallet.balance.toLocaleString()}
                        </p>
                        <p className="text-white/70 text-sm mt-2">
                            Last deposit: ₦{demoWallet.lastDeposit.amount.toLocaleString()} from {demoWallet.lastDeposit.from}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                    <Button variant="outline" size="sm">
                        Add Medication
                    </Button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {demoMedications.map((med) => (
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
            </div>

            {/* Connected Children */}
            <div>
                <h2 className="text-xl font-bold text-[#343A40] mb-4">Connected Children</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {demoChildren.map((child) => (
                        <Card key={child.id} className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#FFC107]/10 rounded-full flex items-center justify-center text-2xl">
                                {child.avatar}
                            </div>
                            <div>
                                <p className="font-bold text-[#343A40]">{child.name}</p>
                                <p className="text-sm text-[#6C757D]">
                                    Last deposit: <span className="text-[#28A745]">{child.lastDeposit}</span>
                                </p>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Fast Forward Modal */}
            <Modal
                isOpen={isFastForwardModalOpen}
                onClose={() => setIsFastForwardModalOpen(false)}
                title="⏩ Fast Forward Demo"
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
