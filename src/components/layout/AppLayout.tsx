import React from 'react';
import { Sidebar, type Tab } from './Sidebar';

interface AppLayoutProps {
    children: React.ReactNode;
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
}

export function AppLayout({ children, activeTab, onTabChange }: AppLayoutProps) {
    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
            <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
            <div className="ml-64 flex-1 flex flex-col">
                {children}
            </div>
        </div>
    );
}
