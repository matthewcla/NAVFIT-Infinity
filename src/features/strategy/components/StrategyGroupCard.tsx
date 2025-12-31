import { Calendar, Users, Target, AlertTriangle, ArrowRight } from 'lucide-react';

interface StrategyGroupCardProps {
    title: string;
    date: string; // ISO date or display string
    memberCount: number;
    status: 'Upcoming' | 'Active' | 'Overdue' | 'Complete';
    rscaImpact: number; // e.g. +0.02
    airGaps?: number; // Count of air gaps
    promotionStatus?: 'REGULAR' | 'FROCKED' | 'SELECTED' | 'SPOT';
    onClick?: () => void;
}

export function StrategyGroupCard({
    title,
    date,
    memberCount,
    status,
    rscaImpact,
    airGaps = 0,
    promotionStatus = 'REGULAR',
    onClick
}: StrategyGroupCardProps) {

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'Active': return 'bg-blue-500 border-blue-500';
            case 'Upcoming': return 'bg-slate-400 border-slate-400';
            case 'Overdue': return 'bg-red-500 border-red-500';
            case 'Complete': return 'bg-emerald-500 border-emerald-500';
            default: return 'bg-slate-300 border-slate-300';
        }
    };

    const getPromotionStatusBadge = (s?: string) => {
        if (!s) return null;
        const normalized = s.toUpperCase();

        switch (normalized) {
            case 'FROCKED':
                return (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                        FROCKED
                    </div>
                );
            case 'SELECTED':
                return (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                        SELECTED
                    </div>
                );
            case 'SPOT':
                return (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-700 border border-cyan-200">
                        SPOT
                    </div>
                );
            case 'REGULAR':
                return (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                        REGULAR
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div
            onClick={onClick}
            className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer overflow-hidden flex flex-col"
        >
            {/* Status Strip */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${getStatusColor(status)}`}></div>

            <div className="p-5 flex-1">
                {/* Header */}
                <div className="flex flex-col gap-2 mb-3">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1 pr-4">
                            {/* Badges Row */}
                            <div className="flex items-center gap-2 mb-1">
                                {getPromotionStatusBadge(promotionStatus)}
                                {airGaps > 0 && (
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 animate-pulse">
                                        <AlertTriangle className="w-3 h-3" />
                                        {airGaps} GAPS
                                    </div>
                                )}
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-700 transition-colors leading-tight">
                                {title}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>{memberCount} Members</span>
                    </div>
                </div>
            </div>

            {/* Footer / Impact Stats */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Target className="w-3.5 h-3.5" />
                    <span>Proj. Impact:</span>
                    <span className={`flex items-center ${rscaImpact > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {rscaImpact > 0 ? '+' : ''}{rscaImpact.toFixed(3)}
                    </span>
                </div>

                <div className="bg-white rounded-full p-1.5 border border-slate-200 text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
}
