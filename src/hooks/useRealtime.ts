'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface BalanceUpdateEvent {
    walletId: string;
    newBalance: number;
    type: 'deposit' | 'deduction';
    amount: number;
    timestamp: string;
}

interface NotificationEvent {
    id: string;
    type: string;
    title: string;
    message: string;
    timestamp: string;
}

interface RefillAlertEvent {
    medicationId: string;
    medicationName: string;
    daysRemaining: number;
    timestamp: string;
}

type EventCallback<T> = (data: T) => void;

interface UseRealtimeOptions {
    userId: string;
    onBalanceUpdate?: EventCallback<BalanceUpdateEvent>;
    onNotification?: EventCallback<NotificationEvent>;
    onRefillAlert?: EventCallback<RefillAlertEvent>;
    onConnect?: () => void;
    onDisconnect?: () => void;
}

export function useRealtime({
    userId,
    onBalanceUpdate,
    onNotification,
    onRefillAlert,
    onConnect,
    onDisconnect,
}: UseRealtimeOptions) {
    const eventSourceRef = useRef<EventSource | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const connect = useCallback(() => {
        if (!userId) return;

        // Close existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        try {
            const eventSource = new EventSource(`/api/socket?userId=${encodeURIComponent(userId)}`);
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                setIsConnected(true);
                setConnectionError(null);
                onConnect?.();
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const eventType = data.eventType || data.type;

                    switch (eventType) {
                        case 'connected':
                            console.log('Realtime connected:', data.userId);
                            break;

                        case 'balance:update':
                            onBalanceUpdate?.({
                                walletId: data.walletId,
                                newBalance: data.newBalance,
                                type: data.type,
                                amount: data.amount,
                                timestamp: data.timestamp,
                            });
                            break;

                        case 'notification':
                            onNotification?.({
                                id: data.id,
                                type: data.type,
                                title: data.title,
                                message: data.message,
                                timestamp: data.timestamp,
                            });
                            break;

                        case 'refill:alert':
                            onRefillAlert?.({
                                medicationId: data.medicationId,
                                medicationName: data.medicationName,
                                daysRemaining: data.daysRemaining,
                                timestamp: data.timestamp,
                            });
                            break;

                        default:
                            console.log('Unknown event type:', eventType);
                    }
                } catch (error) {
                    console.error('Failed to parse SSE message:', error);
                }
            };

            eventSource.onerror = () => {
                setIsConnected(false);
                setConnectionError('Connection lost. Reconnecting...');
                onDisconnect?.();

                // Auto-reconnect after 3 seconds
                setTimeout(() => {
                    if (eventSourceRef.current === eventSource) {
                        connect();
                    }
                }, 3000);
            };
        } catch (error) {
            console.error('Failed to create EventSource:', error);
            setConnectionError('Failed to connect to realtime updates');
        }
    }, [userId, onBalanceUpdate, onNotification, onRefillAlert, onConnect, onDisconnect]);

    const disconnect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
            setIsConnected(false);
            onDisconnect?.();
        }
    }, [onDisconnect]);

    useEffect(() => {
        if (userId) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [userId, connect, disconnect]);

    return {
        isConnected,
        connectionError,
        reconnect: connect,
        disconnect,
    };
}

// Helper function to send events from server-side or client-side
export async function sendRealtimeEvent(
    type: 'balance:update' | 'notification' | 'refill:alert' | 'broadcast',
    targetUserId: string,
    data: Record<string, unknown>
): Promise<{ success: boolean; sent?: boolean; error?: string }> {
    try {
        const response = await fetch('/api/socket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, targetUserId, data }),
        });

        return await response.json();
    } catch (error) {
        console.error('Failed to send realtime event:', error);
        return { success: false, error: 'Network error' };
    }
}

export default useRealtime;
