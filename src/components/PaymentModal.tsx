'use client';

import React, { useState } from 'react';
import { Modal, Input, Button } from './ui';
import { showError } from './ui/Toast';
import toast from 'react-hot-toast';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    prefilledLinkCode?: string;
    prefilledMedication?: string;
    prefilledAmount?: number;
}

export default function PaymentModal({
    isOpen,
    onClose,
    onSuccess,
    prefilledLinkCode = '',
    prefilledMedication = '',
    prefilledAmount = 0
}: PaymentModalProps) {
    const [linkCode, setLinkCode] = useState(prefilledLinkCode);
    const [medicationName, setMedicationName] = useState(prefilledMedication);
    const [amount, setAmount] = useState<string>(prefilledAmount > 0 ? prefilledAmount.toString() : '');
    const [isLoading, setIsLoading] = useState(false);

    // Update state if props change when opening
    React.useEffect(() => {
        if (isOpen) {
            setLinkCode(prefilledLinkCode);
            setMedicationName(prefilledMedication);
            setAmount(prefilledAmount > 0 ? prefilledAmount.toString() : '');
        }
    }, [isOpen, prefilledLinkCode, prefilledMedication, prefilledAmount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!linkCode || !medicationName || !amount || Number(amount) <= 0) {
            showError('Please fill all fields correctly');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/pharmacy/deduct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    linkCode,
                    medicationName,
                    amount: Number(amount)
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success('Payment processed successfully!', { icon: '✅' });
                onSuccess();
                onClose();
                // Reset form
                setLinkCode('');
                setMedicationName('');
                setAmount('');
            } else {
                showError(data.error || 'Payment failed');
                if (data.details) {
                    console.error('Payment details:', data.details);
                }
            }
        } catch (error) {
            showError('Network error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Process Payment">
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-gray-500">
                    Deduct funds from a parent&apos;s wallet for medication refill.
                </p>

                <Input
                    label="Parent Link Code"
                    placeholder="e.g. PAR-123456"
                    value={linkCode}
                    onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                    required
                />

                <Input
                    label="Medication Name"
                    placeholder="e.g. Insulin"
                    value={medicationName}
                    onChange={(e) => setMedicationName(e.target.value)}
                    required
                />

                <Input
                    label="Amount (₦)"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    required
                />

                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-800">
                        <span className="font-semibold">Note:</span> If funds are locked for this medication, they will be used first. Otherwise, the main available balance will be charged.
                    </p>
                </div>

                <Button
                    type="submit"
                    className="w-full"
                    isLoading={isLoading}
                    disabled={isLoading || !linkCode || !medicationName || !amount}
                >
                    Charge Wallet
                </Button>
            </form>
        </Modal>
    );
}
