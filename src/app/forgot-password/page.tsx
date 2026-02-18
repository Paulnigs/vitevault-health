'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, Button, Input } from '@/components/ui';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            if (res.ok) {
                setIsSent(true);
                toast.success('Reset link sent to your email');
            } else {
                const data = await res.json();
                toast.error(data.error || 'Something went wrong');
            }
        } catch (error) {
            toast.error('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#343A40]">VitaVault</h1>
                    <p className="text-[#6C757D]">Forgot your password?</p>
                </div>

                <Card className="p-8">
                    {!isSent ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <p className="text-sm text-[#6C757D]">
                                Enter your email address and we'll send you a link to reset your password.
                            </p>
                            <Input
                                label="Email Address"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <Button
                                type="submit"
                                variant="primary"
                                className="w-full"
                                isLoading={isLoading}
                            >
                                Send Reset Link
                            </Button>
                        </form>
                    ) : (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                                Check
                            </div>
                            <h2 className="text-xl font-bold">Check your email</h2>
                            <p className="text-[#6C757D]">
                                We've sent a password reset link to <strong>{email}</strong>.
                            </p>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setIsSent(false)}
                            >
                                Use a different email
                            </Button>
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <Link href="/login" className="text-sm text-[#007BFF] hover:underline">
                            Back to Login
                        </Link>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}
