'use client';

import { useMemo } from 'react';

interface CountdownTimerProps {
    daysRemaining: number;
    totalDays: number;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    label?: string;
}

export default function CountdownTimer({
    daysRemaining,
    totalDays,
    size = 'md',
    showLabel = true,
    label = 'days left',
}: CountdownTimerProps) {
    const sizes = {
        sm: { width: 80, strokeWidth: 6, fontSize: 'text-lg', labelSize: 'text-xs' },
        md: { width: 120, strokeWidth: 8, fontSize: 'text-2xl', labelSize: 'text-sm' },
        lg: { width: 160, strokeWidth: 10, fontSize: 'text-4xl', labelSize: 'text-base' },
    };

    const config = sizes[size];
    const radius = (config.width - config.strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Calculate progress (prevent negative values)
    const progress = Math.max(0, Math.min(1, daysRemaining / totalDays));
    const strokeDashoffset = circumference * (1 - progress);

    // Determine color based on days remaining
    const color = useMemo(() => {
        if (daysRemaining <= 0) return '#DC3545'; // Red - danger
        if (daysRemaining <= 3) return '#FFC107'; // Amber - warning
        return '#28A745'; // Green - safe
    }, [daysRemaining]);

    const statusText = useMemo(() => {
        if (daysRemaining <= 0) return 'Refill needed!';
        if (daysRemaining <= 3) return 'Running low';
        return 'On track';
    }, [daysRemaining]);

    return (
        <div
            className="flex flex-col items-center"
            role="timer"
            aria-label={`${daysRemaining} ${label}`}
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
                        {Math.max(0, daysRemaining)}
                    </span>
                    {showLabel && (
                        <span className={`text-[#6C757D] ${config.labelSize}`}>
                            {label}
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
