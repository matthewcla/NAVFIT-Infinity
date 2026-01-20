import { useMemo, useState } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import {
    DndContext,
    DragOverlay,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { Report } from '@/types';
import { RankStrategyColumn } from '@/features/strategy/components/RankStrategyColumn';
import { createPortal } from 'react-dom';
import { MemberCard } from '@/features/strategy/components/MemberCard';

interface RankStrategyMatrixProps {
    groupKey: string;
    hoveredGroupId?: string | null;
    onGroupHover?: (groupId: string | null) => void;
    onGroupClick?: (groupId: string) => void;
}

export function RankStrategyMatrix({ groupKey, hoveredGroupId, onGroupHover, onGroupClick }: RankStrategyMatrixProps) {
    const { summaryGroups, reorderMembers } = useNavfitStore();

    // 1. Filter and Sort Groups (Chronological)
    const cycles = useMemo(() => {
        return summaryGroups
            .filter(g => (g.competitiveGroupKey || 'Uncategorized') === groupKey)
            .sort((a, b) => new Date(a.periodEndDate).getTime() - new Date(b.periodEndDate).getTime());
    }, [summaryGroups, groupKey]);

    // 2. Build Helper Maps
    const reportMap = useMemo(() => {
        const map = new Map<string, Report>();
        cycles.forEach(g => {
            g.reports.forEach(r => {
                map.set(r.id, r);
            });
        });
        return map;
    }, [cycles]);

    // 3. Prepare Ordered Data Structure: Map<CycleId, ReportId[]>
    const matrixData = useMemo(() => {
        const data: Record<string, string[]> = {};

        cycles.forEach(g => {
            // If the group has 'hasManualOrder' flag, rely on array order of reports or strictly on rankOrder if available?
            // The store's 'reorderMembers' updates 'reports' array order directly in local state.
            // So we can just trust g.reports order unless rankOrder is explicitly managing it separately.
            // Given the store logic: "updatedReports = ... assignRecommendationsByRank ...", the reports array IS the rank order.

            data[g.id] = g.reports.map(r => r.id);
        });
        return data;
    }, [cycles]);

    // DnD State
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeReport, setActiveReport] = useState<Report | undefined>(undefined);
    const [activeCycleId, setActiveCycleId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const id = active.id as string;
        setActiveId(id);
        setActiveReport(reportMap.get(id));

        // Find which column (cycle) this belongs to
        const cycleId = active.data.current?.sortable.containerId;
        setActiveCycleId(cycleId);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            // Identify container (Cycle)
            // Note: dnd-kit context in Column sets containerId to cycle.id
            const containerId = active.data.current?.sortable?.containerId || activeCycleId;

            if (containerId) {
                const currentOrder = matrixData[containerId] || [];
                const oldIndex = currentOrder.indexOf(active.id as string);
                const newIndex = currentOrder.indexOf(over.id as string);

                if (oldIndex !== -1 && newIndex !== -1) {
                    // Optimistic UI Update (optional, if store is slow)
                    // Call Store Action
                    const newOrder = arrayMove(currentOrder, oldIndex, newIndex);

                    // Call reorderMembers with the NEW ORDER IDs
                    reorderMembers(containerId, active.id as string, newOrder);
                }
            }
        }

        setActiveId(null);
        setActiveReport(undefined);
        setActiveCycleId(null);
    };

    if (cycles.length === 0) return null;

    // Determine max ranks for the left column
    const maxRanks = Math.max(...Object.values(matrixData).map(l => l.length), 0);
    // Add buffer for empty slots if desired, or fit to content.
    // We will just render exactly what is needed + buffer.
    const rankMarkers = Array.from({ length: maxRanks + 5 }); // +5 Buffer

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex bg-slate-50/50 rounded-xl border border-slate-200 overflow-auto h-[600px] relative items-start">

                {/* 1. Rank Anchor Column (Left) */}
                <div className="flex-none w-10 bg-white border-r border-slate-200 z-30 sticky left-0 flex flex-col h-full min-h-min">

                    {/* Sticky Header Block for Left Column (Covers moving content when scrolling X, matches Right Header Height when scrolling Y?) 
                        Actually, this block is sticky top-0 inside the sticky-left column.
                        It needs to be height of the Right Headers (~88px).
                    */}
                    <div className="sticky top-0 bg-white z-40 h-[89px] border-b border-slate-200 flex items-end justify-center pb-2 shadow-sm">
                        <span className="text-[10px] font-bold text-slate-300">#</span>
                    </div>

                    {rankMarkers.map((_, i) => (
                        // Height must match MemberCard height + margin (~68px approx based on card + mb-2)
                        // MemberCard: p-2.5 (10px*2) + content (~40px?) + mb-2 (8px). Total ~68px.
                        // Let's force a consistent grid height or trust alignment?
                        // Trusting alignment across columns is risky if cards have variable content height.
                        // MemberCard has fixed-ish height.
                        // For now, let's just render. The Left Column will scroll with the Right Columns.
                        <div key={i} className="h-[74px] flex items-center justify-center text-xs font-bold text-slate-300 border-b border-transparent">
                            #{i + 1}
                        </div>
                    ))}
                    {/* Spacer at bottom */}
                    <div className="h-[200px]"></div>
                </div>

                {/* 2. Cycle Columns */}
                {cycles.map(cycle => (
                    <RankStrategyColumn
                        key={cycle.id}
                        cycle={cycle}
                        reportIds={matrixData[cycle.id] || []}
                        reportMap={reportMap}
                        isHovered={hoveredGroupId === cycle.id}
                        onHover={onGroupHover ? () => onGroupHover(cycle.id) : undefined}
                        onLeave={onGroupHover ? () => onGroupHover(null) : undefined}
                        onClick={onGroupClick ? () => onGroupClick(cycle.id) : undefined}
                    />
                ))}
            </div>

            {createPortal(
                <DragOverlay>
                    {activeId && activeReport ? (
                        <MemberCard
                            id={activeId}
                            name={activeReport.memberName}
                            rank={0} // Placeholder
                            score={activeReport.traitAverage}
                            overlay
                        />
                    ) : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
}
