'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Input, Modal, Skeleton } from '@/components/ui';
import { CountdownTimer } from '@/components/ui';
import FastForwardButton from '@/components/FastForwardButton';
import { showSuccess, showError } from '@/components/ui/Toast';

interface Medication {
    _id: string;
    name: string;
    remainingQty: number;
    usageRate: number;
    refillCost: number;
    pharmacyId?: string;
    countdownDays: number;
    createdAt: string;
}

export default function MedicationsPage() {
    const params = useParams();
    const router = useRouter();
    const walletId = params.walletId as string;

    const [medications, setMedications] = useState<Medication[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingMed, setEditingMed] = useState<Medication | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        remainingQty: 30,
        usageRate: 1,
        refillCost: 5000,
    });

    const fetchMedications = async () => {
        try {
            const res = await fetch(`/api/medication?walletId=${walletId}`);
            if (res.ok) {
                const data = await res.json();
                setMedications(data.medications || []);
            }
        } catch (error) {
            console.error('Failed to fetch medications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (walletId) {
            fetchMedications();
        }
    }, [walletId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const res = await fetch('/api/medication', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    walletId,
                    medicationId: editingMed?._id,
                }),
            });

            if (res.ok) {
                showSuccess(editingMed ? 'Medication updated!' : 'Medication added!');
                setShowAddModal(false);
                setEditingMed(null);
                setFormData({ name: '', remainingQty: 30, usageRate: 1, refillCost: 5000 });
                fetchMedications();
            } else {
                const data = await res.json();
                showError(data.error || 'Failed to save medication');
            }
        } catch {
            showError('Network error. Please try again.');
        }
    };

    const openEditModal = (med: Medication) => {
        setEditingMed(med);
        setFormData({
            name: med.name,
            remainingQty: med.remainingQty,
            usageRate: med.usageRate,
            refillCost: med.refillCost,
        });
        setShowAddModal(true);
    };

    const handleCountdownUpdate = (medId: string, newDays: number) => {
        setMedications((prev) =>
            prev.map((m) => (m._id === medId ? { ...m, countdownDays: newDays } : m))
        );
    };

    const getCountdownColor = (days: number) => {
        if (days <= 0) return 'text-red-500';
        if (days <= 3) return 'text-amber-500';
        return 'text-green-500';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-light p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Skeleton className="h-20 rounded-xl" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-48 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-light p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-8"
                >
                    <div>
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back
                        </button>
                        <h1 className="text-3xl font-bold text-neutral-dark">Medications</h1>
                        <p className="text-gray-500">Track your medication refill countdowns</p>
                    </div>
                    <Button variant="primary" onClick={() => setShowAddModal(true)}>
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Medication
                    </Button>
                </motion.div>

                {/* Medications Grid */}
                {medications.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <Card className="p-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-neutral-dark mb-2">No medications yet</h3>
                            <p className="text-gray-500 mb-4">Add your first medication to start tracking refill countdowns</p>
                            <Button variant="primary" onClick={() => setShowAddModal(true)}>
                                Add Your First Medication
                            </Button>
                        </Card>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AnimatePresence>
                            {medications.map((med, index) => (
                                <motion.div
                                    key={med._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card className="p-6 hover:shadow-lg transition-shadow">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-neutral-dark">{med.name}</h3>
                                                <p className="text-sm text-gray-500">Refill cost: ₦{med.refillCost.toLocaleString()}</p>
                                            </div>
                                            <button
                                                onClick={() => openEditModal(med)}
                                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Countdown Display */}
                                        <div className="flex items-center justify-center mb-4">
                                            <CountdownTimer
                                                days={med.countdownDays}
                                                size={120}
                                                maxDays={Math.max(med.countdownDays, 30)}
                                            />
                                        </div>

                                        <div className="text-center mb-4">
                                            <span className={`text-2xl font-bold ${getCountdownColor(med.countdownDays)}`}>
                                                {med.countdownDays} days
                                            </span>
                                            <p className="text-sm text-gray-500">until refill needed</p>
                                        </div>

                                        {/* Stats */}
                                        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg mb-4">
                                            <div className="text-center">
                                                <p className="text-sm text-gray-500">Remaining</p>
                                                <p className="font-semibold">{med.remainingQty} units</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm text-gray-500">Daily Usage</p>
                                                <p className="font-semibold">{med.usageRate}/day</p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <FastForwardButton
                                                medicationId={med._id}
                                                medicationName={med.name}
                                                currentDays={med.countdownDays}
                                                refillCost={med.refillCost}
                                                onUpdate={(newDays) => handleCountdownUpdate(med._id, newDays)}
                                            />
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* Add/Edit Modal */}
                <Modal
                    isOpen={showAddModal}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingMed(null);
                        setFormData({ name: '', remainingQty: 30, usageRate: 1, refillCost: 5000 });
                    }}
                    title={editingMed ? 'Edit Medication' : 'Add Medication'}
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="Medication Name"
                            placeholder="e.g., Insulin, Metformin"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Remaining Quantity"
                                type="number"
                                value={formData.remainingQty}
                                onChange={(e) => setFormData({ ...formData, remainingQty: Number(e.target.value) })}
                                min={1}
                                required
                            />
                            <Input
                                label="Daily Usage"
                                type="number"
                                value={formData.usageRate}
                                onChange={(e) => setFormData({ ...formData, usageRate: Number(e.target.value) })}
                                min={1}
                                required
                            />
                        </div>

                        <Input
                            label="Refill Cost (₦)"
                            type="number"
                            value={formData.refillCost}
                            onChange={(e) => setFormData({ ...formData, refillCost: Number(e.target.value) })}
                            min={100}
                            required
                        />

                        {/* Auto-calculated countdown preview */}
                        <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">Estimated countdown:</p>
                            <p className="text-2xl font-bold text-primary">
                                {Math.floor(formData.remainingQty / formData.usageRate)} days
                            </p>
                            <p className="text-xs text-gray-500">Based on current quantity and usage rate</p>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    setShowAddModal(false);
                                    setEditingMed(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" className="flex-1">
                                {editingMed ? 'Update' : 'Add'} Medication
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </div>
    );
}
