'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Modal, Input, Skeleton } from '@/components/ui';
import toast from 'react-hot-toast';

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
}

interface Transaction {
    amount: number;
    type: string;
    date: string;
    description?: string;
}

export default function WalletPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [parents, setParents] = useState<Parent[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedParent, setSelectedParent] = useState<string | null>(null);

    // Lock Funds Modal state
    const [showLockModal, setShowLockModal] = useState(false);
    const [lockParentId, setLockParentId] = useState<string>('');
    const [lockMedName, setLockMedName] = useState('');
    const [lockAmount, setLockAmount] = useState('');
    const [lockDuration, setLockDuration] = useState('30');
    const [lockLoading, setLockLoading] = useState(false);

    // Emergency Unlock state
    const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
    const [unlockTarget, setUnlockTarget] = useState<{
        lockId: string;
        walletId: string;
        medicationName: string;
        amount: number;
    } | null>(null);
    const [unlockLoading, setUnlockLoading] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }
        if (status === 'authenticated') {
            if (session?.user?.role === 'parent') {
                fetchParentWallet();
                return;
            }
            fetchWalletData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, session]);

    const fetchParentWallet = async () => {
        try {
            const res = await fetch('/api/dashboard');
            const data = await res.json();
            if (data.wallet?.id) {
                router.push(`/wallet/${data.wallet.id}`);
            } else {
                setLoading(false);
            }
        } catch {
            setLoading(false);
        }
    };

    const fetchWalletData = async () => {
        try {
            const res = await fetch('/api/dashboard');
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setParents(data.parents || []);

            const allTx: Transaction[] = [];
            for (const parent of (data.parents || [])) {
                if (parent.walletId) {
                    try {
                        const walletRes = await fetch(`/api/wallet/${parent.walletId}`);
                        if (walletRes.ok) {
                            const walletData = await walletRes.json();
                            const txs = (walletData.transactions || []).map((t: Transaction) => ({
                                ...t,
                                description: t.description || `${t.type === 'deposit' ? 'Deposit' : 'Deduction'} - ${parent.name}`,
                            }));
                            allTx.push(...txs);
                        }
                    } catch { /* skip */ }
                }
            }
            allTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setTransactions(allTx.slice(0, 20));
        } catch (error) {
            console.error('Wallet fetch error:', error);
            toast.error('Failed to load wallet data');
        } finally {
            setLoading(false);
        }
    };

    // ── Lock Funds Handler ──
    const handleLockFunds = async () => {
        if (!lockMedName.trim()) {
            toast.error('Please enter a medication name');
            return;
        }
        const amt = Number(lockAmount);
        if (!amt || amt <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        const parent = parents.find(p => p.walletId === lockParentId);
        if (!parent) {
            toast.error('Please select a parent wallet');
            return;
        }
        if (amt > (parent.availableBalance || 0)) {
            toast.error(`Insufficient available balance. Max: ₦${(parent.availableBalance || 0).toLocaleString()}`);
            return;
        }

        setLockLoading(true);
        try {
            const res = await fetch(`/api/wallet/${lockParentId}/lock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create',
                    medicationName: lockMedName.trim(),
                    amount: amt,
                    durationDays: Number(lockDuration) || 30,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`₦${amt.toLocaleString()} locked for ${lockMedName}`, { icon: '🔒' });
                setShowLockModal(false);
                setLockMedName('');
                setLockAmount('');
                setLockDuration('30');
                setLockParentId('');
                await fetchWalletData();
            } else {
                toast.error(data.error || 'Failed to lock funds');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setLockLoading(false);
        }
    };

    // ── Emergency Unlock Handler ──
    const handleEmergencyUnlock = async () => {
        if (!unlockTarget) return;
        setUnlockLoading(true);
        try {
            const res = await fetch(`/api/wallet/${unlockTarget.walletId}/lock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'emergency_unlock',
                    lockId: unlockTarget.lockId,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(
                    `Unlocked! Fee: ₦${data.fee?.toLocaleString() || '0'}`,
                    { icon: '🔓', duration: 5000 }
                );
                setShowUnlockConfirm(false);
                setUnlockTarget(null);
                await fetchWalletData();
            } else {
                toast.error(data.error || 'Failed to unlock');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setUnlockLoading(false);
        }
    };

    if (loading || status === 'loading') {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-64" />
                <Skeleton className="h-48 rounded-2xl" />
                <Skeleton className="h-64 rounded-2xl" />
                <Skeleton className="h-48 rounded-2xl" />
            </div>
        );
    }

    // Aggregate
    const totalBalance = parents.reduce((s, p) => s + (p.balance || 0), 0);
    const totalAvailable = parents.reduce((s, p) => s + (p.availableBalance || 0), 0);
    const totalLocked = parents.reduce((s, p) => s + (p.totalLocked || 0), 0);
    const allLockedFunds = parents.flatMap(p =>
        (p.lockedFunds || []).map(l => ({ ...l, parentName: p.name, walletId: p.walletId || '' }))
    );
    const lockedPercent = totalBalance > 0 ? Math.round((totalLocked / totalBalance) * 100) : 0;

    const filteredLocks = selectedParent
        ? allLockedFunds.filter(l => l.parentName === selectedParent)
        : allLockedFunds;

    const parentsWithWallet = parents.filter(p => p.walletId);

    return (
        <div className="max-w-4xl mx-auto">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-[#343A40]">
                        💰 Wallet
                    </h1>
                    <p className="text-[#6C757D] mt-1">
                        Your complete financial overview
                    </p>
                </div>
                {parentsWithWallet.length > 0 && (
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                            if (parentsWithWallet.length === 1) {
                                setLockParentId(parentsWithWallet[0].walletId!);
                            }
                            setShowLockModal(true);
                        }}
                    >
                        🔒 Lock Funds
                    </Button>
                )}
            </div>

            {/* Hero Balance Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <div
                    className="rounded-2xl p-6 md:p-8 mb-6 text-white relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #007BFF 0%, #0056b3 50%, #003d80 100%)' }}
                >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10">
                        <p className="text-sm opacity-80 mb-1">Total Balance</p>
                        <p className="text-4xl md:text-5xl font-bold mb-6">₦{totalBalance.toLocaleString()}</p>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-3 h-3 rounded-full bg-green-400" />
                                    <p className="text-sm opacity-80">Available</p>
                                </div>
                                <p className="text-2xl font-bold">₦{totalAvailable.toLocaleString()}</p>
                                <p className="text-xs opacity-60 mt-1">Ready to spend</p>
                            </div>
                            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                                    <p className="text-sm opacity-80">🔒 Locked</p>
                                </div>
                                <p className="text-2xl font-bold">₦{totalLocked.toLocaleString()}</p>
                                <p className="text-xs opacity-60 mt-1">Reserved for medication</p>
                            </div>
                        </div>

                        {totalBalance > 0 && (
                            <div className="mt-6">
                                <div className="flex justify-between text-xs opacity-80 mb-2 font-medium">
                                    <span>Available: {100 - lockedPercent}%</span>
                                    <span>Locked: {lockedPercent}%</span>
                                </div>
                                <div className="w-full h-3 flex bg-white/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full transition-all duration-700 ease-out"
                                        style={{
                                            width: `${100 - lockedPercent}%`,
                                            background: 'linear-gradient(90deg, #34d399, #10b981)',
                                        }}
                                        title={`Available: ₦${totalAvailable.toLocaleString()}`}
                                    />
                                    <div
                                        className="h-full transition-all duration-700 ease-out"
                                        style={{
                                            width: `${lockedPercent}%`,
                                            background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                                        }}
                                        title={`Locked: ₦${totalLocked.toLocaleString()}`}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Per-Parent Breakdown */}
            {parents.length > 1 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="mb-6"
                >
                    <h2 className="text-lg font-bold text-[#343A40] mb-3">Balance by Parent</h2>
                    <div className="grid md:grid-cols-2 gap-3">
                        {parents.map(parent => (
                            <Card key={parent.id} className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#007BFF]/10 rounded-full flex items-center justify-center text-2xl">
                                    {parent.avatar || '👤'}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-[#343A40] text-sm">{parent.name}</p>
                                    <div className="flex gap-3 mt-1">
                                        <span className="text-xs text-green-600">
                                            ✓ ₦{(parent.availableBalance || 0).toLocaleString()}
                                        </span>
                                        <span className="text-xs text-amber-600">
                                            🔒 ₦{(parent.totalLocked || 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <p className="font-bold text-[#343A40]">₦{parent.balance.toLocaleString()}</p>
                            </Card>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Locked Funds Detail */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="mb-6"
            >
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-[#343A40]">🔒 Locked Funds</h2>
                    <div className="flex items-center gap-2">
                        {parents.length > 1 && (
                            <select
                                value={selectedParent || ''}
                                onChange={(e) => setSelectedParent(e.target.value || null)}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-[#343A40] bg-white"
                            >
                                <option value="">All Parents</option>
                                {parents.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {filteredLocks.length === 0 ? (
                    <Card className="text-center py-8">
                        <div className="text-4xl mb-2">🔓</div>
                        <p className="text-[#6C757D] font-medium mb-1">No locked funds</p>
                        <p className="text-sm text-[#6C757D] mb-4">
                            Lock funds to reserve money for specific medications.
                        </p>
                        {parentsWithWallet.length > 0 && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                    if (parentsWithWallet.length === 1) {
                                        setLockParentId(parentsWithWallet[0].walletId!);
                                    }
                                    setShowLockModal(true);
                                }}
                            >
                                Lock Funds Now
                            </Button>
                        )}
                    </Card>
                ) : (
                    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                        <div className="divide-y divide-gray-100">
                            <AnimatePresence>
                                {filteredLocks.map((lock) => {
                                    const daysLeft = Math.max(0, Math.ceil((new Date(lock.unlocksAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                                    const totalDuration = 30;
                                    const progress = Math.max(0, Math.min(100, ((totalDuration - daysLeft) / totalDuration) * 100));
                                    const fee = lock.amount * 0.05;

                                    return (
                                        <motion.div
                                            key={lock.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            className="px-5 py-4"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                                        <span>💊</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-[#343A40]">{lock.medicationName}</p>
                                                        <p className="text-xs text-[#6C757D]">
                                                            {lock.parentName}&apos;s wallet
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <p className="font-bold text-amber-600">₦{lock.amount.toLocaleString()}</p>
                                                        <p className="text-xs text-[#6C757D]">
                                                            {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setUnlockTarget({
                                                                lockId: lock.id,
                                                                walletId: lock.walletId,
                                                                medicationName: lock.medicationName,
                                                                amount: lock.amount,
                                                            });
                                                            setShowUnlockConfirm(true);
                                                        }}
                                                        className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                                                        title={`Emergency unlock — 5% fee (₦${fee.toLocaleString()})`}
                                                    >
                                                        🔓 Unlock
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Timer progress bar */}
                                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${100 - progress}%`,
                                                        background: daysLeft <= 3
                                                            ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                                                            : 'linear-gradient(90deg, #f59e0b, #d97706)',
                                                    }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-1">
                                                <span className="text-[10px] text-[#6C757D]">Locked</span>
                                                <span className="text-[10px] text-[#6C757D]">
                                                    Unlocks {new Date(lock.unlocksAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Transaction History */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
            >
                <h2 className="text-lg font-bold text-[#343A40] mb-3">📋 Recent Transactions</h2>

                {transactions.length === 0 ? (
                    <Card className="text-center py-8">
                        <div className="text-4xl mb-2">📭</div>
                        <p className="text-[#6C757D]">No transactions yet</p>
                    </Card>
                ) : (
                    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                        <div className="divide-y divide-gray-100">
                            {transactions.map((tx, i) => (
                                <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.type === 'deposit'
                                            ? 'bg-green-100'
                                            : 'bg-red-100'
                                            }`}>
                                            <span className="text-sm">{tx.type === 'deposit' ? '↗️' : '↘️'}</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-[#343A40] text-sm">{tx.description || tx.type}</p>
                                            <p className="text-xs text-[#6C757D]">
                                                {new Date(tx.date).toLocaleDateString()} · {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <p className={`font-bold text-sm ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-500'
                                        }`}>
                                        {tx.type === 'deposit' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>

            {/* ══════════ LOCK FUNDS MODAL ══════════ */}
            <Modal
                isOpen={showLockModal}
                onClose={() => {
                    setShowLockModal(false);
                    setLockMedName('');
                    setLockAmount('');
                    setLockDuration('30');
                    setLockParentId('');
                }}
                title="🔒 Lock Funds for Medication"
            >
                <div className="space-y-4">
                    <p className="text-sm text-[#6C757D]">
                        Reserve money for a specific medication. You can also add funds to an existing lock.
                    </p>

                    {/* Parent selector (if multiple) */}
                    {parentsWithWallet.length > 1 && (
                        <div>
                            <label className="block text-sm font-medium text-[#343A40] mb-1">
                                Select Parent Wallet
                            </label>
                            <select
                                value={lockParentId}
                                onChange={(e) => setLockParentId(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#343A40] bg-white"
                            >
                                <option value="">Choose a wallet...</option>
                                {parentsWithWallet.map(p => (
                                    <option key={p.walletId} value={p.walletId!}>
                                        {p.name} — Available: ₦{(p.availableBalance || 0).toLocaleString()}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Available balance indicator */}
                    {lockParentId && (
                        <div className="p-3 bg-blue-50 rounded-lg text-blue-800 text-sm font-medium">
                            Available to Lock: ₦{(parents.find(p => p.walletId === lockParentId)?.availableBalance || 0).toLocaleString()}
                        </div>
                    )}

                    {/* Existing medications quick-select */}
                    {(() => {
                        const selectedParentLocks = lockParentId
                            ? (parents.find(p => p.walletId === lockParentId)?.lockedFunds || [])
                            : allLockedFunds;
                        const uniqueMeds = Array.from(new Set(selectedParentLocks.map(l => l.medicationName)));

                        if (uniqueMeds.length > 0) {
                            return (
                                <div>
                                    <label className="block text-sm font-medium text-[#343A40] mb-2">
                                        Add to existing or create new
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {uniqueMeds.map(med => {
                                            const isSelected = lockMedName === med;
                                            const lockedAmt = selectedParentLocks
                                                .filter(l => l.medicationName === med)
                                                .reduce((s, l) => s + l.amount, 0);
                                            return (
                                                <button
                                                    key={med}
                                                    type="button"
                                                    onClick={() => setLockMedName(med)}
                                                    className={`
                                                        px-3 py-2 rounded-lg text-sm font-medium transition-all border
                                                        ${isSelected
                                                            ? 'bg-amber-100 border-amber-400 text-amber-800 ring-2 ring-amber-300'
                                                            : 'bg-gray-50 border-gray-200 text-[#343A40] hover:bg-gray-100'
                                                        }
                                                    `}
                                                >
                                                    <span className="flex items-center gap-1.5">
                                                        💊 {med}
                                                        <span className={`text-xs ${isSelected ? 'text-amber-600' : 'text-[#6C757D]'}`}>
                                                            (₦{lockedAmt.toLocaleString()})
                                                        </span>
                                                    </span>
                                                </button>
                                            );
                                        })}
                                        <button
                                            type="button"
                                            onClick={() => setLockMedName('')}
                                            className={`
                                                px-3 py-2 rounded-lg text-sm font-medium transition-all border
                                                ${lockMedName === '' || !uniqueMeds.includes(lockMedName)
                                                    ? 'bg-blue-50 border-blue-400 text-blue-800 ring-2 ring-blue-300'
                                                    : 'bg-gray-50 border-gray-200 text-[#343A40] hover:bg-gray-100'
                                                }
                                            `}
                                        >
                                            ➕ New Medication
                                        </button>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    {/* Medication name — show input if "New" is selected or no existing meds */}
                    {(() => {
                        const selectedParentLocks = lockParentId
                            ? (parents.find(p => p.walletId === lockParentId)?.lockedFunds || [])
                            : allLockedFunds;
                        const uniqueMeds = Array.from(new Set(selectedParentLocks.map(l => l.medicationName)));
                        const isExisting = uniqueMeds.includes(lockMedName);

                        if (isExisting) {
                            // Show selected med info
                            const lockedAmt = selectedParentLocks
                                .filter(l => l.medicationName === lockMedName)
                                .reduce((s, l) => s + l.amount, 0);
                            return (
                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">💊</div>
                                    <div>
                                        <p className="font-semibold text-[#343A40] text-sm">{lockMedName}</p>
                                        <p className="text-xs text-amber-700">
                                            Currently locked: ₦{lockedAmt.toLocaleString()} · Adding more funds
                                        </p>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <Input
                                label={uniqueMeds.length > 0 ? "New Medication Name" : "Medication Name"}
                                placeholder="e.g. Insulin, Paracetamol"
                                value={lockMedName}
                                onChange={(e) => setLockMedName(e.target.value)}
                                required
                            />
                        );
                    })()}

                    {(() => {
                        const selectedParentLocks2 = lockParentId
                            ? (parents.find(p => p.walletId === lockParentId)?.lockedFunds || [])
                            : allLockedFunds;
                        const uniqueMeds2 = Array.from(new Set(selectedParentLocks2.map(l => l.medicationName)));
                        const isExistingMed = uniqueMeds2.includes(lockMedName);

                        return (
                            <div className={isExistingMed ? '' : 'grid grid-cols-2 gap-4'}>
                                <Input
                                    label="Amount (₦)"
                                    type="number"
                                    placeholder="0.00"
                                    value={lockAmount}
                                    onChange={(e) => setLockAmount(e.target.value)}
                                    required
                                />
                                {!isExistingMed && (
                                    <Input
                                        label="Duration (Days)"
                                        type="number"
                                        value={lockDuration}
                                        onChange={(e) => setLockDuration(e.target.value)}
                                        min={1}
                                        required
                                    />
                                )}
                                {isExistingMed && (
                                    <p className="text-xs text-[#6C757D] mt-1">
                                        Duration uses the existing lock&apos;s schedule — no need to set again.
                                    </p>
                                )}
                            </div>
                        );
                    })()}

                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-xs text-amber-800">
                            ⚠️ <strong>Early unlock fee:</strong> Unlocking before the duration expires will incur a <strong>5% penalty</strong> on the locked amount.
                        </p>
                        {lockAmount && Number(lockAmount) > 0 && (
                            <p className="text-xs text-amber-700 mt-1">
                                Penalty if unlocked early: <strong>₦{(Number(lockAmount) * 0.05).toLocaleString()}</strong>
                            </p>
                        )}
                    </div>

                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        isLoading={lockLoading}
                        disabled={lockLoading || !lockMedName || !lockAmount || !lockParentId}
                        onClick={handleLockFunds}
                    >
                        {(() => {
                            const selectedParentLocks = lockParentId
                                ? (parents.find(p => p.walletId === lockParentId)?.lockedFunds || [])
                                : allLockedFunds;
                            const uniqueMeds = Array.from(new Set(selectedParentLocks.map(l => l.medicationName)));
                            const isExisting = uniqueMeds.includes(lockMedName);
                            const amt = Number(lockAmount);

                            if (isExisting && amt > 0) {
                                return `Add ₦${amt.toLocaleString()} to ${lockMedName}`;
                            }
                            if (amt > 0) {
                                return `Lock ₦${amt.toLocaleString()}`;
                            }
                            return 'Lock Funds';
                        })()}
                    </Button>
                </div>
            </Modal>

            {/* ══════════ EMERGENCY UNLOCK CONFIRMATION ══════════ */}
            <Modal
                isOpen={showUnlockConfirm}
                onClose={() => {
                    setShowUnlockConfirm(false);
                    setUnlockTarget(null);
                }}
                title="⚠️ Emergency Unlock"
            >
                {unlockTarget && (
                    <div className="space-y-4">
                        <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                            <p className="text-sm text-red-800 font-medium mb-3">
                                Are you sure you want to unlock these funds early?
                            </p>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-red-700">Medication:</span>
                                    <span className="font-medium text-red-900">{unlockTarget.medicationName}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-red-700">Locked Amount:</span>
                                    <span className="font-medium text-red-900">₦{unlockTarget.amount.toLocaleString()}</span>
                                </div>
                                <hr className="border-red-200" />
                                <div className="flex justify-between text-sm">
                                    <span className="text-red-700">5% Penalty Fee:</span>
                                    <span className="font-bold text-red-900">
                                        -₦{(unlockTarget.amount * 0.05).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-red-700">You get back:</span>
                                    <span className="font-bold text-green-700">
                                        ₦{(unlockTarget.amount * 0.95).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-[#6C757D] text-center">
                            This action cannot be undone. The 5% fee will be deducted from your wallet balance.
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowUnlockConfirm(false);
                                    setUnlockTarget(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                isLoading={unlockLoading}
                                onClick={handleEmergencyUnlock}
                                className="bg-red-600! hover:bg-red-700!"
                            >
                                🔓 Unlock Now
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
