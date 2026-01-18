import { type ReactNode } from 'react';
import { Sidebar, type Tab } from './Sidebar';


import { cn } from '@/lib/utils';

interface AppLayoutProps {
    children: ReactNode;
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
    collapsed: boolean;
    onToggleCollapse: () => void;
}

export function AppLayout({ children, activeTab, onTabChange, collapsed, onToggleCollapse }: AppLayoutProps) {
    return (
        <div className="h-full overflow-hidden bg-slate-50 flex font-sans text-slate-900">
            <Sidebar
                activeTab={activeTab}
                onTabChange={onTabChange}
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
            />
            <div
                className={cn(
                    "flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out min-w-0",
                    collapsed ? "ml-20" : "ml-64"
                )}
            >

                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {children}
                </div>
            </div>
        </div>
    );
}
