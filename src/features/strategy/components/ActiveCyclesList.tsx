import { useState, useMemo } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { getCompetitiveGroupStats } from '@/features/strategy/logic/rsca';
import type { SummaryGroup } from '@/types';
import { StrategyGroupCard } from './StrategyGroupCard';
import { ChevronRight, Filter, Plus } from 'lucide-react';
import { TrashDropZone } from '@/features/dashboard/components/TrashDropZone';
import { ConfirmationModal } from '@/features/dashboard/components/ConfirmationModal';

interface ActiveCyclesListProps {
    groups: SummaryGroup[];
    onSelect: (group: SummaryGroup) => void;
    selectedGroupId?: string | null;
    onAddClick: () => void;
}

export function ActiveCyclesList({ groups, onSelect, selectedGroupId, onAddClick }: ActiveCyclesListProps) {
    const { setDraggingItemType, deleteSummaryGroup, deleteReport, draggingItemType, cycleSort, summaryGroups } = useNavfitStore();
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    // Helper: RSCA Impact Calculation
    const calculateImpact = (group: SummaryGroup) => {
        const rank = group.paygrade || (group.competitiveGroupKey ? group.competitiveGroupKey.split(' ')[0] : null);
        if (!rank) return 0.00;

        // Baseline: All *other* groups for this rank
        const stats = getCompetitiveGroupStats(summaryGroups, rank, group.id);
        const baselineAvg = stats.average;

        // This Group Stats
        let groupTotal = 0;
        let groupCount = 0;
        group.reports.forEach(r => {
            const mta = r.traitAverage || 0;
            if (mta > 0) {
                groupTotal += mta;
                groupCount++;
            }
        });

        if (groupCount === 0) return 0.00;

        // Projected Cumulative if this group is added
        const newTotal = stats.totalScore + groupTotal;
        const newCount = stats.count + groupCount;

        // If baseline is 0 (first group), the impact is effectively the distance from "neutral" or 0,
        // but typically we show 0 impact if it defines the average or just show deviation from 3.0?
        // Let's stick to 0.00 if it's the only group.
        if (stats.count === 0) return 0.00;

        const newAvg = newTotal / newCount;
        return newAvg - baselineAvg;
    };

    // Grouping Logic Dynamic
    const groupedMap = useMemo(() => {
        const map = new Map<string, SummaryGroup[]>();
        groups.forEach(g => {
            let key = 'Uncategorized';

            if (cycleSort === 'CompGroup') {
                key = g.competitiveGroupKey || 'Uncategorized';
            } else if (cycleSort === 'Status') {
                // Map specific statuses to broad categories if needed, or use raw status
                key = g.status || 'Draft';
            } else {
                // DueDate - Group by Month Year
                const date = new Date(g.periodEndDate);
                key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            }

            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(g);
        });
        return map;
    }, [groups, cycleSort]);

    // Sorting the Groups (Keys)
    const sortedKeys = useMemo(() => {
        const keys = Array.from(groupedMap.keys());
        if (cycleSort === 'DueDate') {
            // Sort by Date Value
            return keys.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        }
        return keys.sort(); // Alphabetical for others
    }, [groupedMap, cycleSort]);


    const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
    const [reportToDelete, setReportToDelete] = useState<{ groupId: string; reportId: string } | null>(null);


    const toggleGroup = (key: string) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleExpandAll = () => setCollapsedGroups({});
    const handleCollapseAll = () => {
        const all: Record<string, boolean> = {};
        sortedKeys.forEach(k => all[k] = true);
        setCollapsedGroups(all);
    };

    const handleConfirmDeleteGroup = () => {
        if (groupToDelete) {
            deleteSummaryGroup(groupToDelete);
            setGroupToDelete(null);
        }
    };

    const handleConfirmDeleteReport = () => {
        if (reportToDelete) {
            deleteReport(reportToDelete.groupId, reportToDelete.reportId);
            setReportToDelete(null);
        }
    };

    // Derived drag state for UI
    const showTrash = draggingItemType === 'summary_group' || draggingItemType === 'member_report';

    return (
        <div className="relative h-full flex flex-col">

            {/* Header / Controls */}
            <div className="px-6 py-3 flex justify-between items-center bg-slate-50 border-b border-slate-100 mb-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {cycleSort === 'CompGroup' ? 'Competitive Groups' : cycleSort === 'Status' ? 'By Status' : 'TIMELINE'}
                </div>
                <div className="flex gap-2 text-[10px] font-medium text-slate-500">
                    <button onClick={handleExpandAll} className="hover:text-indigo-600 transition-colors">Expand All</button>
                    <span className="text-slate-300">|</span>
                    <button onClick={handleCollapseAll} className="hover:text-indigo-600 transition-colors">Collapse All</button>
                </div>
            </div>

            {/* Scrollable List Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 px-0 [scrollbar-gutter:stable]">
                {groups.length === 0 ? (
                    <div className="text-center py-12 px-4 text-slate-400">
                        <Filter className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No summary groups found.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {sortedKeys.map(key => {
                            const subGroups = groupedMap.get(key) || [];
                            const isCollapsed = collapsedGroups[key] || false;

                            return (
                                <div key={key} className="flex flex-col gap-3 px-4">
                                    <button
                                        onClick={() => toggleGroup(key)}
                                        className="flex items-center gap-2 pl-2 w-full hover:bg-slate-100 p-1 rounded transition-colors group sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-sm border border-slate-100/50"
                                    >
                                        <ChevronRight
                                            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${!isCollapsed ? 'rotate-90' : ''}`}
                                        />
                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-widest group-hover:text-slate-800">
                                            {key}
                                        </span>
                                        <span className="text-xs text-slate-400 ml-auto font-medium bg-slate-100 px-1.5 py-0.5 rounded-full">
                                            {subGroups.length}
                                        </span>
                                    </button>

                                    {/* Cards */}
                                    {
                                        !isCollapsed && (
                                            <div className="grid gap-2.5">
                                                {subGroups.map(group => {
                                                    const rscaImpact = calculateImpact(group);
                                                    const memberCount = group.reports.length;
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
                                                            draggable={true}
                                                            onDragStart={(e) => {
                                                                setDraggingItemType('summary_group');
                                                                e.dataTransfer.setData('summary_group', group.id);
                                                            }}
                                                            onDragEnd={() => {
                                                                setDraggingItemType(null);
                                                            }}
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
                )}
            </div>

            {/* Sticky Bottom Area: FAB or Trash Zone */}
            <div className="absolute bottom-6 left-0 w-full px-6 flex justify-end pointer-events-none z-20">
                <div className="pointer-events-auto transition-all duration-300 ease-in-out">
                    {/* 
                        Logic:
                        IF dragging -> Show Trash
                        ELSE -> Show FAB.
                        Both integrated into flow to ensure exact positional swapping.
                    */}

                    {showTrash ? (
                        <TrashDropZone
                            acceptTypes={['summary_group', 'member_report']}
                            onDrop={(data) => {
                                if (typeof data === 'string') {
                                    // It's a group ID (from summary_group drop)
                                    setGroupToDelete(data);
                                } else if (data && data.reportId && data.groupId) {
                                    // It's a report object (from member_report drop)
                                    setReportToDelete({ groupId: data.groupId, reportId: data.reportId });
                                }
                            }}
                            // Remove conflicting external classes, let component handle its own shape/color
                            className=""
                        />
                    ) : (
                        <div>
                            <button
                                onClick={onAddClick}
                                className="group bg-indigo-600 text-white shadow-lg rounded-full h-14 w-14 hover:w-48 transition-all duration-300 ease-in-out overflow-hidden flex items-center"
                            >
                                <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <span className="whitespace-nowrap font-bold pr-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                                    Summary Group
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal - Group */}
            <ConfirmationModal
                isOpen={!!groupToDelete}
                onClose={() => setGroupToDelete(null)}
                onConfirm={handleConfirmDeleteGroup}
                title="Delete Summary Group?"
                description="Are you sure you want to delete this group? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />

            {/* Confirmation Modal - Report */}
            <ConfirmationModal
                isOpen={!!reportToDelete}
                onClose={() => setReportToDelete(null)}
                onConfirm={handleConfirmDeleteReport}
                title="Remove Member?"
                description="Are you sure you want to remove this member report from the group?"
                confirmText="Remove"
                variant="danger"
            />
        </div>
    );
}
