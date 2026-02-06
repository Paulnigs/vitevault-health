'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';

export default function NotFound() {
    return (
        <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center max-w-md"
            >
                {/* Illustration */}
                <div className="mb-8">
                    <div className="w-32 h-32 bg-[#007BFF]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-16 h-16 text-[#007BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-7xl font-bold text-[#007BFF] mb-2">404</h1>
                </div>

                {/* Message */}
                <h2 className="text-2xl font-bold text-[#343A40] mb-2">
                    Lost in Care?
                </h2>
                <p className="text-[#6C757D] mb-8">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                    Let&apos;s get you back on track.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/">
                        <Button variant="primary" size="lg">
                            Back to Home
                        </Button>
                    </Link>
                    <Link href="/dashboard/child">
                        <Button variant="outline" size="lg">
                            Go to Dashboard
                        </Button>
                    </Link>
                </div>
            </motion.div>
        </main>
    );
}
