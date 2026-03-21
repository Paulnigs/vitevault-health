/**
 * IndexedDB Database Layer for VitaVault Health
 * Replaces MongoDB — works fully offline in the browser.
 *
 * Stores: users, wallets, medications, notifications
 *
 * NOTE: Since Next.js API routes run on the server (Node.js),
 * we use a simple in-memory store that persists to a JSON file
 * on disk so it works with API routes AND is 100% offline.
 */

import fs from 'fs';
import path from 'path';

// ── Types ──

export interface DBUser {
    _id: string;
    email: string;
    passwordHash: string;
    name: string;
    role: 'child' | 'parent' | 'pharmacy';
    links: string[]; // IDs of connected users
    linkCode: string;
    avatar?: string;
    phone?: string;
    address?: string;
    operatingHours?: string;
    services?: string[];
    rating?: number;
    walletId?: string;
    notifications: {
        refillReminders: boolean;
        depositAlerts: boolean;
        connectionRequests: boolean;
        emailNotifications: boolean;
    };
    resetToken?: string;
    resetTokenExpiry?: string;
    createdAt: string;
    updatedAt: string;
}

export type TransactionType = 'deposit' | 'deduction';
export type ScheduleType = 'one-time' | 'daily' | 'weekly' | 'monthly';

export interface DBTransaction {
    _id: string;
    amount: number;
    type: TransactionType;
    description: string;
    date: string;
    schedule: ScheduleType;
    medicationId?: string;
    fromUserId?: string;
}

export interface DBLockedFund {
    _id: string;
    amount: number;
    lockedAt: string;
    unlocksAt: string;
    isActive: boolean;
    description?: string;
    chargedAt?: string;
}

export interface DBWallet {
    _id: string;
    owner: string; // User ID
    balance: number;
    currency: string;
    transactions: DBTransaction[];
    lockedFunds: DBLockedFund[];
    scheduledDeposits: {
        _id: string;
        amount: number;
        schedule: ScheduleType;
        nextDate: string;
        fromUserId: string;
        isActive: boolean;
    }[];
    createdAt: string;
    updatedAt: string;
}

export type RefillStatus = 'none' | 'pending_approval' | 'approved';

