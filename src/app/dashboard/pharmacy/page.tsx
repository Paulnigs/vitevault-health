'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Card, CountdownTimer } from '@/components/ui';
import toast from 'react-hot-toast';

// Demo data
const demoPatients = [
    {
        id: '1',
        name: 'Mrs. Adebayo',
        medications: [
            { name: 'Lisinopril 10mg', daysRemaining: 2, refillCost: 8500, status: 'pending' },
        ],
        walletBalance: 45000,
    },
    {
        id: '2',
        name: 'Mr. Okonkwo',
        medications: [
            { name: 'Metformin 500mg', daysRemaining: 0, refillCost: 6000, status: 'approved' },
            { name: 'Aspirin 100mg', daysRemaining: 15, refillCost: 3500, status: 'none' },
        ],
        walletBalance: 32000,
    },
    {
        id: '3',
        name: 'Mrs. Nwosu',
        medications: [
            { name: 'Amlodipine 5mg', daysRemaining: 5, refillCost: 7500, status: 'none' },
        ],
        walletBalance: 28000,
    },
];

const pendingDeductions = [
    { id: '1', patient: 'Mrs. Adebayo', medication: 'Lisinopril 10mg', amount: 8500 },
    { id: '2', patient: 'Mr. Okonkwo', medication: 'Metformin 500mg', amount: 6000 },
];

export default function PharmacyDashboard() {
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleApprove = async (id: string, patient: string, medication: string) => {
        setProcessingId(id);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        toast.success(`Refill approved for ${patient}'s ${medication}! 💊`);
        setProcessingId(null);
    };

    return (
        <div>
            {/* Welcome Header */}
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-[#343A40]">
                    Pharmacy Dashboard 🏥
                </h1>
                <p className="text-[#6C757D] mt-1">
                    Manage your connected patients and process refills
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card className="text-center">
                    <p className="text-[#6C757D] text-sm mb-1">Connected Patients</p>
                    <p className="text-3xl font-bold text-[#007BFF]">{demoPatients.length}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-[#6C757D] text-sm mb-1">Pending Refills</p>
                    <p className="text-3xl font-bold text-[#FFC107]">{pendingDeductions.length}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-[#6C757D] text-sm mb-1">Processed Today</p>
                    <p className="text-3xl font-bold text-[#28A745]">5</p>
                </Card>
                <Card className="text-center">
                    <p className="text-[#6C757D] text-sm mb-1">Revenue</p>
                    <p className="text-3xl font-bold text-[#343A40]">₦48K</p>
                </Card>
            </div>

            {/* Pending Approvals */}
            <div className="mb-8">
                <h2 className="text-xl font-bold text-[#343A40] mb-4">
                    Pending Refill Requests
                </h2>

                {pendingDeductions.length === 0 ? (
                    <Card className="text-center py-8">
                        <div className="text-4xl mb-2">✅</div>
                        <p className="text-[#6C757D]">No pending requests</p>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {pendingDeductions.map((item) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-[#FFC107]/10 rounded-full flex items-center justify-center">
                                            <svg className="w-6 h-6 text-[#FFC107]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-bold text-[#343A40]">{item.patient}</p>
                                            <p className="text-sm text-[#6C757D]">{item.medication}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <p className="text-lg font-bold text-[#28A745]">
                                            ₦{item.amount.toLocaleString()}
                                        </p>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            isLoading={processingId === item.id}
                                            onClick={() => handleApprove(item.id, item.patient, item.medication)}
                                        >
                                            Approve
                                        </Button>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Connected Patients */}
            <div>
                <h2 className="text-xl font-bold text-[#343A40] mb-4">Connected Patients</h2>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-[#6C757D] font-medium">Patient</th>
                                <th className="text-left py-3 px-4 text-[#6C757D] font-medium">Medications</th>
                                <th className="text-left py-3 px-4 text-[#6C757D] font-medium">Status</th>
                                <th className="text-right py-3 px-4 text-[#6C757D] font-medium">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {demoPatients.map((patient) => (
                                <tr key={patient.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-[#007BFF]/10 rounded-full flex items-center justify-center">
                                                <span className="text-[#007BFF] font-bold">{patient.name.charAt(0)}</span>
                                            </div>
                                            <span className="font-medium text-[#343A40]">{patient.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="space-y-1">
                                            {patient.medications.map((med, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <CountdownTimer
                                                        daysRemaining={med.daysRemaining}
                                                        totalDays={30}
                                                        size="sm"
                                                        showLabel={false}
                                                    />
                                                    <span className="text-sm text-[#343A40]">{med.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        {patient.medications.some((m) => m.daysRemaining <= 3) ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFC107]/10 text-[#FFC107]">
                                                Refill Soon
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#28A745]/10 text-[#28A745]">
                                                Healthy
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <span className="font-bold text-[#28A745]">
                                            ₦{patient.walletBalance.toLocaleString()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
