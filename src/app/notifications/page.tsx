'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Skeleton } from '@/components/ui';

interface Notification {
    id: string;
    type: 'deposit' | 'deduction' | 'refill' | 'connection' | 'system';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    icon?: string;
}

// Mock notifications for demo
const mockNotifications: Notification[] = [
    {
        id: '1',
        type: 'deposit',
        title: 'Deposit Received',
        message: 'You received ₦10,000 from John Doe',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        read: false,
        icon: '💰',
    },
    {
        id: '2',
        type: 'refill',
        title: 'Medication Refill Due',
        message: 'Insulin refill countdown reached 0 days. ₦15,000 will be deducted.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        read: false,
        icon: '💊',
    },
    {
        id: '3',
        type: 'deduction',
        title: 'Auto-Deduction Complete',
        message: '₦15,000 was deducted for Insulin refill',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        read: true,
        icon: '✅',
    },
    {
        id: '4',
        type: 'connection',
        title: 'New Connection',
        message: 'Jane Doe accepted your connection request',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        read: true,
        icon: '🤝',
    },
    {
        id: '5',
        type: 'system',
        title: 'Welcome to VitaVault!',
        message: 'Your account has been created successfully. Start by adding connections.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        read: true,
        icon: '🎉',
    },
];

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    useEffect(() => {
        // Simulate API fetch
        setTimeout(() => {
            setNotifications(mockNotifications);
            setLoading(false);
        }, 500);
    }, []);

    const markAsRead = (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'deposit':
                return 'bg-green-100 border-green-500';
            case 'deduction':
                return 'bg-red-100 border-red-500';
            case 'refill':
                return 'bg-amber-100 border-amber-500';
            case 'connection':
                return 'bg-blue-100 border-blue-500';
            default:
                return 'bg-gray-100 border-gray-500';
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
    };

    const filteredNotifications = notifications.filter((n) =>
        filter === 'all' ? true : !n.read
    );

    const unreadCount = notifications.filter((n) => !n.read).length;

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-light p-6">
                <div className="max-w-2xl mx-auto space-y-4">
                    <Skeleton className="h-20 rounded-xl" />
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-light p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-6"
                >
                    <div>
                        <h1 className="text-3xl font-bold text-neutral-dark">Notifications</h1>
                        <p className="text-gray-500">
                            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <Button variant="outline" onClick={markAllAsRead}>
                            Mark all as read
                        </Button>
                    )}
                </motion.div>

                {/* Filter Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex gap-2 mb-6"
                >
                    {(['all', 'unread'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === f
                                    ? 'bg-primary text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {f === 'all' ? 'All' : `Unread (${unreadCount})`}
                        </button>
                    ))}
                </motion.div>

                {/* Notifications List */}
                {filteredNotifications.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <Card className="p-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-neutral-dark mb-2">
                                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                            </h3>
                            <p className="text-gray-500">
                                {filter === 'unread'
                                    ? 'You\'re all caught up!'
                                    : 'Notifications about your account will appear here'}
                            </p>
                        </Card>
                    </motion.div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence>
                            {filteredNotifications.map((notification, index) => (
                                <motion.div
                                    key={notification.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => markAsRead(notification.id)}
                                    className={`cursor-pointer ${!notification.read ? 'transform hover:scale-[1.01]' : ''}`}
                                >
                                    <Card
                                        className={`p-4 border-l-4 transition-all ${getTypeColor(notification.type)} ${!notification.read ? 'shadow-md' : 'opacity-75'
                                            }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="text-2xl">{notification.icon}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className={`font-semibold ${!notification.read ? 'text-neutral-dark' : 'text-gray-600'}`}>
                                                        {notification.title}
                                                    </h3>
                                                    <span className="text-xs text-gray-400 whitespace-nowrap">
                                                        {formatTime(notification.timestamp)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                            </div>
                                            {!notification.read && (
                                                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                                            )}
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* Timeline View */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8"
                >
                    <h2 className="text-lg font-semibold text-neutral-dark mb-4">Activity Timeline</h2>
                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                        {notifications.slice(0, 5).map((notification, index) => (
                            <div key={notification.id} className="relative pl-10 pb-6 last:pb-0">
                                {/* Timeline dot */}
                                <div
                                    className={`absolute left-2.5 w-3 h-3 rounded-full ${!notification.read ? 'bg-primary' : 'bg-gray-300'
                                        }`}
                                />

                                <div className="text-sm">
                                    <span className="font-medium text-neutral-dark">{notification.title}</span>
                                    <span className="text-gray-400 ml-2">{formatTime(notification.timestamp)}</span>
                                </div>
                                <p className="text-sm text-gray-500 mt-0.5">{notification.message}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
