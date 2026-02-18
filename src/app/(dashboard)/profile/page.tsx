'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Card, Button, Input, Skeleton } from '@/components/ui';
import { showSuccess, showError } from '@/components/ui/Toast';

interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: 'child' | 'parent' | 'pharmacy';
    createdAt?: string;
}

interface NotificationPrefs {
    refillReminders: boolean;
    depositAlerts: boolean;
    connectionRequests: boolean;
    emailNotifications: boolean;
}

export default function ProfilePage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
    });

    const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({
        refillReminders: true,
        depositAlerts: true,
        connectionRequests: true,
        emailNotifications: false,
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/user/me');
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data.user);
                    setFormData({ name: data.user.name || '' });
                    if (data.user.notifications) {
                        setNotificationPrefs(data.user.notifications);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch('/api/user/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    notificationPrefs,
                }),
            });

            if (res.ok) {
                showSuccess('Profile updated successfully!');
                const data = await res.json();
                setProfile(data.user);
            } else {
                const data = await res.json();
                showError(data.error || 'Failed to update profile');
            }
        } catch {
            showError('Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const getRoleInfo = (role: string) => {
        switch (role) {
            case 'parent':
                return {
                    label: 'Parent Account',
                    description: 'Manage family healthcare funds and medication tracking',
                    icon: '👨‍👩‍👧',
                    color: 'bg-blue-100 text-blue-700',
                };
            case 'child':
                return {
                    label: 'Child Account',
                    description: 'Deposit funds to parent wallets for healthcare',
                    icon: '👶',
                    color: 'bg-green-100 text-green-700',
                };
            case 'pharmacy':
                return {
                    label: 'Pharmacy Account',
                    description: 'Receive payments for medication refills',
                    icon: '💊',
                    color: 'bg-purple-100 text-purple-700',
                };
            default:
                return {
                    label: 'User',
                    description: 'VitaVault member',
                    icon: '👤',
                    color: 'bg-gray-100 text-gray-700',
                };
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-light p-6">
                <div className="max-w-2xl mx-auto space-y-6">
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-64 rounded-xl" />
                    <Skeleton className="h-48 rounded-xl" />
                </div>
            </div>
        );
    }

    const roleInfo = profile ? getRoleInfo(profile.role) : null;

    return (
        <div className="min-h-screen bg-neutral-light p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-2 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <h1 className="text-3xl font-bold text-neutral-dark">Profile Settings</h1>
                    <p className="text-gray-500">Manage your account and preferences</p>
                </motion.div>

                {/* Profile Overview */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="p-6 mb-6">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                {profile?.name?.charAt(0) || profile?.email?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-semibold text-neutral-dark">
                                    {profile?.name || 'User'}
                                </h2>
                                <p className="text-gray-500">{profile?.email}</p>
                                {roleInfo && (
                                    <div className="mt-2">
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${roleInfo.color}`}>
                                            {roleInfo.icon} {roleInfo.label}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {roleInfo && (
                            <p className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                {roleInfo.description}
                            </p>
                        )}

                        {profile?.createdAt && (
                            <p className="mt-4 text-xs text-gray-400">
                                Member since {new Date(profile.createdAt).toLocaleDateString('en-NG', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </p>
                        )}
                    </Card>
                </motion.div>

                {/* Edit Profile Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="p-6 mb-6">
                        <h3 className="text-lg font-semibold text-neutral-dark mb-4">Edit Profile</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                label="Display Name"
                                placeholder="Enter your name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />

                            <div className="p-3 bg-gray-50 rounded-lg">
                                <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                                <p className="text-neutral-dark">{profile?.email}</p>
                                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                            </div>

                            <Button type="submit" variant="primary" className="w-full" disabled={saving}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </form>
                    </Card>
                </motion.div>

                {/* Notification Preferences */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-neutral-dark mb-4">Notification Preferences</h3>
                        <div className="space-y-4">
                            {[
                                {
                                    key: 'refillReminders',
                                    label: 'Refill Reminders',
                                    description: 'Get notified when medications need refilling',
                                },
                                {
                                    key: 'depositAlerts',
                                    label: 'Deposit Alerts',
                                    description: 'Receive alerts for deposits and deductions',
                                },
                                {
                                    key: 'connectionRequests',
                                    label: 'Connection Requests',
                                    description: 'Be notified of new connection requests',
                                },
                                {
                                    key: 'emailNotifications',
                                    label: 'Email Notifications',
                                    description: 'Receive notifications via email',
                                },
                            ].map((pref) => (
                                <label
                                    key={pref.key}
                                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <div>
                                        <p className="font-medium text-neutral-dark">{pref.label}</p>
                                        <p className="text-sm text-gray-500">{pref.description}</p>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={notificationPrefs[pref.key as keyof NotificationPrefs]}
                                            onChange={(e) =>
                                                setNotificationPrefs({
                                                    ...notificationPrefs,
                                                    [pref.key]: e.target.checked,
                                                })
                                            }
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary transition-colors">
                                            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform peer-checked:translate-x-5 transition-transform" />
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
