'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                {/* Icon */}
                <div className="w-20 h-20 bg-[#DC3545]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-[#DC3545]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-[#343A40] mb-2">
                    Something Went Wrong
                </h1>
                <p className="text-[#6C757D] mb-6">
                    We&apos;re sorry, but something unexpected happened.
                    Please try again or contact support if the problem persists.
                </p>

                <Button variant="primary" size="lg" onClick={reset}>
                    Try Again
                </Button>
            </div>
        </main>
    );
}
