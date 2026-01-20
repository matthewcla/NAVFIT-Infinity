import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { SummaryGroup, Report } from '@/types';
import { MemberCard } from './MemberCard';
import { format } from 'date-fns';
import { Calendar, Target } from 'lucide-react';

interface RankStrategyColumnProps {
    cycle: SummaryGroup;
    reportIds: string[];
    reportMap: Map<string, Report>;
    isHovered?: boolean;
    onHover?: () => void;
    onLeave?: () => void;
    onClick?: () => void;
}

export function RankStrategyColumn({
    cycle,
    reportIds,
    reportMap,
    isHovered,
    onHover,
    onLeave,
    onClick
}: RankStrategyColumnProps) {
    const isLocked = ['Final', 'Submitted', 'Complete', 'Review'].includes(cycle.status || '');

    // Droppable should also be disabled if locked? 
    // If I restrict Sortable items from being dragged, that's enough.
    // But I should also prevent items from being DROPPED here from other columns?
    // User didn't ask for cross-column drag (yet), but if they do, we should block it.
    // For now, blocking the items is key.
    const { setNodeRef } = useDroppable({
        id: cycle.id,
        disabled: isLocked
    });

    const isProjected = !isLocked && (cycle.status === 'Draft' || cycle.status === 'Planned');
    const activeCount = reportIds.length;

    // Calculate Column Stats
    // Assuming reportMap has the latest optimized scores
    const currentAvg = reportIds.reduce((sum, id) => {
        const r = reportMap.get(id);
        return sum + (r?.traitAverage || 0);
    }, 0) / (activeCount || 1);

    const target = cycle.metricConfig?.targetRsca || 0;
    const isOverTarget = target > 0 && currentAvg > target;

    return (
        <div ref={setNodeRef} className="flex-none w-[240px] flex flex-col border-r border-slate-200 bg-slate-50/30">
            {/* Header */}
            <div
                className={`
                    flex-none p-3 border-b border-slate-200 sticky top-0 z-20 shadow-sm transition-all duration-200 cursor-pointer
                    ${isHovered
                        ? 'bg-indigo-50 border-indigo-400 ring-inset ring-2 ring-indigo-400'
                        : 'bg-white hover:bg-slate-50'
                    }
                `}
                onMouseEnter={onHover}
                onMouseLeave={onLeave}
                onClick={onClick}
            >
                <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${isHovered ? 'text-indigo-700' : 'text-slate-500'}`}>
                        <Calendar className={`w-3 h-3 ${isHovered ? 'text-indigo-500' : 'text-slate-400'}`} />
                        {format(new Date(cycle.periodEndDate), 'MMM yyyy')}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isProjected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                        {cycle.status || 'Draft'}
                    </span>
                </div>

                {/* Stats */}
                <div className="flex items-end justify-between mt-2">
                    <div>
                        <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Proj. RSCA</div>
                        <div className={`text-lg font-bold font-mono leading-none ${isOverTarget ? 'text-red-500' : 'text-emerald-600'}`}>
                            {currentAvg.toFixed(2)}
                        </div>
                    </div>
                    {target > 0 && (
                        <div className="text-right">
                            <div className="text-[10px] text-slate-400 font-semibold mb-0.5 flex items-center justify-end gap-1">
                                <Target className="w-3 h-3" />
                                Target
                            </div>
                            <div className="text-sm font-bold text-slate-600 font-mono">
                                {target.toFixed(2)}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* List - No internal scroll, allow parent to scroll */}
            <div className="flex-1 p-2 pb-[200px]">
                <SortableContext id={cycle.id} items={reportIds} strategy={verticalListSortingStrategy}>
                    {reportIds.map((id, index) => {
                        const report = reportMap.get(id);
                        if (!report) return null;

                        return (
                            <MemberCard
                                key={id}
                                id={id}
                                name={report.memberName}
                                rank={index + 1}
                                score={report.traitAverage}
                                disabled={isLocked}
                            />
                        );
                    })}
                </SortableContext>

                {reportIds.length === 0 && (
                    <div className="h-24 flex items-center justify-center text-slate-400 text-xs italic">
                        No members assigned
                    </div>
                )}
            </div>
        </div>
    );
}
