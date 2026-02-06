'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface User {
    id: string;
    email: string;
    name?: string;
    role: 'child' | 'parent' | 'pharmacy';
    links?: string[];
    walletId?: string;
}

interface Wallet {
    id: string;
    balance: number;
    owner: string;
    transactions: Array<{
        id: string;
        amount: number;
        type: 'deposit' | 'deduction';
        date: string;
        description?: string;
        schedule?: 'one-time' | 'daily' | 'weekly' | 'monthly';
    }>;
}

interface Medication {
    id: string;
    name: string;
    remainingQty: number;
    usageRate: number;
    refillCost: number;
    pharmacyId?: string;
    countdownDays: number;
    walletId: string;
}

interface UserContextType {
    user: User | null;
    wallet: Wallet | null;
    medications: Medication[];
    linkedUsers: User[];
    loading: boolean;
    error: string | null;
    refreshUser: () => Promise<void>;
    refreshWallet: () => Promise<void>;
    refreshMedications: () => Promise<void>;
    refreshLinkedUsers: () => Promise<void>;
    updateBalance: (newBalance: number) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
    children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
    const { data: session, status } = useSession();
    const [user, setUser] = useState<User | null>(null);
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [linkedUsers, setLinkedUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch user data
    const refreshUser = useCallback(async () => {
        if (!session?.user?.email) return;

        try {
            const res = await fetch('/api/user/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            }
        } catch (err) {
            console.error('Failed to fetch user:', err);
            setError('Failed to load user data');
        }
    }, [session?.user?.email]);

    // Fetch wallet data
    const refreshWallet = useCallback(async () => {
        if (!user?.walletId) return;

        try {
            const res = await fetch(`/api/wallet/${user.walletId}`);
            if (res.ok) {
                const data = await res.json();
                setWallet(data.wallet);
            }
        } catch (err) {
            console.error('Failed to fetch wallet:', err);
            setError('Failed to load wallet data');
        }
    }, [user?.walletId]);

    // Fetch medications
    const refreshMedications = useCallback(async () => {
        if (!user?.walletId) return;

        try {
            const res = await fetch(`/api/medication?walletId=${user.walletId}`);
            if (res.ok) {
                const data = await res.json();
                setMedications(data.medications || []);
            }
        } catch (err) {
            console.error('Failed to fetch medications:', err);
            setError('Failed to load medications');
        }
    }, [user?.walletId]);

    // Fetch linked users
    const refreshLinkedUsers = useCallback(async () => {
        if (!user?.id) return;

        try {
            const res = await fetch('/api/link');
            if (res.ok) {
                const data = await res.json();
                setLinkedUsers(data.linkedUsers || []);
            }
        } catch (err) {
            console.error('Failed to fetch linked users:', err);
        }
    }, [user?.id]);

    // Update balance (for real-time updates)
    const updateBalance = useCallback((newBalance: number) => {
        setWallet(prev => prev ? { ...prev, balance: newBalance } : null);
    }, []);

    // Initial data load
    useEffect(() => {
        if (status === 'loading') return;

        if (status === 'authenticated' && session?.user) {
            setLoading(true);
            refreshUser().finally(() => setLoading(false));
        } else {
            setUser(null);
            setWallet(null);
            setMedications([]);
            setLinkedUsers([]);
            setLoading(false);
        }
    }, [status, session, refreshUser]);

    // Load wallet and medications when user is loaded
    useEffect(() => {
        if (user?.walletId) {
            refreshWallet();
            refreshMedications();
        }
        if (user?.id) {
            refreshLinkedUsers();
        }
    }, [user, refreshWallet, refreshMedications, refreshLinkedUsers]);

    const value: UserContextType = {
        user,
        wallet,
        medications,
        linkedUsers,
        loading,
        error,
        refreshUser,
        refreshWallet,
        refreshMedications,
        refreshLinkedUsers,
        updateBalance,
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}

export default UserContext;
