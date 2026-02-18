'use client';

import React, { useState } from 'react';
import { Modal, Input, Button } from './ui';
import { showError } from './ui/Toast';
import toast from 'react-hot-toast';

interface LockFundsModalProps {
    isOpen: boolean;
    onClose: () => void;
    walletId: string;
    availableBalance: number;
    onSuccess: () => void;
}

export default function LockFundsModal({ isOpen, onClose, walletId, availableBalance, onSuccess }: LockFundsModalProps) {
    const [medicationName, setMedicationName] = useState('');
    const [amount, setAmount] = useState<string>('');
    const [duration, setDuration] = useState('30');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || Number(amount) <= 0) {
            showError('Please enter a valid amount');
            return;
        }
        if (Number(amount) > availableBalance) {
            showError('Insufficient available balance');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch(`/api/wallet/${walletId}/lock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create',
                    medicationName,
                    amount: Number(amount),
                    durationDays: Number(duration)
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success('Funds locked successfully', { icon: '🔒' });
                onSuccess();
                onClose();
                setMedicationName('');
                setAmount('');
                setDuration('30');
            } else {
                showError(data.error || 'Failed to lock funds');
            }
        } catch (error) {
            showError('Network error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Lock Funds">
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-gray-500">
                    Reserve funds for specific medication. Calls for emergency unlock incur a 5% fee.
                </p>

                <div className="p-3 bg-blue-50 rounded-lg text-blue-800 text-sm font-medium mb-2">
                    Available to Lock: ₦{availableBalance.toLocaleString()}
                </div>

                <Input
                    label="Medication Name"
                    placeholder="e.g. Insulin"
                    value={medicationName}
                    onChange={(e) => setMedicationName(e.target.value)}
                    required
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Amount (₦)"
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        max={availableBalance}
                        required
                    />
                    <Input
                        label="Duration (Days)"
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        min="1"
                        required
                    />
                </div>

                <Button
                    type="submit"
                    className="w-full"
                    isLoading={isLoading}
                    disabled={isLoading || !medicationName || !amount}
                >
                    Lock Funds
                </Button>
            </form>
        </Modal>
    );
}
