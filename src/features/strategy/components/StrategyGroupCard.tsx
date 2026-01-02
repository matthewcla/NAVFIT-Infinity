import { Calendar, Users } from 'lucide-react';
import { useRef, useState } from 'react';
import { StatusBadge } from './StatusBadge';
import { PromotionBadge } from './PromotionBadge';

interface StrategyGroupCardProps {
    title: string;
    date: string; // ISO date or display string
    memberCount: number;
    status: 'Upcoming' | 'Active' | 'Overdue' | 'Complete';
    rscaImpact: number; // e.g. +0.02
    promotionStatus?: 'REGULAR' | 'FROCKED' | 'SELECTED' | 'SPOT';
    isSelected?: boolean;
    onClick?: () => void;
    distribution?: Record<string, number>;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
}


export function StrategyGroupCard({
    title,
    date,
    memberCount,
    status,
    rscaImpact,
    promotionStatus = 'REGULAR',
    isSelected = false,
    onClick,
    workflowStatus,
    distribution,
    draggable,
    onDragStart,
    onDragEnd
}: StrategyGroupCardProps & { workflowStatus?: string; distribution?: Record<string, number> }) {



    const dragPreviewRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Helper to clean title
    const cleanTitle = (t: string) => {
        return t.replace(/\b(FROCKED|REGULAR|SELECTED|SPOT)\b/gi, '').trim();
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        if (dragPreviewRef.current) {
            e.dataTransfer.setDragImage(dragPreviewRef.current, 0, 0);
        }
        setIsDragging(true);
        onDragStart?.(e);
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        setIsDragging(false);
        onDragEnd?.(e);
    };

    const getPromotionStatusBadge = (s?: string) => {
        if (!s) return null;
        const normalized = s.toUpperCase();

        const badgeBase = "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border shadow-sm leading-none tracking-wide";

        switch (normalized) {
            case 'FROCKED':
                return (
                    <div className={`${badgeBase} bg-amber-100 text-amber-800 border-amber-200`}>
                        FROCKED
                    </div>
                );
            case 'SELECTED':
                return (
                    <div className={`${badgeBase} bg-green-100 text-green-800 border-green-200`}>
                        SELECTED
                    </div>
                );
            case 'SPOT':
                return (
                    <div className={`${badgeBase} bg-purple-100 text-purple-800 border-purple-200`}>
                        SPOT
                    </div>
                );
            case 'REGULAR':
                return (
                    <div className={`${badgeBase} bg-slate-100 text-slate-600 border-slate-200`}>
                        REGULAR
                    </div>
                );
            default:
                return null;
        }
    };

    const formattedDate = new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <>
            {/* Drag Preview - Hidden from view but used for drag image */}
            <div
                ref={dragPreviewRef}
                className="absolute -top-[9999px] left-0 w-64 bg-white border border-indigo-500 rounded-lg shadow-xl p-3 z-50 pointer-events-none overflow-hidden flex flex-col gap-2"
            >
                <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-indigo-900 truncate mr-2">
                        {cleanTitle(title)}
                    </span>
                    {getPromotionStatusBadge(promotionStatus)}
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{formattedDate}</span>
                    </div>
                    <div className="scale-90 origin-right">
                        <StatusBadge status={workflowStatus || status} />
                    </div>
                </div>
            </div>

            <div
                draggable={draggable}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onClick={onClick}
                className={`
                    group relative rounded-lg border transition-all cursor-pointer overflow-hidden flex flex-col
                    ${isSelected
                        ? 'bg-indigo-50 border-indigo-600 ring-1 ring-indigo-600 shadow-md z-10'
                        : 'bg-white border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md'
                    }
                    ${isDragging ? 'opacity-50 ring-2 ring-indigo-400 ring-offset-2 scale-95 grayscale' : ''}
                `}
            >
                {/* Status Strip - Removed or Kept? User didn't explicitly say delete, but new layout implies changes. Keeping for specific status indication might be noisy if we have badges. 
                     Let's keep the strip as it's a good succinct indicator, or rely on the badge. 
                     Plan said "Position the status badge beneath Impact metric". 
                     Let's keep the strip for 'Cycle Status' (Active/Overdue) if 'workflowStatus' is different. 
                     But 'status' prop IS the cycle status. 
                     Let's look at the old code: 'status' was used for the strip. 'workflowStatus' was used for a badge.
                     User said: "Position the status badge beneath Impact metric". Use StatusBadge component likely.
                */}

                <div className="p-3 pl-4 flex-1">
                    {/* Header Row: Title + Badge (Left) vs Impact + Status (Right) */}
                    <div className="flex justify-between items-start gap-4 mb-2">
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                                <h3 className={`text-sm font-bold transition-colors leading-snug ${isSelected ? 'text-indigo-900' : 'text-slate-800 group-hover:text-indigo-700'}`}>
                                    {cleanTitle(title)}
                                </h3>
                                {getPromotionStatusBadge(promotionStatus)}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>{formattedDate}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Impact</span>
                                <span className={`font-mono font-bold text-sm ${rscaImpact > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {rscaImpact > 0 ? '+' : ''}{rscaImpact.toFixed(2)}
                                </span>
                            </div>
                            <StatusBadge status={workflowStatus || status} />
                        </div>
                    </div>
                </div>

                {/* Footer: Member Count + Distribution */}
                <div className={`px-3 py-2 border-t flex items-center justify-between gap-3 ${isSelected ? 'bg-indigo-100/50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
                    {/* Member Count */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span className="font-medium">{memberCount} Members</span>
                    </div>

                    {/* Distribution */}
                    {distribution && (
                        <div className="flex items-center gap-3 text-[10px]">
                            {['SP', 'PR', 'P', 'MP', 'EP'].map(key => (
                                <div key={key} className="flex flex-col items-center justify-center gap-0.5 min-w-[16px]">
                                    <span className="text-slate-700 font-bold leading-none">{distribution[key] || 0}</span>
                                    <PromotionBadge recommendation={key} size="sm" className="rounded-[3px] scale-90" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
