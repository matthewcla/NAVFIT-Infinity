import React from 'react';
import {
    LayoutDashboard,
    Calendar,
    Shield,
    Infinity, // New Logo Icon
    Maximize,
    Minimize,
    LineChart,
    UserCircle,
    PanelLeft // New Toggle Icon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFullScreen } from '@/hooks/useFullScreen';
import { UserProfileMenu } from './UserProfileMenu';
import { SystemStatus } from './SystemStatus';
import { motion, AnimatePresence } from 'framer-motion';

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
            "relative flex items-center space-x-3 px-4 py-3 rounded-lg cursor-pointer group",
            collapsed ? "justify-center px-2" : ""
        )}
        title={collapsed ? label : undefined}
    >
        {/* Active Background - Sliding Effect */}
        {active && (
            <motion.div
                layoutId="active-sidebar-item"
                className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent rounded-lg shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] border-l-2 border-yellow-400/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
        )}

        {/* Hover Background (Non-active) */}
        {!active && (
            <div className="absolute inset-0 rounded-lg hover:bg-white/5 transition-colors duration-200" />
        )}

        <motion.div
            className="z-10 flex items-center space-x-3"
            whileHover={{ x: collapsed ? 0 : 4 }}
            whileTap={{ scale: 0.98 }}
        >
            <Icon
                size={20}
                className={cn(
                    "flex-shrink-0 transition-all duration-300",
                    active ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" : "text-slate-400 group-hover:text-slate-200"
                )}
            />
            {!collapsed && (
                <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className={cn(
                        "font-medium whitespace-nowrap overflow-hidden transition-colors duration-200",
                        active ? "text-yellow-100/90" : "text-slate-400 group-hover:text-slate-200"
                    )}
                >
                    {label}
                </motion.span>
            )}
        </motion.div>

        {/* Tooltip for collapsed mode */}
        {collapsed && (
            <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10 translate-x-2 group-hover:translate-x-0 transition-all duration-200">
                {label}
                {/* Arrow */}
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-slate-900/90" />
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
        <motion.div
            className={cn(
                "bg-slate-950/80 backdrop-blur-md flex flex-col fixed h-full z-50 shadow-2xl border-r border-white/5",
                // Removed transition-all to let Framer Motion handle width exclusively
            )}
            initial={false}
            animate={{ width: collapsed ? 72 : 256 }} // Tightened generic width
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onMouseLeave={() => {
                if (!collapsed) {
                    onToggleCollapse();
                }
            }}
        >
            {/* Header Area - Brand Focus */}
            <div className="h-18 flex items-center justify-center px-4 space-x-3 border-b border-white/5 relative overflow-hidden shrink-0">

                {/* Subtle Ambient Light at Top */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                {/* Brand Logo - Persists in all states */}
                <div className="flex items-center justify-center">
                    <motion.div
                        className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]"
                        animate={{ rotate: collapsed ? 0 : 360 }} // Subtle rotation on expand
                        transition={{ duration: 0.5 }}
                    >
                        <Infinity size={collapsed ? 28 : 24} />
                    </motion.div>
                </div>

                {/* Text Title - Hidden when collapsed */}
                <AnimatePresence>
                    {!collapsed && (
                        <motion.div
                            className="flex flex-col overflow-hidden whitespace-nowrap"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <span className="text-xl font-bold tracking-tight text-slate-100 leading-none drop-shadow-md">
                                NAVFIT
                            </span>
                            <span className="text-[0.6rem] text-slate-400 uppercase tracking-[0.2em] font-medium ml-0.5">
                                Infinity
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="flex-1 py-6 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700/50 scrollbar-track-transparent">
                <SidebarItem
                    icon={LayoutDashboard}
                    label="Command Deck"
                    active={activeTab === 'dashboard'}
                    onClick={() => onTabChange('dashboard')}
                    collapsed={collapsed}
                />

                <SidebarItem
                    icon={LineChart}
                    label="Competitive Groups"
                    active={activeTab === 'competitive_groups'}
                    onClick={() => onTabChange('competitive_groups')}
                    collapsed={collapsed}
                />

                {/* Refined Separator */}
                <div className="my-2 mx-4 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                <SidebarItem
                    icon={Calendar}
                    label="Board Schedule"
                    active={activeTab === 'schedule'}
                    onClick={() => onTabChange('schedule')}
                    collapsed={collapsed}
                />
                <SidebarItem
                    icon={UserCircle}
                    label="Sailor Profiles"
                    active={activeTab === 'profiles'}
                    onClick={() => onTabChange('profiles')}
                    collapsed={collapsed}
                />

                {/* Refined Separator */}
                <div className="my-2 mx-4 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                <SidebarItem
                    icon={Shield}
                    label="Command Settings"
                    active={activeTab === 'admin'}
                    onClick={() => onTabChange('admin')}
                    collapsed={collapsed}
                />
            </div>

            {/* Utility Dock - Now includes Collapse Toggle */}
            <div className="py-2 border-t border-white/5 space-y-1 relative shrink-0">
                {/* Top shine for dock */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <SidebarItem
                    icon={PanelLeft}
                    label={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    onClick={onToggleCollapse}
                    collapsed={collapsed}
                    active={false} // Always inactive style
                />

                <SidebarItem
                    icon={isFullScreen ? Minimize : Maximize}
                    label={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                    onClick={toggleFullScreen}
                    collapsed={collapsed}
                    active={false}
                />
            </div>

            {/* System Status Indicator - Pushed to bottom */}
            <div className="mt-auto shrink-0">
                <SystemStatus collapsed={collapsed} />
            </div>

            {/* User Profile */}
            <UserProfileMenu collapsed={collapsed} />
        </motion.div>
    );
}
