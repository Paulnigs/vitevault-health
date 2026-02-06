'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Card, Modal, Input, CountdownTimer } from '@/components/ui';
import { DEMO_CARDS, formatCardNumber } from '@/lib/cardValidation';
import toast from 'react-hot-toast';

// Demo data for illustration
const demoParents = [
    { id: '1', name: 'Mom', avatar: '👵', walletId: 'wallet1', balance: 45000 },
    { id: '2', name: 'Dad', avatar: '👴', walletId: 'wallet2', balance: 32000 },
];

const demoMedications = [
    { id: '1', name: 'Blood Pressure Meds', daysRemaining: 5, totalDays: 30 },
    { id: '2', name: 'Diabetes Medication', daysRemaining: 2, totalDays: 30 },
];

export default function ChildDashboard() {
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [selectedParent, setSelectedParent] = useState<typeof demoParents[0] | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [depositForm, setDepositForm] = useState({
        amount: '',
        cardNumber: '',
        expiry: '',
        cvv: '',
        schedule: 'one-time',
    });

    const presetAmounts = [1000, 5000, 10000, 20000];

    const handleDeposit = (parent: typeof demoParents[0]) => {
        setSelectedParent(parent);
        setIsDepositModalOpen(true);
    };

    const handleSubmitDeposit = async () => {
        if (!depositForm.amount || !depositForm.cardNumber || !depositForm.expiry || !depositForm.cvv) {
            toast.error('Please fill all card details');
            return;
        }

        setIsLoading(true);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));

        toast.success(`₦${parseInt(depositForm.amount).toLocaleString()} deposited to ${selectedParent?.name}'s wallet! 🎉`);
        setIsDepositModalOpen(false);
        setDepositForm({
            amount: '',
            cardNumber: '',
            expiry: '',
            cvv: '',
            schedule: 'one-time',
        });
        setIsLoading(false);
    };

    return (
        <div>
            {/* Welcome Header */}
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-[#343A40]">
                    Welcome Back! 👋
                </h1>
                <p className="text-[#6C757D] mt-1">
                    Manage your family&apos;s health with ease
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card className="text-center">
                    <p className="text-[#6C757D] text-sm mb-1">Linked Parents</p>
                    <p className="text-3xl font-bold text-[#007BFF]">{demoParents.length}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-[#6C757D] text-sm mb-1">Total Deposited</p>
                    <p className="text-3xl font-bold text-[#28A745]">₦77K</p>
                </Card>
                <Card className="text-center">
                    <p className="text-[#6C757D] text-sm mb-1">Active Meds</p>
                    <p className="text-3xl font-bold text-[#FFC107]">{demoMedications.length}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-[#6C757D] text-sm mb-1">This Month</p>
                    <p className="text-3xl font-bold text-[#343A40]">3</p>
                    <p className="text-xs text-[#6C757D]">deposits</p>
                </Card>
            </div>

            {/* Linked Parents */}
            <h2 className="text-xl font-bold text-[#343A40] mb-4">Linked Parents</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
                {demoParents.map((parent) => (
                    <motion.div
                        key={parent.id}
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Card className="flex items-center justify-between" hover>
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-[#007BFF]/10 rounded-full flex items-center justify-center text-3xl">
                                    {parent.avatar}
                                </div>
                                <div>
                                    <p className="font-bold text-[#343A40]">{parent.name}</p>
                                    <p className="text-sm text-[#6C757D]">
                                        Balance: <span className="text-[#28A745] font-semibold">₦{parent.balance.toLocaleString()}</span>
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleDeposit(parent)}
                            >
                                Deposit
                            </Button>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Medication Alerts */}
            <h2 className="text-xl font-bold text-[#343A40] mb-4">Medication Status</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {demoMedications.map((med) => (
                    <Card key={med.id} className="flex items-center gap-4">
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
            </Modal>
        </div>
    );
}
