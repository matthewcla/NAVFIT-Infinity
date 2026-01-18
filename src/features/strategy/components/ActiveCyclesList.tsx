import { useState, useMemo } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import type { SummaryGroup } from '@/types';
import { StrategyGroupCard } from './StrategyGroupCard';
import { ChevronRight, Filter, Plus, Calendar, Layers, Search } from 'lucide-react';
import { TrashDropZone } from '@/features/dashboard/components/TrashDropZone';
import { ConfirmationModal } from '@/features/dashboard/components/ConfirmationModal';
import { calculateImpact, getReportType } from '@/features/strategy/logic/cycleHelpers';

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
    }, [filteredGroups, cycleSort]);

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
        <div className="relative h-full flex flex-col bg-slate-50/50">

            {/* Header / Controls */}
            <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md border-b border-slate-200/60 pb-2 transition-all duration-200">
                {/* Row 1: Search & Tabs */}
                <div className="flex flex-col sm:flex-row items-center gap-3 px-4 pt-3 pb-2">
                    {/* Search */}
                    <div className="relative flex-1 w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search cycles..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium shadow-sm"
                        />
                    </div>

                    {/* Phase Tabs (Segmented Control style) */}
                    <div className="flex bg-slate-200/50 p-1 rounded-lg shrink-0 w-full sm:w-auto">
                        {['Active', 'Planned', 'Archive'].map((phase) => (
                            <button
                                key={phase}
                                onClick={() => setCycleListPhase(phase as 'Active' | 'Planned' | 'Archive')}
                                className={`flex-1 sm:flex-none px-3 py-1 text-[11px] font-bold uppercase tracking-wide rounded-md transition-all ${cycleListPhase === phase
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                    }`}
                            >
                                {phase}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Row 2: Secondary Controls */}
                <div className="flex items-center justify-between px-4 pb-1">
                    {/* Sort Toggle */}
                    <button
                        onClick={() => setCycleSort(cycleSort === 'DueDate' ? 'Status' : 'DueDate')}
                        className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    >
                        {cycleSort === 'DueDate' ? <Calendar className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                        <span>Sorted by {cycleSort === 'DueDate' ? 'Date' : 'Status'}</span>
                    </button>

                    {/* Expand/Collapse */}
                    <div className="flex gap-3 text-[10px] font-medium text-slate-400">
                        <button onClick={handleExpandAll} className="hover:text-indigo-600 transition-colors">Expand All</button>
                        <span className="text-slate-300">|</span>
                        <button onClick={handleCollapseAll} className="hover:text-indigo-600 transition-colors">Collapse All</button>
                    </div>
                </div>
            </div>

            {/* Scrollable List Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 px-0 [scrollbar-gutter:stable]">
                {groups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-slate-400">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <Filter className="w-8 h-8 opacity-20 text-slate-500" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-600">No active cycles</h3>
                        <p className="text-xs text-slate-400 mt-1">Try adjusting filters or create a new group.</p>
                    </div>
                ) : (
                    <div className="space-y-6 pt-4">
                        {sortedKeys.map(key => {
                            const subGroups = groupedMap.get(key) || [];
                            const isCollapsed = collapsedGroups[key] || false;

                            if (subGroups.length === 0) return null;

                            return (
                                <div key={key} className="flex flex-col gap-2 px-4 transition-all duration-300">
                                    <button
                                        onClick={() => toggleGroup(key)}
                                        className="flex items-center gap-2 pl-2 w-full hover:bg-white p-1.5 rounded-lg transition-all group sticky top-0 z-10"
                                    >
                                        <div className={`p-0.5 rounded-md transition-colors ${!isCollapsed ? 'bg-indigo-50 text-indigo-600' : 'text-slate-300 group-hover:text-slate-400'}`}>
                                            <ChevronRight
                                                className={`w-3.5 h-3.5 transition-transform duration-200 ${!isCollapsed ? 'rotate-90' : ''}`}
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">
                                            {key}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 ml-auto bg-slate-100 px-2 py-0.5 rounded-full group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            {subGroups.length}
                                        </span>
                                    </button>

                                    {/* Cards */}
                                    {
                                        !isCollapsed && (
                                            <div className="grid gap-3 pl-2 border-l-2 border-slate-100 ml-3">
                                                {subGroups.map(group => {
                                                    const rscaImpact = calculateImpact(group, summaryGroups);
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
                                className="group bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 rounded-full h-14 w-14 hover:w-48 transition-all duration-300 ease-in-out overflow-hidden flex items-center"
                            >
                                <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <span className="whitespace-nowrap font-bold pr-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75 text-sm">
                                    New Summary Group
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
