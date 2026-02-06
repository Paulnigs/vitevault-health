'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

interface UseCountdownOptions {
    daysRemaining: number;
    totalDays: number;
    simulateRealTime?: boolean;
    onZero?: () => void;
}

interface UseCountdownReturn {
    daysLeft: number;
    percentage: number;
    status: 'safe' | 'warning' | 'danger';
    color: string;
    fastForward: (days: number) => void;
    reset: () => void;
}

export function useCountdown({
    daysRemaining,
    totalDays,
    simulateRealTime = false,
    onZero,
}: UseCountdownOptions): UseCountdownReturn {
    const [daysLeft, setDaysLeft] = useState(daysRemaining);

    // Real-time simulation (for demo)
    useEffect(() => {
        if (!simulateRealTime) return;

        const interval = setInterval(() => {
            setDaysLeft((prev) => {
                if (prev <= 0) {
                    clearInterval(interval);
                    onZero?.();
                    return 0;
                }
                return prev - 0.01; // Slowly decrement for visual effect
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [simulateRealTime, onZero]);

    // Update when prop changes
    useEffect(() => {
        setDaysLeft(daysRemaining);
    }, [daysRemaining]);

    const percentage = useMemo(() => {
        return Math.max(0, Math.min(100, (daysLeft / totalDays) * 100));
    }, [daysLeft, totalDays]);

    const status = useMemo<'safe' | 'warning' | 'danger'>(() => {
        if (daysLeft <= 0) return 'danger';
        if (daysLeft <= 3) return 'warning';
        return 'safe';
    }, [daysLeft]);

    const color = useMemo(() => {
        switch (status) {
            case 'danger':
                return '#DC3545';
            case 'warning':
                return '#FFC107';
            default:
                return '#28A745';
        }
    }, [status]);

    const fastForward = useCallback((days: number) => {
        setDaysLeft((prev) => {
            const newValue = Math.max(0, prev - days);
            if (newValue <= 0) {
                onZero?.();
            }
            return newValue;
        });
    }, [onZero]);

    const reset = useCallback(() => {
        setDaysLeft(totalDays);
    }, [totalDays]);

    return {
        daysLeft: Math.floor(daysLeft),
        percentage,
        status,
        color,
        fastForward,
        reset,
    };
}
