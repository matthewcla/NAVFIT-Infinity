import { Calendar, Users, Target, ArrowRight } from 'lucide-react';

interface StrategyGroupCardProps {
    title: string;
    date: string; // ISO date or display string
    memberCount: number;
    status: 'Upcoming' | 'Active' | 'Overdue' | 'Complete';
    rscaImpact: number; // e.g. +0.02
    promotionStatus?: 'REGULAR' | 'FROCKED' | 'SELECTED' | 'SPOT';
    isSelected?: boolean;
    onClick?: () => void;
}

export function StrategyGroupCard({
    title,
    date,
    memberCount,
    status,
    rscaImpact,
    promotionStatus = 'REGULAR',
    isSelected = false,
    onClick
}: StrategyGroupCardProps) {

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'Active': return 'bg-blue-500';
            case 'Upcoming': return 'bg-slate-400';
            case 'Overdue': return 'bg-red-500';
            case 'Complete': return 'bg-emerald-500';
            default: return 'bg-slate-300';
        }
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
            default:
                return null;
        }
    };

    return (
        <div
            onClick={onClick}
            className={`
                group relative rounded-lg border transition-all cursor-pointer overflow-hidden flex flex-col
                ${isSelected
                    ? 'bg-indigo-50 border-indigo-600 ring-1 ring-indigo-600 shadow-md z-10'
                    : 'bg-white border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md'
                }
            `}
        >
            {/* Status Strip */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${getStatusColor(status)}`}></div>

            <div className="p-3 pl-4 flex-1">
                {/* Header with Title and Badge */}
                <div className="flex flex-col gap-1 mb-2">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className={`text-sm font-bold transition-colors leading-snug ${isSelected ? 'text-indigo-900' : 'text-slate-800 group-hover:text-indigo-700'}`}>
                                    {title}
                                </h3>
                                {promotionStatus !== 'REGULAR' && getPromotionStatusBadge(promotionStatus)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>{memberCount} Members</span>
                    </div>
                </div>
            </div>

            {/* Footer / Impact Stats */}
            <div className={`px-3 py-2 border-t flex items-center justify-between ${isSelected ? 'bg-indigo-100/50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                    <Target className="w-3 h-3" />
                    <span>Impact:</span>
                    <span className={`font-mono font-bold ${rscaImpact > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {rscaImpact > 0 ? '+' : ''}{rscaImpact.toFixed(2)}
                    </span>
                </div>

                <div className={`rounded-full p-0.5 border transition-colors ${isSelected ? 'bg-indigo-200 text-indigo-700 border-indigo-300' : 'bg-white text-slate-300 border-slate-200 group-hover:text-indigo-600 group-hover:border-indigo-200'}`}>
                    <ArrowRight className="w-3 h-3" />
                </div>
            </div>
        </div>
    );
}
