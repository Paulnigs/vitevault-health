'use client';

import { useState, useEffect, useMemo } from 'react';

interface CountdownTimerProps {
    daysRemaining: number;
    totalDays: number;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    label?: string;
    countdownEndDate?: string | null; // ISO date string for real-time countdown
}

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
}

function getTimeLeft(endDate: string): TimeLeft {
    const msLeft = new Date(endDate).getTime() - Date.now();
    if (msLeft <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
    }
    return {
        days: Math.floor(msLeft / (1000 * 60 * 60 * 24)),
        hours: Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((msLeft % (1000 * 60)) / 1000),
        totalMs: msLeft,
    };
}

export default function CountdownTimer({
    daysRemaining,
    totalDays,
    size = 'md',
    showLabel = true,
    label = 'days left',
    countdownEndDate,
}: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
    const isRealtime = !!countdownEndDate;

    useEffect(() => {
        if (!countdownEndDate) return;

        // Initial set
        setTimeLeft(getTimeLeft(countdownEndDate));

        const interval = setInterval(() => {
            const tl = getTimeLeft(countdownEndDate);
            setTimeLeft(tl);
            if (tl.totalMs <= 0) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [countdownEndDate]);

    const effectiveDays = isRealtime && timeLeft ? timeLeft.days : daysRemaining;

    const sizes = {
        sm: { width: 80, strokeWidth: 6, fontSize: 'text-lg', labelSize: 'text-xs', subSize: 'text-[9px]' },
        md: { width: 120, strokeWidth: 8, fontSize: 'text-2xl', labelSize: 'text-sm', subSize: 'text-[10px]' },
        lg: { width: 160, strokeWidth: 10, fontSize: 'text-4xl', labelSize: 'text-base', subSize: 'text-xs' },
    };

    const config = sizes[size];
    const radius = (config.width - config.strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Calculate progress
    const progress = Math.max(0, Math.min(1, effectiveDays / totalDays));
    const strokeDashoffset = circumference * (1 - progress);

    // Determine color
    const color = useMemo(() => {
        if (effectiveDays <= 0) return '#DC3545';
        if (effectiveDays <= 3) return '#FFC107';
        return '#28A745';
    }, [effectiveDays]);

    const statusText = useMemo(() => {
        if (effectiveDays <= 0) return 'Refill needed!';
        if (effectiveDays <= 3) return 'Running low';
        return 'On track';
    }, [effectiveDays]);

    // Format the time display
    const timeDisplay = useMemo(() => {
        if (isRealtime && timeLeft) {
            if (timeLeft.totalMs <= 0) return '0';
            return `${timeLeft.days}`;
        }
        return `${Math.max(0, effectiveDays)}`;
    }, [isRealtime, timeLeft, effectiveDays]);

    const subTimeDisplay = useMemo(() => {
        if (isRealtime && timeLeft && timeLeft.totalMs > 0) {
            const h = String(timeLeft.hours).padStart(2, '0');
            const m = String(timeLeft.minutes).padStart(2, '0');
            const s = String(timeLeft.seconds).padStart(2, '0');
            return `${h}:${m}:${s}`;
        }
        return null;
    }, [isRealtime, timeLeft]);

    return (
        <div
            className="flex flex-col items-center"
            role="timer"
            aria-label={`${effectiveDays} ${label}`}
            aria-live="polite"
        >
            <div className="relative" style={{ width: config.width, height: config.width }}>
                {/* Background circle */}
                <svg
                    className="transform -rotate-90"
                    width={config.width}
                    height={config.width}
                    aria-hidden="true"
                >
                    {/* Track */}
                    <circle
                        cx={config.width / 2}
                        cy={config.width / 2}
                        r={radius}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth={config.strokeWidth}
                    />
                    {/* Progress */}
                    <circle
                        cx={config.width / 2}
                        cy={config.width / 2}
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={config.strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-500 ease-in-out"
                    />
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                        className={`font-bold ${config.fontSize}`}
                        style={{ color }}
                    >
                        {timeDisplay}
                    </span>
                    {showLabel && (
                        <span className={`text-[#6C757D] ${config.labelSize}`}>
                            {label}
                        </span>
                    )}
                    {subTimeDisplay && (
                        <span
                            className={`font-mono font-medium ${config.subSize}`}
                            style={{ color }}
                        >
                            {subTimeDisplay}
                        </span>
                    )}
                </div>
            </div>

            {/* Status text */}
            <span
                className={`mt-2 font-medium ${config.labelSize}`}
                style={{ color }}
            >
                {statusText}
            </span>
        </div>
    );
}

