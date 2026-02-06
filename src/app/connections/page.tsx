'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Input, Modal, Skeleton } from '@/components/ui';
import { showSuccess, showError } from '@/components/ui/Toast';

interface LinkedUser {
    _id: string;
    name: string;
    email: string;
    role: 'child' | 'parent' | 'pharmacy';
    linkedAt?: string;
}

export default function ConnectionsPage() {
    const { data: session } = useSession();
    const [linkedUsers, setLinkedUsers] = useState<LinkedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResult, setSearchResult] = useState<LinkedUser | null>(null);
    const [searching, setSearching] = useState(false);
    const [linking, setLinking] = useState(false);

    const fetchConnections = async () => {
        try {
            const res = await fetch('/api/link');
            if (res.ok) {
                const data = await res.json();
                setLinkedUsers(data.linkedUsers || []);
            }
        } catch (error) {
            console.error('Failed to fetch connections:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConnections();
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchEmail.trim()) return;

        setSearching(true);
        setSearchResult(null);

        try {
            const res = await fetch(`/api/link?search=${encodeURIComponent(searchEmail)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.user) {
                    setSearchResult(data.user);
                } else {
                    showError('User not found');
                }
            } else {
                showError('Failed to search');
            }
        } catch {
            showError('Network error');
        } finally {
            setSearching(false);
        }
    };

    const handleLink = async () => {
        if (!searchResult) return;

        setLinking(true);

        try {
            const res = await fetch('/api/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: searchResult._id }),
            });

            if (res.ok) {
                showSuccess(`Connected with ${searchResult.name || searchResult.email}!`);
                setShowLinkModal(false);
                setSearchEmail('');
                setSearchResult(null);
                fetchConnections();
            } else {
                const data = await res.json();
                showError(data.error || 'Failed to connect');
            }
        } catch {
            showError('Network error');
        } finally {
            setLinking(false);
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'parent':
                return 'bg-blue-100 text-blue-700';
            case 'child':
                return 'bg-green-100 text-green-700';
            case 'pharmacy':
                return 'bg-purple-100 text-purple-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'parent':
                return '👨‍👩‍👧';
            case 'child':
                return '👶';
            case 'pharmacy':
                return '💊';
            default:
                return '👤';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-light p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Skeleton className="h-20 rounded-xl" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-40 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-light p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-8"
                >
                    <div>
                        <h1 className="text-3xl font-bold text-neutral-dark">Connections</h1>
                        <p className="text-gray-500">Manage your family and pharmacy connections</p>
                    </div>
                    <Button variant="primary" onClick={() => setShowLinkModal(true)}>
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Add Connection
                    </Button>
                </motion.div>

                {/* Family Tree Visualization */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-neutral-dark mb-4">Your Network</h2>

                        {/* Simple Family Tree SVG */}
                        <div className="flex justify-center py-8">
                            <svg viewBox="0 0 400 200" className="w-full max-w-md">
                                {/* Center node (current user) */}
                                <g transform="translate(200, 100)">
                                    <circle r="30" fill="url(#gradientPrimary)" />
                                    <text textAnchor="middle" dy="5" fill="white" fontSize="12" fontWeight="600">
                                        You
                                    </text>
                                </g>

                                {/* Connected nodes */}
                                {linkedUsers.slice(0, 4).map((user, index) => {
                                    const angle = (index * 90 - 45) * (Math.PI / 180);
                                    const x = 200 + Math.cos(angle) * 100;
                                    const y = 100 + Math.sin(angle) * 80;
                                    const fill = user.role === 'parent' ? '#007BFF' : user.role === 'pharmacy' ? '#6C757D' : '#28A745';

                                    return (
                                        <g key={user._id}>
                                            {/* Connection line */}
                                            <line
                                                x1="200"
                                                y1="100"
                                                x2={x}
                                                y2={y}
                                                stroke="#E5E7EB"
                                                strokeWidth="2"
                                            />
                                            {/* Node */}
                                            <g transform={`translate(${x}, ${y})`}>
                                                <circle r="25" fill={fill} />
                                                <text textAnchor="middle" dy="4" fill="white" fontSize="10">
                                                    {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                                </text>
                                            </g>
                                        </g>
                                    );
                                })}

                                {/* Gradient definition */}
                                <defs>
                                    <linearGradient id="gradientPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#007BFF" />
                                        <stop offset="100%" stopColor="#28A745" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                    </Card>
                </motion.div>

                {/* Connections List */}
                {linkedUsers.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <Card className="p-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-neutral-dark mb-2">No connections yet</h3>
                            <p className="text-gray-500 mb-4">Connect with family members or your pharmacy</p>
                            <Button variant="primary" onClick={() => setShowLinkModal(true)}>
                                Add Your First Connection
                            </Button>
                        </Card>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence>
                            {linkedUsers.map((user, index) => (
                                <motion.div
                                    key={user._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card className="p-5 hover:shadow-lg transition-shadow">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xl font-semibold">
                                                {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-neutral-dark truncate">
                                                    {user.name || 'User'}
                                                </h3>
                                                <p className="text-sm text-gray-500 truncate">{user.email}</p>
                                                <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                                                    {getRoleIcon(user.role)} {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                                </span>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* Add Connection Modal */}
                <Modal
                    isOpen={showLinkModal}
                    onClose={() => {
                        setShowLinkModal(false);
                        setSearchEmail('');
                        setSearchResult(null);
                    }}
                    title="Add Connection"
                >
                    <form onSubmit={handleSearch} className="space-y-4">
                        <Input
                            label="Search by Email"
                            type="email"
                            placeholder="Enter email address"
                            value={searchEmail}
                            onChange={(e) => setSearchEmail(e.target.value)}
                            required
                        />

                        <Button
                            type="submit"
                            variant="outline"
                            className="w-full"
                            disabled={searching}
                        >
                            {searching ? 'Searching...' : 'Search'}
                        </Button>
                    </form>

                    {/* Search Result */}
                    <AnimatePresence>
                        {searchResult && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mt-6 p-4 border rounded-xl"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xl font-semibold">
                                        {searchResult.name?.charAt(0) || searchResult.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-neutral-dark">
                                            {searchResult.name || 'User'}
                                        </h3>
                                        <p className="text-sm text-gray-500">{searchResult.email}</p>
                                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(searchResult.role)}`}>
                                            {searchResult.role}
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    variant="primary"
                                    className="w-full mt-4"
                                    onClick={handleLink}
                                    disabled={linking}
                                >
                                    {linking ? 'Connecting...' : 'Connect'}
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Modal>
            </div>
        </div>
    );
}
