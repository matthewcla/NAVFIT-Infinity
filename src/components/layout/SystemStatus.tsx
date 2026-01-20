import { cn } from '@/lib/utils';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
            case 'active': return 'ONLINE';
            case 'syncing': return 'SYNCING';
            case 'error': return 'OFFLINE';
        }
    };

    return (
        <div
            className={cn(
                "mx-4 mb-3 mt-1 rounded-lg transition-all duration-300 group relative select-none",
                collapsed ? "flex justify-center mx-2 px-0 py-2" : "px-3 py-2"
            )}
        >
            <div className={cn("flex items-center", collapsed ? "justify-center" : "space-x-3")}>

                {/* Status Indicator Dot */}
                <div className="relative flex items-center justify-center shrink-0">
                    <motion.div
                        className={cn(
                            "w-2 h-2 rounded-full transition-all duration-500",
                            getStatusColor()
                        )}
                        initial={false}
                        animate={{ scale: status === 'syncing' ? [1, 1.2, 1] : 1 }}
                        transition={{ repeat: status === 'syncing' ? Infinity : 0, duration: 1 }}
                    />

                    {/* Ripple effect for active/syncing */}
                    {status !== 'error' && (
                        <div className={cn(
                            "absolute inset-0 rounded-full opacity-50 animate-ping",
                            status === 'active' ? "bg-emerald-500/30" : "bg-blue-500/30"
                        )} />
                    )}
                </div>

                {/* Text Content - Hidden when collapsed */}
                <AnimatePresence>
                    {!collapsed && (
                        <motion.div
                            className="flex-1 overflow-hidden"
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                        >
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                                    CNPC LINK
                                </span>
                                {status === 'active' && (
                                    <Wifi size={10} className="text-emerald-500/50" />
                                )}
                                {status === 'syncing' && (
                                    <RefreshCw size={10} className="text-blue-500/50 animate-spin" />
                                )}
                                {status === 'error' && (
                                    <WifiOff size={10} className="text-red-500/50" />
                                )}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
                                <span className={cn(
                                    "font-semibold",
                                    status === 'active' ? "text-emerald-500/80" :
                                        status === 'syncing' ? "text-blue-500/80" : "text-red-500/80"
                                )}>
                                    {getStatusText()}
                                </span>
                                <span className="opacity-50">{lastSynced}</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Tooltip for Collapsed State */}
            {collapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-slate-900/90 backdrop-blur-md text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10 transition-opacity duration-200">
                    <div className="font-semibold mb-0.5 tracking-wider text-[10px] text-slate-400">STATUS</div>
                    <div className={cn("font-bold text-sm",
                        status === 'active' ? "text-emerald-400" :
                            status === 'syncing' ? "text-blue-400" : "text-red-400"
                    )}>
                        {getStatusText()}
                    </div>
                    <div className="text-slate-500 text-[10px] font-mono mt-1">Last: {lastSynced}</div>

                    {/* Arrow */}
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-slate-900/90" />
                </div>
            )}
        </div>
    );
};
