import { cn } from '@/lib/utils';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SystemStatusProps {
    collapsed: boolean;
}

export const SystemStatus = ({ collapsed }: SystemStatusProps) => {
    // Mock state - in a real app, this would come from a store or context
    const [status, setStatus] = useState<'active' | 'syncing' | 'error'>('active');
    const [lastSynced, setLastSynced] = useState<string>('10:42 AM');

    // Simulate occasional sync activity for "Premium" feel
    useEffect(() => {
        const interval = setInterval(() => {
            setStatus('syncing');
            setTimeout(() => {
                setStatus('active');
                setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            }, 2000);
        }, 60000); // Run mock sync every minute for demo

        return () => clearInterval(interval);
    }, []);

    const getStatusColor = () => {
        switch (status) {
            case 'active': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
            case 'syncing': return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse';
            case 'error': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'active': return 'CNPC Online';
            case 'syncing': return 'Syncing...';
            case 'error': return 'Connection Lost';
        }
    };

    return (
        <div
            className={cn(
                "mx-4 mb-2 mt-auto rounded-lg transition-all duration-300 group relative select-none",
                collapsed ? "flex justify-center mx-2 px-0 py-2" : "bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-700 px-3 py-2.5"
            )}
        >
            <div className={cn("flex items-center", collapsed ? "justify-center" : "space-x-3")}>

                {/* Status Indicator Dot */}
                <div className="relative flex items-center justify-center">
                    <div className={cn(
                        "w-2.5 h-2.5 rounded-full transition-all duration-500",
                        getStatusColor()
                    )} />

                    {/* Ripple effect for active/syncing */}
                    {status !== 'error' && (
                        <div className={cn(
                            "absolute inset-0 rounded-full opacity-75 animate-ping",
                            status === 'active' ? "bg-emerald-500/30" : "bg-blue-500/30"
                        )} />
                    )}
                </div>

                {/* Text Content - Hidden when collapsed */}
                <div className={cn(
                    "flex-1 overflow-hidden transition-all duration-300",
                    collapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block"
                )}>
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-200 tracking-wide">
                            {getStatusText()}
                        </span>
                        {status === 'active' && (
                            <Wifi size={12} className="text-emerald-500/70" />
                        )}
                        {status === 'syncing' && (
                            <RefreshCw size={12} className="text-blue-500/70 animate-spin" />
                        )}
                        {status === 'error' && (
                            <WifiOff size={12} className="text-red-500/70" />
                        )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate font-medium">
                        Last synced: {lastSynced}
                    </div>
                </div>
            </div>

            {/* Tooltip for Collapsed State */}
            {collapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-slate-700 transition-opacity duration-200">
                    <div className="font-semibold mb-0.5">{getStatusText()}</div>
                    <div className="text-slate-400 text-[10px]">Last synced: {lastSynced}</div>

                    {/* Arrow */}
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
                </div>
            )}
        </div>
    );
};
