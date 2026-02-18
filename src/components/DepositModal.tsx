'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal, Input, Button } from './ui';
import { showDeposit, showError } from './ui/Toast';

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    walletId: string;
    onSuccess?: (amount: number) => void;
}

type Schedule = 'one-time' | 'daily' | 'weekly' | 'monthly';

const presetAmounts = [1000, 2000, 5000, 10000, 20000, 50000];

export default function DepositModal({ isOpen, onClose, walletId, onSuccess }: DepositModalProps) {
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [amount, setAmount] = useState(5000);
    const [schedule, setSchedule] = useState<Schedule>('one-time');

    const [isLoading, setIsLoading] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Lock State
    const [isLockEnabled, setIsLockEnabled] = useState(false);
    const [lockMedicationName, setLockMedicationName] = useState('');
    const [lockAmount, setLockAmount] = useState(0);
    const [lockDuration, setLockDuration] = useState(30);

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
                        enabled: isLockEnabled,
                        medicationName: lockMedicationName,
                        amount: lockAmount,
                        durationDays: lockDuration
                    }
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setShowConfetti(true);
                showDeposit(amount);

                // Hide confetti and close after animation
                setTimeout(() => {
                    setShowConfetti(false);
                    onSuccess?.(amount);
                    onClose();
                    // Reset form
                    setCardNumber('');
                    setExpiry('');
                    setCvv('');
                    setAmount(5000);
                    setAmount(5000);
                    setSchedule('one-time');
                    setIsLockEnabled(false);
                    setLockMedicationName('');
                    setLockAmount(0);
                    setLockDuration(30);
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

    // Confetti particles
    const ConfettiParticle = ({ delay, x }: { delay: number; x: number }) => (
        <motion.div
            initial={{ y: -20, x, opacity: 1, rotate: 0 }}
            animate={{
                y: 400,
                opacity: 0,
                rotate: 360,
                x: x + (Math.random() - 0.5) * 100,
            }}
            transition={{ duration: 2, delay, ease: 'easeOut' }}
            className="absolute top-0 w-3 h-3 rounded-sm"
            style={{
                background: ['#007BFF', '#28A745', '#FFC107', '#DC3545', '#6C757D'][
                    Math.floor(Math.random() * 5)
                ],
            }}
        />
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Make a Deposit">
            <AnimatePresence>
                {showConfetti && (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
                        {Array.from({ length: 50 }).map((_, i) => (
                            <ConfettiParticle key={i} delay={i * 0.02} x={(i / 50) * 400 - 50} />
                        ))}
                    </div>
                )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Amount Selection */}
                <div>
                    <label className="block text-sm font-medium text-neutral-dark mb-3">
                        Select Amount
                    </label>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {presetAmounts.map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => setAmount(preset)}
                                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${amount === preset
                                    ? 'bg-primary text-white shadow-lg scale-105'
                                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                    }`}
                            >
                                ₦{preset.toLocaleString()}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-dark font-medium">
                            ₦
                        </span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-white text-lg font-semibold"
                            min={100}
                            max={1000000}
                        />
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
                        leftIcon={
                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        }
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Expiry"
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

                {/* Schedule Selection */}
                <div>
                    <label className="block text-sm font-medium text-neutral-dark mb-3">
                        Deposit Schedule
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {(['one-time', 'daily', 'weekly', 'monthly'] as Schedule[]).map((s) => (
                            <label
                                key={s}
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${schedule === s
                                    ? 'border-primary bg-primary/5'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="schedule"
                                    value={s}
                                    checked={schedule === s}
                                    onChange={(e) => setSchedule(e.target.value as Schedule)}
                                    className="sr-only"
                                />
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${schedule === s ? 'border-primary' : 'border-gray-300'
                                    }`}>
                                    {schedule === s && (
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                    )}
                                </div>
                                <span className="capitalize text-sm font-medium">
                                    {s === 'one-time' ? 'One Time' : s}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>



                {/* Lock Funds Option */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold text-neutral-dark">Lock Funds?</h3>
                            <p className="text-xs text-gray-500">Reserve money for specific medication</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isLockEnabled}
                                onChange={(e) => {
                                    setIsLockEnabled(e.target.checked);
                                    if (e.target.checked) setLockAmount(amount);
                                }}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    <AnimatePresence>
                        {isLockEnabled && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden space-y-3"
                            >
                                <Input
                                    label="Medication Name"
                                    placeholder="e.g. Insulin"
                                    value={lockMedicationName}
                                    onChange={(e) => setLockMedicationName(e.target.value)}
                                    required={isLockEnabled}
                                    className="bg-white"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        label="Amount to Lock"
                                        type="number"
                                        value={lockAmount}
                                        onChange={(e) => setLockAmount(Number(e.target.value))}
                                        max={amount}
                                        required={isLockEnabled}
                                        className="bg-white"
                                    />
                                    <Input
                                        label="Duration (Days)"
                                        type="number"
                                        value={lockDuration}
                                        onChange={(e) => setLockDuration(Number(e.target.value))}
                                        min={1}
                                        required={isLockEnabled}
                                        className="bg-white"
                                    />
                                </div>
                                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                    ⚠️ Unlocking early incurs a 5% fee. Auto-unlocks in {lockDuration} days.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
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
                    Demo mode: Use card starting with &quot;4&quot; for successful deposit
                </p>
            </form>
        </Modal >
    );
}
