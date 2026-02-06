'use client';

export default function DemoBanner() {
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

    if (!isDemoMode) return null;

    return (
        <div
            className="demo-banner"
            role="banner"
            aria-label="Demo mode notification"
        >
            <span className="inline-flex items-center gap-2">
                <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
                Demo Mode – Simulated Transactions
            </span>
        </div>
    );
}
