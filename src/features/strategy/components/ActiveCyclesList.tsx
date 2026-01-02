import { useState, useMemo } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
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
    const { setDraggingItemType, deleteSummaryGroup, deleteReport, draggingItemType } = useNavfitStore();
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
    // We can rely on global draggingItemType now, but StrategyGroupCard still sets isDraggingGroup local via setIsDraggingGroup.
    // Ideally StrategyGroupCard should just set global store. But for now we sync or just ignore the local isDraggingGroup for the "Show Trash" logic if global is available?
    // Actually, StrategyGroupCard calls `setDraggingItemType('summary_group')` in onDragStart. So we can rely on that.
    // But we need to keep `setIsDraggingGroup` for the local state if it's used elsewhere? It is used to set `isDraggingGroup` state but that state is ONLY used for showing the trash can.
    // So we can remove the local `isDraggingGroup` state entirely and use `draggingItemType`.

    const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
    const [reportToDelete, setReportToDelete] = useState<{ groupId: string; reportId: string } | null>(null);

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
            {/* Scrollable List Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 px-0">
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
                                        className="flex items-center gap-2 pl-2 w-full hover:bg-slate-100 p-1 rounded transition-colors group sticky top-0 z-10 bg-slate-50 backdrop-blur-sm shadow-sm"
                                    >
                                        <ChevronRight
                                            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${!isCollapsed ? 'rotate-90' : ''}`}
                                        />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-700">
                                            {key}
                                        </span>
                                        <span className="text-xs text-slate-400 ml-auto font-medium">
                                            {subGroups.length} Summary Groups
                                        </span>
                                    </button>

                                    {/* Cards */}
                                    {
                                        !isCollapsed && (
                                            <div className="grid gap-2.5">
                                                {subGroups.map(group => {
                                                    const rscaImpact = 0.00;
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
                        <div className="animate-in fade-in zoom-in duration-200">
                            <TrashDropZone
                                acceptTypes={['summary_group', 'member_report']}
                                caption="Drop to Delete"
                                onDrop={(data) => {
                                    if (typeof data === 'string') {
                                        // It's a group ID (from summary_group drop)
                                        setGroupToDelete(data);
                                    } else if (data && data.reportId && data.groupId) {
                                        // It's a report object (from member_report drop)
                                        setReportToDelete({ groupId: data.groupId, reportId: data.reportId });
                                    }
                                }}
                                className="h-14 w-auto px-6 rounded-full bg-red-100 border-2 border-red-400 text-red-600 shadow-xl flex items-center justify-center hover:scale-105 hover:bg-red-200 transition-all"
                            />
                        </div>
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
