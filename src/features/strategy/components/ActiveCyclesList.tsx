import { useState, useMemo } from 'react';
import type { SummaryGroup } from '@/types';
import { StrategyGroupCard } from './StrategyGroupCard';
import { ChevronRight, Filter } from 'lucide-react';

interface ActiveCyclesListProps {
    groups: SummaryGroup[];
    onSelect: (group: SummaryGroup) => void;
    selectedGroupId?: string | null;
}

export function ActiveCyclesList({ groups, onSelect, selectedGroupId }: ActiveCyclesListProps) {
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    // Group by Competitive Group Key
    const groupedMap = useMemo(() => {
        const map = new Map<string, SummaryGroup[]>();
        groups.forEach(g => {
            const key = g.competitiveGroupKey || 'Uncategorized';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(g);
        });
        return map;
    }, [groups]);

    const sortedKeys = Array.from(groupedMap.keys()).sort();

    const toggleGroup = (key: string) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };



    if (groups.length === 0) {
        return (
            <div className="text-center py-12 px-4 text-slate-400">
                <Filter className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No cycles found.</p>


            </div>
        );
    }

    return (
        <div className="relative pb-24 pt-4 min-h-full">
            <div className="space-y-6">
                {sortedKeys.map(key => {
                    const subGroups = groupedMap.get(key) || [];
                    const isCollapsed = collapsedGroups[key] || false; // Default to expanded (false)

                    return (
                        <div key={key} className="flex flex-col gap-3 px-4">
                            <button
                                onClick={() => toggleGroup(key)}
                                className="flex items-center gap-2 pl-2 w-full hover:bg-slate-100 p-1 rounded transition-colors group sticky top-0 z-10 bg-slate-50 backdrop-blur-sm shadow-sm"
                            >
                                <ChevronRight
                                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${!isCollapsed ? 'rotate-90' : ''}`}
                                />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-700">
                                    {key}
                                </span>
                                <span className="text-xs text-slate-400 ml-auto font-medium">
                                    {subGroups.length} Cycles
                                </span>
                            </button>

                            {/* Cards */}
                            {
                                !isCollapsed && (
                                    <div className="grid gap-2.5 pl-2 border-l-2 border-slate-100 ml-2.5">
                                        {subGroups.map(group => {
                                            // Simple calculation for display (replace with real store/hook data later)
                                            const rscaImpact = 0.00; // Placeholder as confirmed
                                            const memberCount = group.reports.length;
                                            // Determine status based on dates (simplified logic)
                                            const now = new Date();
                                            const endDate = new Date(group.periodEndDate);
                                            let status: 'Upcoming' | 'Active' | 'Overdue' | 'Complete' = 'Active';

                                            if (['Submitted', 'Final', 'Complete'].includes(group.status || '')) {
                                                status = 'Complete';
                                            } else if (endDate < now) {
                                                status = 'Overdue';
                                            }

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
                                )
                            }
                        </div>
                    );
                })}
            </div>



        </div >
    );
}
