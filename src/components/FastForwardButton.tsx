'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input } from './ui';
import { showDeduction, showError, showInfo } from './ui/Toast';

interface FastForwardButtonProps {
    medicationId: string;
    medicationName: string;
    currentDays: number;
    refillCost: number;
    onUpdate?: (newDays: number, deducted: boolean) => void;
}

export default function FastForwardButton({
    medicationId,
    medicationName,
    currentDays,
    refillCost,
    onUpdate,
}: FastForwardButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [days, setDays] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const handleFastForward = async () => {
        setIsLoading(true);

        try {
            const res = await fetch('/api/simulate-deduction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    medicationId,
                    daysToSkip: days,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                const newDays = currentDays - days;

                if (data.deducted) {
                    showDeduction(refillCost, medicationName);
                    onUpdate?.(data.newCountdownDays, true);
                } else {
                    showInfo(`Skipped ${days} day${days > 1 ? 's' : ''} - ${newDays} days remaining`);
                    onUpdate?.(newDays, false);
                }

                setIsOpen(false);
                setDays(1);
            } else {
                showError(data.error || 'Failed to simulate time');
            }
        } catch {
            showError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative">
            <Button
                variant="outline"
                onClick={() => setIsOpen(true)}
                className="text-demo border-demo hover:bg-demo/10"
            >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
                Fast Forward
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/30 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Popup */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 p-4"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-full bg-demo/10 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-demo" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-neutral-dark">Demo: Skip Time</h4>
                                    <p className="text-xs text-gray-500">{medicationName}</p>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Days to skip
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setDays(Math.max(1, days - 1))}
                                        className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-lg transition-colors"
                                    >
                                        −
                                    </button>
                                    <input
                                        type="number"
                                        value={days}
                                        onChange={(e) => setDays(Math.max(1, Math.min(currentDays + 10, Number(e.target.value))))}
                                        className="flex-1 text-center py-2 border rounded-lg font-semibold text-lg"
                                        min={1}
                                        max={currentDays + 10}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setDays(Math.min(currentDays + 10, days + 1))}
                                        className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-lg transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                                <div className="flex justify-between mb-1">
                                    <span className="text-gray-600">Current</span>
                                    <span className="font-medium">{currentDays} days</span>
                                </div>
                                <div className="flex justify-between mb-1">
                                    <span className="text-gray-600">After skip</span>
                                    <span className={`font-medium ${currentDays - days <= 0 ? 'text-red-500' : ''}`}>
                                        {Math.max(0, currentDays - days)} days
                                    </span>
                                </div>
                                {currentDays - days <= 0 && (
                                    <div className="flex justify-between text-red-500 pt-1 border-t border-gray-200 mt-1">
                                        <span>Auto-refill</span>
                                        <span className="font-semibold">₦{refillCost.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleFastForward}
                                    disabled={isLoading}
                                    className="flex-1"
                                >
                                    {isLoading ? 'Skipping...' : 'Skip Time'}
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
