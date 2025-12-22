import React from 'react';
import {
    Anchor,
    Infinity,
    Users,
    TrendingUp,
    Calendar,
    FileText
} from 'lucide-react';
import { cn } from '../../lib/utils';

// Define the tab type locally or import from a shared type file if needed
export type Tab = 'dashboard' | 'reports' | 'groups' | 'schedule';

interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    onClick?: () => void;
}

const SidebarItem = ({ icon: Icon, label, active, onClick }: SidebarItemProps) => (
    <div
        onClick={onClick}
        className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg cursor-pointer transition-colors",
            active ? "bg-blue-800 text-yellow-400" : "text-blue-100 hover:bg-blue-800"
        )}
    >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
    </div>
);

interface SidebarProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
    return (
        <div className="w-64 bg-slate-900 flex flex-col fixed h-full z-50 shadow-xl">
            {/* Logo Area */}
            <div className="h-20 flex items-center px-6 border-b border-slate-800">
                <div className="relative">
                    <Anchor className="text-yellow-400 absolute -left-1 top-0" size={28} />
                    <Infinity className="text-blue-400 absolute left-2 top-2 opacity-80" size={16} />
                </div>
                <div className="ml-8">
                    <h1 className="text-white font-bold text-lg leading-none">NAVFIT</h1>
                    <span className="text-yellow-400 font-light text-sm tracking-[0.2em]">INFINITY</span>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 py-6 space-y-1">
                <SidebarItem
                    icon={TrendingUp}
                    label="Manning Waterfall"
                    active={activeTab === 'dashboard'}
                    onClick={() => onTabChange('dashboard')}
                />
                <SidebarItem
                    icon={FileText}
                    label="Reports Manager"
                    active={activeTab === 'reports'}
                    onClick={() => onTabChange('reports')}
                />
                <SidebarItem
                    icon={Users}
                    label="Summary Groups"
                    active={activeTab === 'groups'}
                    onClick={() => onTabChange('groups')}
                />
                <SidebarItem
                    icon={Calendar}
                    label="Board Schedule"
                    active={activeTab === 'schedule'}
                    onClick={() => onTabChange('schedule')}
                />
            </div>

            {/* Strategy Score in Sidebar */}
            <div className="p-6 bg-slate-800/50">
                <div className="text-xs text-blue-300 uppercase font-semibold mb-2">RSCA Flexibility Score</div>
                <div className="flex items-end space-x-2">
                    <span className="text-3xl font-bold text-green-400">84</span>
                    <span className="text-xs text-slate-400 mb-1">/ 100</span>
                </div>
                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2">
                    <div className="bg-green-400 h-1.5 rounded-full w-[84%]"></div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">High flexibility. You can support 2 additional EPs in the O-3 group.</p>
            </div>

            {/* User Profile */}
            <div className="p-4 border-t border-slate-800 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold border-2 border-slate-700">
                    CO
                </div>
                <div>
                    <div className="text-sm font-bold text-white">CAPT J. Doe</div>
                    <div className="text-xs text-slate-400">Commanding Officer</div>
                </div>
            </div>
        </div>
    );
}
