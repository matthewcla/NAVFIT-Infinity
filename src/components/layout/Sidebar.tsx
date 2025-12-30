import React from 'react';
import {
    TrendingUp,
    Calendar,
    FileText,
    Shield,
    Users,
    Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Define the tab type locally or import from a shared type file if needed
export type Tab = 'dashboard' | 'reports' | 'schedule' | 'profiles' | 'admin';

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
            active ? "bg-blue-800 text-yellow-400" : "text-blue-100 hover:bg-blue-800",
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
            {/* Header Area (Gmail Style) */}
            <div className="h-20 flex items-center px-6 space-x-4 border-b border-slate-800">
                {/* Hamburger Menu - Always visible, fixed position logic handled by container layout */}
                <button
                    onClick={onToggleCollapse}
                    className="text-blue-100 hover:text-white hover:bg-slate-800 p-2 rounded-full transition-colors focus:outline-none"
                    title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <Menu size={24} />
                </button>

                {/* Logo - Visible only when expanded */}
                {/* Logo - Removed for cleaner look */}

            </div>

            {/* Navigation */}
            <div className="flex-1 py-6 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700">
                <SidebarItem
                    icon={TrendingUp}
                    label="Strategic Pulse"
                    active={activeTab === 'dashboard'}
                    onClick={() => onTabChange('dashboard')}
                    collapsed={collapsed}
                />
                <SidebarItem
                    icon={Users}
                    label="Sailor Profiles"
                    active={activeTab === 'profiles'}
                    onClick={() => onTabChange('profiles')}
                    collapsed={collapsed}
                />
                <div className="my-2 border-t border-slate-800/50 mx-4"></div>
                <SidebarItem
                    icon={FileText}
                    label="Reports Manager"
                    active={activeTab === 'reports'}
                    onClick={() => onTabChange('reports')}
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



            {/* User Profile */}
            <div className={cn("p-4 border-t border-slate-800 flex items-center transition-all duration-300", collapsed ? "justify-center space-x-0" : "space-x-3")}>
                <div className="w-10 h-10 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-white font-bold border-2 border-slate-700">
                    CO
                </div>
                {!collapsed && (
                    <div className="overflow-hidden whitespace-nowrap">
                        <div className="text-sm font-bold text-white">CAPT J. Doe</div>
                        <div className="text-xs text-slate-400">Commanding Officer</div>
                    </div>
                )}
            </div>
        </div>
    );
}
