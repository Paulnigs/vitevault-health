'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, Button, Input, Skeleton } from '@/components/ui';
import { showDeposit, showError } from '@/components/ui/Toast';

type Schedule = 'one-time' | 'daily' | 'weekly' | 'monthly';

const presetAmounts = [1000, 2000, 5000, 10000, 20000, 50000];

export default function DepositPage() {
    const params = useParams();
    const router = useRouter();
    const walletId = params.walletId as string;

    const [cardNumber, setCardNumber] = useState('');
    const [cardName, setCardName] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [amount, setAmount] = useState(5000);
    const [schedule, setSchedule] = useState<Schedule>('one-time');
    const [isLoading, setIsLoading] = useState(false);
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [loadingWallet, setLoadingWallet] = useState(true);
    const [showConfetti, setShowConfetti] = useState(false);

    // Lock State
    const [lockOption, setLockOption] = useState<'all' | 'partial'>('all');
    const [lockDescription, setLockDescription] = useState('Medical Reserve');
    const [lockAmount, setLockAmount] = useState(0);

    // Fetch current wallet balance
    useEffect(() => {
        const fetchWallet = async () => {
            try {
                const res = await fetch(`/api/wallet/${walletId}`);
                if (res.ok) {
                    const data = await res.json();
                    setWalletBalance(data.wallet.balance);
                }
            } catch (error) {
                console.error('Failed to fetch wallet:', error);
            } finally {
                setLoadingWallet(false);
            }
        };

        if (walletId) {
            fetchWallet();
        }
    }, [walletId]);

    // Format card number with spaces
    const formatCardNumber = (value: string) => {
        const cleaned = value.replace(/\D/g, '').slice(0, 16);
        const groups = cleaned.match(/.{1,4}/g);
        return groups ? groups.join(' ') : cleaned;
    };

    // Format expiry as MM/YY
    const formatExpiry = (value: string) => {
        const cleaned = value.replace(/\D/g, '').slice(0, 4);
        if (cleaned.length >= 2) {
            return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
        }
        return cleaned;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const finalLockAmount = lockOption === 'all' ? amount : lockAmount;
        if (lockOption === 'partial' && (finalLockAmount < amount * 0.2 || finalLockAmount > amount)) {
            showError(`Lock amount must be between ₦${(amount * 0.2).toLocaleString()} and ₦${amount.toLocaleString()}`);
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletId,
                    amount,
                    cardNumber: cardNumber.replace(/\s/g, ''),
                    expiry,
                    cvv,
                    schedule,
                    lockSettings: {
                        enabled: true,
                        description: lockDescription,
                        amount: finalLockAmount
                    }
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setShowConfetti(true);
                showDeposit(amount);
                setWalletBalance((prev) => (prev !== null ? prev + amount : amount));

                setTimeout(() => {
                    setShowConfetti(false);
                    router.push(`/wallet/${walletId}`);
                }, 2000);
            } else {
                showError(data.error || 'Deposit failed');
            }
        } catch {
            showError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Confetti effect
    const ConfettiParticle = ({ index }: { index: number }) => (
        <motion.div
            initial={{ y: -20, x: (index / 50) * window.innerWidth, opacity: 1, rotate: 0 }}
            animate={{
                y: window.innerHeight + 100,
                opacity: 0,
                rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
                x: (index / 50) * window.innerWidth + (Math.random() - 0.5) * 200,
            }}
            transition={{ duration: 2 + Math.random(), delay: index * 0.02, ease: 'easeOut' }}
            className="fixed top-0 w-3 h-3 rounded-sm pointer-events-none z-50"
            style={{
                background: ['#007BFF', '#28A745', '#FFC107', '#DC3545', '#6C757D'][
                    Math.floor(Math.random() * 5)
                ],
            }}
        />
    );

    return (
        <div className="min-h-screen bg-neutral-light py-8 px-4">
            {/* Confetti */}
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50">
                    {Array.from({ length: 50 }).map((_, i) => (
                        <ConfettiParticle key={i} index={i} />
                    ))}
                </div>
            )}

            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <h1 className="text-3xl font-bold text-neutral-dark">Make a Deposit</h1>
                    <p className="text-gray-500 mt-1">Add funds to your healthcare wallet</p>
                </motion.div>

                {/* Current Balance */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="p-4 mb-6 bg-gradient-to-r from-primary/10 to-secondary/10 border-l-4 border-primary">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Current Balance</p>
                                {loadingWallet ? (
                                    <Skeleton className="h-8 w-32 mt-1" />
                                ) : (
                                    <p className="text-2xl font-bold text-neutral-dark">
                                        ₦{walletBalance?.toLocaleString() ?? '0'}
                                    </p>
                                )}
                            </div>
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* Deposit Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Amount Selection */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-dark mb-3">
                                    Select Amount
                                </label>
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    {presetAmounts.map((preset) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setAmount(preset)}
                                            className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${amount === preset
                                                ? 'bg-primary text-white shadow-lg scale-105'
                                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200 hover:scale-102'
                                                }`}
                                        >
                                            ₦{preset.toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-dark font-medium text-lg">
                                        ₦
                                    </span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(Number(e.target.value))}
                                        className="w-full pl-10 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-white text-xl font-bold"
                                        min={100}
                                        max={1000000}
                                    />
                                </div>
                            </div>

                            {/* Card Preview */}
                            <div className="relative h-48 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 p-6 text-white shadow-xl overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="w-12 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded" />
                                        <span className="text-lg font-bold">VITA</span>
                                    </div>
                                    <p className="text-xl tracking-widest font-mono mb-4">
                                        {cardNumber || '•••• •••• •••• ••••'}
                                    </p>
                                    <div className="flex justify-between">
                                        <div>
                                            <p className="text-xs text-gray-400">CARD HOLDER</p>
                                            <p className="font-medium">{cardName || 'YOUR NAME'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">EXPIRES</p>
                                            <p className="font-medium">{expiry || 'MM/YY'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Details */}
                            <div className="space-y-4">
                                <Input
                                    label="Card Number"
                                    placeholder="4242 4242 4242 4242"
                                    value={cardNumber}
                                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                    required
                                />

                                <Input
                                    label="Cardholder Name"
                                    placeholder="John Doe"
                                    value={cardName}
                                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                                    required
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Expiry Date"
                                        placeholder="MM/YY"
                                        value={expiry}
                                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                                        required
                                    />
                                    <Input
                                        label="CVV"
                                        placeholder="123"
                                        type="password"
                                        value={cvv}
                                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Lock Funds Section */}
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <div className="mb-4">
                                    <h3 className="font-semibold text-neutral-dark">Lock Funds (Mandatory 20% Min)</h3>
                                    <p className="text-xs text-gray-500">A minimum of 20% must be reserved for medical purposes</p>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-dark mb-2">
                                            How much to lock?
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setLockOption('all');
                                                    setLockAmount(amount);
                                                }}
                                                className={`p-3 rounded-xl border-2 text-left transition-all ${lockOption === 'all'
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <p className="text-sm font-semibold text-neutral-dark">Lock All</p>
                                                <p className="text-xs text-gray-500">₦{amount.toLocaleString()}</p>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setLockOption('partial');
                                                    setLockAmount(Math.max(lockAmount, amount * 0.2));
                                                }}
                                                className={`p-3 rounded-xl border-2 text-left transition-all ${lockOption === 'partial'
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <p className="text-sm font-semibold text-neutral-dark">Partial Amount</p>
                                                <p className="text-xs text-gray-500">Choose how much</p>
                                            </button>
                                        </div>
                                    </div>

                                    {lockOption === 'partial' && (
                                        <Input
                                            label={`Amount to Lock (Min ₦${(amount * 0.2).toLocaleString()})`}
                                            type="number"
                                            value={lockAmount}
                                            onChange={(e) => setLockAmount(Number(e.target.value))}
                                            min={amount * 0.2}
                                            max={amount}
                                            required
                                            className="bg-white"
                                        />
                                    )}

                                    <Input
                                        label="Description (What is this lock for?)"
                                        placeholder="e.g. Healthcare fund"
                                        value={lockDescription}
                                        onChange={(e) => setLockDescription(e.target.value)}
                                        required
                                        className="bg-white"
                                    />
                                    <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                        Locked funds can only be charged directly by pharmacies for medications.
                                    </p>
                                </div>
                            </div>

                            {/* Schedule Selection */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-dark mb-3">
                                    Deposit Schedule
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {([
                                        { value: 'one-time', label: 'One Time', icon: '1️⃣' },
                                        { value: 'daily', label: 'Daily', icon: '📅' },
                                        { value: 'weekly', label: 'Weekly', icon: '📆' },
                                        { value: 'monthly', label: 'Monthly', icon: '🗓️' },
                                    ] as const).map((s) => (
                                        <label
                                            key={s.value}
                                            className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${schedule === s.value
                                                ? 'border-primary bg-primary/5'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="schedule"
                                                value={s.value}
                                                checked={schedule === s.value}
                                                onChange={(e) => setSchedule(e.target.value as Schedule)}
                                                className="sr-only"
                                            />
                                            <span className="text-xl">{s.icon}</span>
                                            <span className="font-medium">{s.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                variant="primary"
                                className="w-full py-4 text-lg"
                                disabled={isLoading || !cardNumber || !expiry || !cvv}
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Processing...
                                    </span>
                                ) : (
                                    `Deposit ₦${amount.toLocaleString()}`
                                )}
                            </Button>

                            {/* Demo Notice */}
                            <p className="text-xs text-center text-gray-500">
                                🔒 Test mode: Use any card number starting with &quot;4&quot; for successful deposit
                            </p>
                        </form>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
