import React from 'react';
import {
    Zap,
    LayoutDashboard,
    Users,
    Calendar,
    Shield,
    Anchor,
    Maximize,
    Minimize,
    Orbit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFullScreen } from '@/hooks/useFullScreen';
import { UserProfileMenu } from './UserProfileMenu';
import { SystemStatus } from './SystemStatus';

// Define the tab type locally or import from a shared type file if needed
export type Tab = 'dashboard' | 'summary_groups' | 'competitive_groups' | 'profiles' | 'schedule' | 'admin';

interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    onClick?: () => void;
    collapsed?: boolean;
}

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }: SidebarItemProps) => (
    <div
        onClick={onClick}
        className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 group relative",
            active ? "bg-slate-800 text-yellow-400 border-l-4 border-yellow-400 shadow-sm" : "text-slate-400 hover:bg-slate-800 hover:text-yellow-200",
            collapsed ? "justify-center px-2" : ""
        )}
        title={collapsed ? label : undefined}
    >
        <Icon size={20} className="flex-shrink-0" />
        {!collapsed && <span className="font-medium whitespace-nowrap overflow-hidden transition-all duration-300">{label}</span>}

        {/* Tooltip for collapsed mode */}
        {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-slate-700">
                {label}
            </div>
        )}
    </div>
);

interface SidebarProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
    collapsed: boolean;
    onToggleCollapse: () => void;
}

export function Sidebar({ activeTab, onTabChange, collapsed, onToggleCollapse }: SidebarProps) {
    const { isFullScreen, toggleFullScreen } = useFullScreen();

    return (
        <div
            className={cn(
                "bg-slate-900 flex flex-col fixed h-full z-50 shadow-xl transition-all duration-300 ease-in-out border-r border-slate-800",
                collapsed ? "w-20" : "w-64"
            )}
            onMouseLeave={() => {
                if (!collapsed) {
                    onToggleCollapse();
                }
            }}
        >
            {/* Header Area */}
            <div className="h-20 flex items-center px-4 space-x-3 border-b border-slate-800 transition-all duration-300">
                {/* Anchor Icon - Functions as collapse toggle */}
                <button
                    onClick={onToggleCollapse}
                    className="text-yellow-400 hover:text-yellow-300 hover:bg-slate-800 p-2 rounded-lg transition-all duration-300 focus:outline-none shadow-[0_0_15px_rgba(250,204,21,0.1)] hover:shadow-[0_0_20px_rgba(250,204,21,0.3)]"
                    title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <Anchor size={28} className="transition-transform duration-300 transform group-hover:scale-110" />
                </button>

                {/* Title */}
                <div className={cn(
                    "flex flex-col transition-all duration-300 overflow-hidden whitespace-nowrap",
                    collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                )}>
                    <span className="text-xl font-bold tracking-tight text-slate-100 leading-none">
                        NAVFIT <span className="text-yellow-400 font-extrabold">Infinity</span>
                    </span>
                    <span className="text-[0.6rem] text-slate-400 uppercase tracking-[0.2em] font-medium ml-0.5">
                        Command Advantage
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 py-6 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700">
                <SidebarItem
                    icon={LayoutDashboard}
                    label="Command Deck"
                    active={activeTab === 'dashboard'}
                    onClick={() => onTabChange('dashboard')}
                    collapsed={collapsed}
                />

                <SidebarItem
                    icon={Orbit}
                    label="Competitive Groups"
                    active={activeTab === 'competitive_groups'}
                    onClick={() => onTabChange('competitive_groups')}
                    collapsed={collapsed}
                />
                <div className="my-2 border-t border-slate-800/50 mx-4"></div>
                <SidebarItem
                    icon={Zap}
                    label="Summary Groups"
                    active={activeTab === 'summary_groups'}
                    onClick={() => onTabChange('summary_groups')}
                    collapsed={collapsed}
                />
                <SidebarItem
                    icon={Users}
                    label="Sailor Profiles"
                    active={activeTab === 'profiles'}
                    onClick={() => onTabChange('profiles')}
                    collapsed={collapsed}
                />

                <SidebarItem
                    icon={Calendar}
                    label="Board Schedule"
                    active={activeTab === 'schedule'}
                    onClick={() => onTabChange('schedule')}
                    collapsed={collapsed}
                />
                <div className="my-2 border-t border-slate-800/50 mx-4"></div>
                <SidebarItem
                    icon={Shield}
                    label="Command Settings"
                    active={activeTab === 'admin'}
                    onClick={() => onTabChange('admin')}
                    collapsed={collapsed}
                />
            </div>

            {/* Utility Dock */}
            <div className="py-2 border-t border-slate-800/50 space-y-1">
                <SidebarItem
                    icon={isFullScreen ? Minimize : Maximize}
                    label={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                    onClick={toggleFullScreen}
                    collapsed={collapsed}
                />
            </div>

            {/* System Status Indicator - Pushed to bottom */}
            <div className="mt-auto">
                <SystemStatus collapsed={collapsed} />
            </div>

            {/* User Profile */}
            <UserProfileMenu collapsed={collapsed} />
        </div>
    );
}
