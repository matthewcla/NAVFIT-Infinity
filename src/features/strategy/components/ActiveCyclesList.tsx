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
    const {
        setDraggingItemType,
        deleteSummaryGroup,
        deleteReport,
        draggingItemType,
        cycleSort,
        summaryGroups,
        setCycleSort,
        cycleListPhase,
        setCycleListPhase
    } = useNavfitStore();

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
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

    // Helper: Report Type
    const getReportType = (name: string): string => {
        const n = name.toLowerCase();
        if (n.includes('periodic')) return 'Periodic';
        if (n.includes('detachment of rs') || n.includes('det. of rs') || n.includes('dors')) return 'RS Det.';
        if (n.includes('detachment of individual') || n.includes('doi')) return 'Ind Det.';
        if (n.includes('special')) return 'Special';
        if (n.includes('detachment')) return 'Ind Det.'; // Default detachment 
        return 'Periodic'; // Default
    };

    // Search Logic
    const filteredGroups = useMemo(() => {
        if (!searchTerm) return groups;

        const lowerTerm = searchTerm.toLowerCase();

        return groups.filter(g => {
            // 1. Group Name
            if (g.name.toLowerCase().includes(lowerTerm)) return true;

            // 2. Report Type
            if (getReportType(g.name).toLowerCase().includes(lowerTerm)) return true;

            // 3. End Date (Month Year)
            const dateStr = new Date(g.periodEndDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase();
            if (dateStr.includes(lowerTerm)) return true;

            // 4. Member Names
            const hasMember = g.reports.some(r => r.memberName.toLowerCase().includes(lowerTerm));
            if (hasMember) return true;

            return false;
        });
    }, [groups, searchTerm]);

    // Grouping Logic Dynamic (uses filteredGroups)
    const groupedMap = useMemo(() => {
        const map = new Map<string, SummaryGroup[]>();
        filteredGroups.forEach(g => {
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
    }, [filteredGroups, cycleSort]); // Changed logic to use filteredGroups

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
            <div className="px-6 pb-2 pt-2 bg-slate-50 border-b border-slate-100 flex flex-col gap-3 sticky top-0 z-20">
                {/* 1. Search Bar (Top) */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search cycles, members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium shadow-sm"
                    />
                </div>

                {/* 2. Phase Toggles (Middle - Swapped In) */}
                <div className="flex p-1 bg-slate-100 rounded-lg">
                    {['Active', 'Planned', 'Archive'].map((phase) => (
                        <button
                            key={phase}
                            onClick={() => setCycleListPhase(phase as 'Active' | 'Planned' | 'Archive')}
                            className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${cycleListPhase === phase
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {phase}
                        </button>
                    ))}
                </div>

                {/* 3. Controls Row: Sort | Expand */}
                <div className="flex items-center justify-between pt-1">
                    {/* Sort Toggle (Left Edge) */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline-block">
                            Sort
                        </span>
                        <button
                            onClick={() => setCycleSort(cycleSort === 'DueDate' ? 'Status' : 'DueDate')}
                            className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600 uppercase tracking-wider hover:border-slate-300 hover:text-slate-800 transition-colors shadow-sm"
                        >
                            {cycleSort === 'DueDate' ? 'Due' : 'Status'}
                        </button>
                    </div>

                    {/* Expand/Collapse (Right Edge) */}
                    <div className="flex gap-2 text-[10px] font-medium text-slate-500">
                        <button onClick={handleExpandAll} className="hover:text-indigo-600 transition-colors">Expand</button>
                        <button onClick={handleCollapseAll} className="hover:text-indigo-600 transition-colors">Collapse</button>
                    </div>
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
                    <div className="space-y-6 pt-2">
                        {sortedKeys.map(key => {
                            const subGroups = groupedMap.get(key) || [];
                            const isCollapsed = collapsedGroups[key] || false;

                            if (subGroups.length === 0) return null;

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
                                                            reportType={getReportType(group.name)}
                                                            isSelected={selectedGroupId === group.id}
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
