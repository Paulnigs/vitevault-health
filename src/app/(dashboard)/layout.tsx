'use client';

import { ReactNode } from 'react';
import DashboardLayoutContent from '@/components/DashboardLayoutContent';

interface DashboardLayoutProps {
    children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}
