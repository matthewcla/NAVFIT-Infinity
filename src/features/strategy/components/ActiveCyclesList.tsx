// import { useMemo } from 'react'; - Removed unused import
import type { SummaryGroup } from '@/types';
import { StrategyGroupCard } from './StrategyGroupCard';
import { Layers } from 'lucide-react';

interface ActiveCyclesListProps {
    officerGroups: SummaryGroup[];
    enlistedGroups: SummaryGroup[];
    onSelect: (group: SummaryGroup) => void;
    selectedGroupId?: string | null;
}

export function ActiveCyclesList({ officerGroups, enlistedGroups, onSelect, selectedGroupId }: ActiveCyclesListProps) {

    const groupByKey = (groups: SummaryGroup[]) => {
        const map = new Map<string, SummaryGroup[]>();
        groups.forEach(g => {
            const key = g.competitiveGroupKey || 'Uncategorized';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(g);
        });
        return map;
    };

    const renderColumn = (title: string, groups: SummaryGroup[]) => {
        const groupedMap = groupByKey(groups);
        // Sort keys if needed? For now, we trust the order or just map keys
        const sortedKeys = Array.from(groupedMap.keys()).sort();

        return (
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                    <div className="bg-slate-100 p-1.5 rounded-lg">
                        <Layers className="w-4 h-4 text-slate-500" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{title}</h2>
                    <span className="ml-auto bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
                        {groups.length}
                    </span>
                </div>

                <div className="space-y-6">
                    {sortedKeys.map(key => {
                        const subGroups = groupedMap.get(key) || [];
                        return (
                            <div key={key} className="flex flex-col gap-3">
                                {/* Competitive Group Header */}
                                <div className="flex items-center gap-2 pl-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{key}</span>
                                </div>

                                {/* Cards */}
                                <div className="grid gap-3">
                                    {subGroups.map(group => {
                                        // Simple calculation for display (replace with real store/hook data later)
                                        const rscaImpact = 0.00; // Placeholder as confirmed
                                        const memberCount = group.reports.length;
                                        // Determine status based on dates (simplified logic)
                                        const now = new Date();
                                        const endDate = new Date(group.periodEndDate);
                                        let status: 'Upcoming' | 'Active' | 'Overdue' | 'Complete' = 'Active';
                                        if (endDate < now) status = 'Overdue';

                                        const dist = group.reports.reduce((acc, r) => {
                                            const rec = r.promotionRecommendation;
                                            if (rec && rec !== 'NOB') {
                                                const key = rec === 'Prog' ? 'PR' : rec;
                                                acc[key] = (acc[key] || 0) + 1;
                                            }
                                            return acc;
                                        }, {} as Record<string, number>);

                                        return (
                                            <StrategyGroupCard
                                                key={group.id}
                                                title={group.name}
                                                date={group.periodEndDate}
                                                memberCount={memberCount}
                                                status={status}
                                                workflowStatus={group.status}
                                                rscaImpact={rscaImpact}
                                                promotionStatus={group.promotionStatus}
                                                isSelected={selectedGroupId === group.id}
                                                distribution={dist}
                                                onClick={() => onSelect(group)}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                    {groups.length === 0 && (
                        <div className="text-center py-8 text-slate-400 italic text-sm border-2 border-dashed border-slate-100 rounded-xl">
                            No active cycles found.
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            {renderColumn("Officer Cycles", officerGroups)}
            {renderColumn("Enlisted Cycles", enlistedGroups)}
        </div>
    );
}
