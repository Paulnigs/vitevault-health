'use client';

import { ReactNode } from 'react';
import DashboardLayoutContent from '@/components/DashboardLayoutContent';

export default function Layout({ children }: { children: ReactNode }) {
    return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}
