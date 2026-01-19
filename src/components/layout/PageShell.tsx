import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageShellProps {
    children: ReactNode;
    className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
    return (
        <div className={cn("flex flex-col h-full bg-slate-50 overflow-hidden", className)}>
            {children}
        </div>
    );
}

interface PageHeaderProps {
    title: ReactNode;
    children?: ReactNode; // For actions/controls
    className?: string; // For specialized backgrounds like Archive mode
}

export function PageHeader({ title, children, className }: PageHeaderProps) {
    return (
        <div className={cn(
            "border-b px-6 py-3 flex items-center justify-between shrink-0 transition-colors duration-300",
            "bg-white border-slate-200", // Default
            className
        )}>
            <div className="flex items-center gap-4">
                <h1 className="text-lg font-bold text-slate-800 tracking-tight">
                    {title}
                </h1>
                {/* Vertical Divider if children exist (optional, or let consumer handle) */}
                {children && <div className="h-6 w-px bg-slate-200 hidden md:block" />}

                {children}
            </div>
        </div>
    );
}

interface PageContentProps {
    children: ReactNode;
    className?: string;
}

export function PageContent({ children, className }: PageContentProps) {
    return (
        <div className={cn("flex-1 flex overflow-hidden relative", className)}>
            {children}
        </div>
    );
}
