'use client';

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (): Socket => {
    if (!socket) {
        socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
            transports: ['websocket', 'polling'],
            autoConnect: true,
        });

        socket.on('connect', () => {
            console.log('Socket connected:', socket?.id);
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });
    }

    return socket;
};

export const getSocket = (): Socket | null => {
    return socket;
};

export const disconnectSocket = (): void => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

// Event types
export interface BalanceUpdateEvent {
    walletId: string;
    newBalance: number;
    type: 'deposit' | 'deduction';
    amount: number;
}

export interface NotificationEvent {
    id: string;
    type: string;
    title: string;
    message: string;
    timestamp: string;
}

export interface RefillAlertEvent {
    medicationId: string;
    medicationName: string;
    daysRemaining: number;
}

// Event listeners
export const onBalanceUpdate = (callback: (data: BalanceUpdateEvent) => void): void => {
    const s = getSocket();
    if (s) {
        s.on('balance:update', callback);
    }
};

export const onNotification = (callback: (data: NotificationEvent) => void): void => {
    const s = getSocket();
    if (s) {
        s.on('notification:new', callback);
    }
};

export const onRefillAlert = (callback: (data: RefillAlertEvent) => void): void => {
    const s = getSocket();
    if (s) {
        s.on('refill:alert', callback);
    }
};

// Emitters
export const joinWalletRoom = (walletId: string): void => {
    const s = getSocket();
    if (s) {
        s.emit('wallet:join', { walletId });
    }
};

export const leaveWalletRoom = (walletId: string): void => {
    const s = getSocket();
    if (s) {
        s.emit('wallet:leave', { walletId });
    }
};

export default {
    initSocket,
    getSocket,
    disconnectSocket,
    onBalanceUpdate,
    onNotification,
    onRefillAlert,
    joinWalletRoom,
    leaveWalletRoom,
};