export interface DBMedication {
    _id: string;
    name: string;
    description?: string;
    remainingQty: number;
    totalQty: number;
    usageRate: number;
    refillCost: number;
    walletId: string;
    pharmacyId?: string;
    lastRefillDate: string;
    isActive: boolean;
    // Refill workflow
    refillStatus: RefillStatus;
    refillRequestedAt?: string;
    refillRequestedBy?: string; // parent user ID
    // Countdown
    countdownEndDate?: string;
    countdownActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export type NotificationType = 'deposit' | 'deduction' | 'refill' | 'connection' | 'system';

export interface DBNotification {
    _id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    read: boolean;
    data?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

interface Database {
    users: DBUser[];
    wallets: DBWallet[];
    medications: DBMedication[];
    notifications: DBNotification[];
}

// ── File-based persistence ──

const DB_FILE = path.join(process.cwd(), 'vitavault-data.json');

function loadDB(): Database {
    try {
        if (fs.existsSync(DB_FILE)) {
            const raw = fs.readFileSync(DB_FILE, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error('Failed to load DB file:', e);
    }
    return { users: [], wallets: [], medications: [], notifications: [] };
}

function saveDB(db: Database): void {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    } catch (e) {
        console.error('Failed to save DB file:', e);
    }
}

// ── ID Generator ──
export function generateId(): string {
    return (
        Date.now().toString(36) +
        Math.random().toString(36).substring(2, 10)
    );
}

export function generateLinkCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ── Users ──

export const Users = {
    findById(id: string): DBUser | undefined {
        const db = loadDB();
        return db.users.find((u) => u._id === id);
    },

    findByEmail(email: string): DBUser | undefined {
        const db = loadDB();
        return db.users.find((u) => u.email === email.toLowerCase());
    },

    findByLinkCode(code: string): DBUser | undefined {
        const db = loadDB();
        return db.users.find((u) => u.linkCode === code.toUpperCase());
    },

    findByIds(ids: string[]): DBUser[] {
        const db = loadDB();
        return db.users.filter((u) => ids.includes(u._id));
    },

    findByIdsAndRole(ids: string[], role: string): DBUser[] {
        const db = loadDB();
        return db.users.filter((u) => ids.includes(u._id) && u.role === role);
    },

    create(data: Omit<DBUser, '_id' | 'createdAt' | 'updatedAt' | 'links' | 'notifications' | 'linkCode'> & { linkCode?: string }): DBUser {
        const db = loadDB();
        const now = new Date().toISOString();
        const user: DBUser = {
            _id: generateId(),
            ...data,
            links: [],
            linkCode: data.linkCode || generateLinkCode(),
            notifications: {
                refillReminders: true,
                depositAlerts: true,
                connectionRequests: true,
                emailNotifications: false,
            },
            createdAt: now,
            updatedAt: now,
        };
        db.users.push(user);
        saveDB(db);
        return user;
    },

    update(id: string, updates: Partial<DBUser>): DBUser | undefined {
        const db = loadDB();
        const index = db.users.findIndex((u) => u._id === id);
        if (index === -1) return undefined;
        db.users[index] = {
            ...db.users[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        saveDB(db);
        return db.users[index];
    },
};

// ── Wallets ──

export const Wallets = {
    findById(id: string): DBWallet | undefined {
        const db = loadDB();
        return db.wallets.find((w) => w._id === id);
    },

    findByOwner(ownerId: string): DBWallet | undefined {
        const db = loadDB();
        return db.wallets.find((w) => w.owner === ownerId);
    },

    create(data: { owner: string; balance?: number; currency?: string }): DBWallet {
        const db = loadDB();
        const now = new Date().toISOString();
        const wallet: DBWallet = {
            _id: generateId(),
            owner: data.owner,
            balance: data.balance || 0,
            currency: data.currency || 'NGN',
            transactions: [],
            lockedFunds: [],
            scheduledDeposits: [],
            createdAt: now,
            updatedAt: now,
        };
        db.wallets.push(wallet);
        saveDB(db);
        return wallet;
    },

    update(id: string, updates: Partial<DBWallet>): DBWallet | undefined {
        const db = loadDB();
        const index = db.wallets.findIndex((w) => w._id === id);
        if (index === -1) return undefined;
        db.wallets[index] = {
            ...db.wallets[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        saveDB(db);
        return db.wallets[index];
    },

    save(wallet: DBWallet): DBWallet {
        const db = loadDB();
        const index = db.wallets.findIndex((w) => w._id === wallet._id);
        wallet.updatedAt = new Date().toISOString();
        if (index === -1) {
            db.wallets.push(wallet);
        } else {
            db.wallets[index] = wallet;
        }
        saveDB(db);
        return wallet;
    },

    /** Available balance = balance - sum of active locked funds */
    getAvailableBalance(wallet: DBWallet): number {
        const totalLocked = wallet.lockedFunds
            .filter((f) => f.isActive)
            .reduce((sum, f) => sum + f.amount, 0);
        return Math.max(0, wallet.balance - totalLocked);
    },

    /** Total locked */
    getTotalLocked(wallet: DBWallet): number {
        return wallet.lockedFunds
            .filter((f) => f.isActive)
            .reduce((sum, f) => sum + f.amount, 0);
    },
};

// ── Medications ──

export const Medications = {
    findById(id: string): DBMedication | undefined {
        const db = loadDB();
        return db.medications.find((m) => m._id === id);
    },

    findByWalletId(walletId: string, activeOnly = true): DBMedication[] {
        const db = loadDB();
        return db.medications.filter(
            (m) => m.walletId === walletId && (!activeOnly || m.isActive)
        );
    },

    findByWalletIdAndStatus(walletId: string, refillStatus: RefillStatus): DBMedication[] {
        const db = loadDB();
        return db.medications.filter(
            (m) => m.walletId === walletId && m.isActive && m.refillStatus === refillStatus
        );
    },

    findPendingByPharmacyLinks(patientIds: string[]): DBMedication[] {
        const db = loadDB();
        // Get all wallets for these patients
        const walletIds = db.wallets
            .filter((w) => patientIds.includes(w.owner))
            .map((w) => w._id);

        return db.medications.filter(
            (m) =>
                walletIds.includes(m.walletId) &&
                m.isActive &&
                m.refillStatus === 'pending_approval'
        );
    },

    create(data: Omit<DBMedication, '_id' | 'createdAt' | 'updatedAt'>): DBMedication {
        const db = loadDB();
        const now = new Date().toISOString();
        const med: DBMedication = {
            _id: generateId(),
            ...data,
            createdAt: now,
            updatedAt: now,
        };
        db.medications.push(med);
        saveDB(db);
        return med;
    },

    update(id: string, updates: Partial<DBMedication>): DBMedication | undefined {
        const db = loadDB();
        const index = db.medications.findIndex((m) => m._id === id);
        if (index === -1) return undefined;
        db.medications[index] = {
            ...db.medications[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        saveDB(db);
        return db.medications[index];
    },

    save(med: DBMedication): DBMedication {
        const db = loadDB();
        const index = db.medications.findIndex((m) => m._id === med._id);
        med.updatedAt = new Date().toISOString();
        if (index === -1) {
            db.medications.push(med);
        } else {
            db.medications[index] = med;
        }
        saveDB(db);
        return med;
    },

    /** Calculate days remaining from countdownEndDate or qty */
    getDaysRemaining(med: DBMedication): number {
        if (med.countdownEndDate) {
            const msLeft = new Date(med.countdownEndDate).getTime() - Date.now();
            if (msLeft <= 0) return 0;
            return Math.floor(msLeft / (1000 * 60 * 60 * 24));
        }
        return med.usageRate > 0 ? Math.floor(med.remainingQty / med.usageRate) : 999;
    },
};

// ── Notifications ──

export const Notifications = {
    findByUserId(userId: string, limit = 50, unreadOnly = false): DBNotification[] {
        const db = loadDB();
        let results = db.notifications.filter((n) => n.userId === userId);
        if (unreadOnly) {
            results = results.filter((n) => !n.read);
        }
        return results
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, limit);
    },

    create(data: Omit<DBNotification, '_id' | 'createdAt' | 'updatedAt'>): DBNotification {
        const db = loadDB();
        const now = new Date().toISOString();
        const notification: DBNotification = {
            _id: generateId(),
            ...data,
            createdAt: now,
            updatedAt: now,
        };
        db.notifications.push(notification);
        saveDB(db);
        return notification;
    },

    markRead(ids: string[], userId: string): void {
        const db = loadDB();
        for (const n of db.notifications) {
            if (n.userId === userId && ids.includes(n._id)) {
                n.read = true;
                n.updatedAt = new Date().toISOString();
            }
        }
        saveDB(db);
    },

    markAllRead(userId: string): void {
        const db = loadDB();
        for (const n of db.notifications) {
            if (n.userId === userId && !n.read) {
                n.read = true;
                n.updatedAt = new Date().toISOString();
            }
        }
        saveDB(db);
    },
};
