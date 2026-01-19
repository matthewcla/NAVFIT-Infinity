import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ContextSidebarProps {
    children: ReactNode;
    isCollapsed?: boolean;
    onExpand?: () => void;
    className?: string;
}

export function ContextSidebar({
    children,
    isCollapsed = false,
    onExpand,
    className
}: ContextSidebarProps) {
    return (
        <div
            className={cn(
                "border-r border-slate-200 flex flex-col shrink-0 z-infinity-sidebar relative transition-all duration-300 ease-in-out overflow-hidden",
                isCollapsed
                    ? "w-6 bg-slate-100 hover:bg-slate-200 cursor-pointer border-r-4 border-r-transparent hover:border-r-indigo-400"
                    : "w-sidebar-standard bg-slate-50 opacity-100",
                className
            )}
            onClick={() => {
                if (isCollapsed && onExpand) {
                    onExpand();
                }
            }}
            title={isCollapsed ? "Click to Expand list" : undefined}
        >
            {isCollapsed ? (
                <div className="h-full flex flex-col items-center pt-8 gap-4 opacity-0 hover:opacity-100 transition-opacity duration-200 delay-100">
                    <div className="w-1 h-12 bg-slate-300 rounded-full" />
                </div>
            ) : (
                <div className="flex-1 overflow-hidden animate-in fade-in duration-300">
                    {children}
                </div>
            )}
        </div>
    );
}
