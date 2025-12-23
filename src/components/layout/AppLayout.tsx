import { type ReactNode } from 'react';
import { Sidebar, type Tab } from './Sidebar';
import { cn } from '../../lib/utils';

interface AppLayoutProps {
    children: ReactNode;
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
    collapsed: boolean;
    onToggleCollapse: () => void;
}

export function AppLayout({ children, activeTab, onTabChange, collapsed, onToggleCollapse }: AppLayoutProps) {
    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
            <Sidebar
                activeTab={activeTab}
                onTabChange={onTabChange}
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
            />
            <div
                className={cn(
                    "flex-1 flex flex-col transition-all duration-300 ease-in-out",
                    collapsed ? "ml-20" : "ml-64"
                )}
            >
                {children}
            </div>
        </div>
    );
}
