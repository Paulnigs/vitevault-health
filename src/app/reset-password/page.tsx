'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, Button, Input } from '@/components/ui';
import toast from 'react-hot-toast';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!token) {
            toast.error('Invalid or missing token');
            router.push('/login');
        }
    }, [token, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            return toast.error('Passwords do not match');
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            if (res.ok) {
                toast.success('Password reset successfully');
                router.push('/login');
            } else {
                const data = await res.json();
                toast.error(data.error || 'Reset failed');
            }
        } catch (error) {
            toast.error('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
                <p className="text-sm text-[#6C757D]">
                    Please enter your new password below.
                </p>
                <Input
                    label="New Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <Input
                    label="Confirm New Password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
                <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    isLoading={isLoading}
                >
                    Reset Password
                </Button>
            </form>
        </Card>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#343A40]">VitaVault</h1>
                    <p className="text-[#6C757D]">Set your new password</p>
                </div>

                <Suspense fallback={<Card className="p-8 h-64 flex items-center justify-center">Loading...</Card>}>
                    <ResetPasswordForm />
                </Suspense>
            </motion.div>
        </div>
    );
}
