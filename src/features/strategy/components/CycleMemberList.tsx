import { useCallback, useState, useMemo } from 'react';
import { Sparkles, Check, X, Lock, Unlock } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableMemberRow } from '@/features/strategy/components/SortableMemberRow';
import { useNavfitStore } from '@/store/useNavfitStore';
import type { Report } from '@/types';


export interface RankedMember {
    id: string;
    reportId: string;
    name: string;
    rank: string;
    designator: string;
    promRec: string;
    mta: number;
    delta: number;
    rscaMargin: number;
    eotMta?: number;
    reportsRemaining: number | undefined;
    report: Report;
}

interface CycleMemberListProps {
    isEnlisted: boolean;
    rankedMembers: RankedMember[];
    previewMtaRankMap?: Map<string, number>; // Real-time rank preview based on MTA
    previewPromRecMap?: Map<string, string>; // Real-time promotion recommendation preview
    activeGroupId: string;
    selectedMemberId: string | null;
    onSelectMember: (id: string | null) => void;
    onReorderMembers: (groupId: string, reportId: string, newOrderIds: string[]) => void;

    // Optimization Controls
    onOptimize?: () => void;
    onAcceptOptimization?: () => void;
    onCancelOptimization?: () => void;
    isOptimizing?: boolean;
    hasProposedReports?: boolean;
}

export function CycleMemberList({
    isEnlisted,
    rankedMembers,
    previewMtaRankMap,
    previewPromRecMap,
    activeGroupId,
    selectedMemberId,
    onSelectMember,
    onReorderMembers,
    onOptimize,
    onAcceptOptimization,
    onCancelOptimization,
    isOptimizing = false,
    hasProposedReports = false
}: CycleMemberListProps) {

    const { toggleReportLock, setGroupLockState, selectMember } = useNavfitStore();

    // @dnd-kit Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Prevent accidental drags
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Determine Lock All State
    const areAllLocked = rankedMembers.length > 0 && rankedMembers.every(m => m.report.isLocked);

    const handleToggleAllLocks = () => {
        const targetState = !areAllLocked;
        const valueMap: Record<string, number> = {};
        if (targetState) {
            rankedMembers.forEach(m => {
                valueMap[m.reportId] = m.mta;
            });
        }
        setGroupLockState(activeGroupId, targetState, valueMap);
    };

    const handleRowToggleLock = useCallback((groupId: string, reportId: string) => {
        const member = rankedMembers.find(m => m.reportId === reportId);
        toggleReportLock(groupId, reportId, member?.mta);
    }, [rankedMembers, toggleReportLock]);

    // State for tracking drag position (for live rank preview)
    const [activeId, setActiveId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);

    // @dnd-kit onDragStart: Track which item is being dragged
    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    }, []);

    // @dnd-kit onDragOver: Track which item we're hovering over
    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { over } = event;
        setOverId(over ? (over.id as string) : null);
    }, []);

    // @dnd-kit onDragEnd: Compute final order and call onReorderMembers
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        // Clear drag state
        setActiveId(null);
        setOverId(null);

        if (!over || active.id === over.id) return;
        if (hasProposedReports) return; // Block during optimization review

        // Close sidebar on drag
        selectMember(null);

        const oldIndex = rankedMembers.findIndex(m => m.reportId === active.id);
        const newIndex = rankedMembers.findIndex(m => m.reportId === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        // Create new order by moving the item
        const newOrder = [...rankedMembers];
        const [movedItem] = newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, movedItem);

        const newOrderIds = newOrder.map(m => m.reportId);
        onReorderMembers(activeGroupId, active.id as string, newOrderIds);
    }, [rankedMembers, activeGroupId, onReorderMembers, hasProposedReports, selectMember]);

    // Compute preview ranks during drag, or use MTA-based ranks during slider preview
    const previewRankMap = useMemo(() => {
        const rankMap = new Map<string, number>();

        if (activeId && overId && activeId !== overId) {
            // Drag preview takes priority - compute based on drag position
            const oldIndex = rankedMembers.findIndex(m => m.reportId === activeId);
            const newIndex = rankedMembers.findIndex(m => m.reportId === overId);

            if (oldIndex !== -1 && newIndex !== -1) {
                const previewOrder = [...rankedMembers];
                const [movedItem] = previewOrder.splice(oldIndex, 1);
                previewOrder.splice(newIndex, 0, movedItem);

                previewOrder.forEach((member, idx) => {
                    rankMap.set(member.reportId, idx + 1);
                });
                return rankMap;
            }
        }

        // When not dragging: use MTA-based rank preview if available (for slider updates)
        if (previewMtaRankMap && previewMtaRankMap.size > 0) {
            return previewMtaRankMap;
        }

        // Fallback: use current storage order
        rankedMembers.forEach((member, idx) => {
            rankMap.set(member.reportId, idx + 1);
        });
        return rankMap;
    }, [rankedMembers, activeId, overId, previewMtaRankMap]);

    // Get sortable IDs - exclude locked items from sortable context
    const sortableIds = rankedMembers
        .filter(m => !m.report.isLocked)
        .map(m => m.reportId);

    return (
        <div className="flex-1 overflow-y-auto">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <table className="w-full text-left border-collapse">
                    <thead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <tr>
                            <th className="sticky top-0 z-20 bg-white w-12 px-0 py-3 border-b border-slate-200 text-center shadow-sm"></th> {/* Drag Handle */}
                            <th className="sticky top-0 z-20 bg-white w-12 px-0 py-3 border-b border-slate-200 text-center relative group/header shadow-sm">
                                <button
                                    onClick={handleToggleAllLocks}
                                    className={`flex items-center justify-center p-1 rounded transition-colors mx-auto ${areAllLocked
                                        ? "text-red-500 hover:bg-red-50"
                                        : "text-slate-300 hover:text-slate-500 hover:bg-slate-100"
                                        }`}
                                    title={areAllLocked ? "Unlock All Reports" : "Lock All Reports"}
                                >
                                    {areAllLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                </button>
                            </th>
                            <th className="sticky top-0 z-20 bg-white w-12 px-0 py-3 border-b border-slate-200 text-center shadow-sm">#</th>
                            <th className="sticky top-0 z-20 bg-white px-4 py-3 border-b border-slate-200 text-left w-[25%] shadow-sm">Name</th>
                            <th className="sticky top-0 z-20 bg-white px-4 py-3 border-b border-slate-200 text-center w-24 shadow-sm">
                                {isEnlisted ? 'Rate/Rank' : 'Desig'}
                            </th>
                            <th className="sticky top-0 z-20 bg-white px-4 py-3 border-b border-slate-200 text-center w-16 shadow-sm" title="Projected reports remaining until PRD"># Rpts</th>
                            <th className="sticky top-0 z-20 bg-white px-4 py-3 border-b border-slate-200 text-center w-16 shadow-sm">Rec</th>
                            <th className="sticky top-0 z-20 bg-white px-4 py-3 border-b border-slate-200 text-center w-20 shadow-sm">MTA</th>
                            <th className="sticky top-0 z-20 bg-white px-4 py-3 border-b border-slate-200 text-center w-20 shadow-sm">Delta</th>
                            <th className="sticky top-0 z-20 bg-white px-4 py-3 border-b border-slate-200 text-center w-20 shadow-sm">Margin</th>
                            <th className="sticky top-0 z-20 bg-white px-4 py-3 border-b border-slate-200 text-center w-20 shadow-sm" title="Projected End of Tour MTA">Proj. EOT</th>
                            <th className="sticky top-0 z-20 bg-white w-12 px-0 py-3 border-b border-slate-200 text-center shadow-sm"></th> {/* Trash Button */}
                        </tr>
                    </thead>
                    <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {rankedMembers.map((member, idx) => (
                                <SortableMemberRow
                                    key={member.reportId}
                                    id={member.reportId}
                                    memberId={member.id}
                                    reportId={member.reportId}
                                    groupId={activeGroupId}
                                    index={(previewRankMap.get(member.reportId) || idx + 1) - 1}
                                    name={member.name}
                                    designator={isEnlisted ? (member.designator && member.designator !== '0000' ? member.designator : member.rank) : member.designator}
                                    reportsRemaining={member.reportsRemaining}
                                    promRec={previewPromRecMap?.get(member.reportId) || member.promRec}
                                    mta={member.mta}
                                    delta={member.delta}
                                    rscaMargin={member.rscaMargin}
                                    eotMta={member.eotMta || 0}
                                    isSelected={selectedMemberId === member.id}
                                    onClick={() => onSelectMember(selectedMemberId === member.id ? null : member.id)}
                                    isLocked={member.report.isLocked || false}
                                    onToggleLock={handleRowToggleLock}
                                    disabled={hasProposedReports}
                                />
                            ))}
                        </tbody>
                    </SortableContext>
                </table>
            </DndContext>

            {/* Floating Optimization Controls */}
            <div className="fixed bottom-40 right-4 z-50 flex flex-col gap-2 items-end">
                {hasProposedReports ? (
                    <>
                        <button
                            onClick={onAcceptOptimization}
                            className="bg-emerald-600 text-white p-2.5 rounded-full shadow-lg hover:bg-emerald-500 tooltip transition-all"
                            title="Accept Proposed Strategy"
                        >
                            <Check size={20} />
                        </button>
                        <button
                            onClick={onCancelOptimization}
                            className="bg-rose-600 text-white p-2.5 rounded-full shadow-lg hover:bg-rose-500 tooltip transition-all"
                            title="Discard Changes"
                        >
                            <X size={20} />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={onOptimize}
                        disabled={isOptimizing}
                        className={`p-2.5 rounded-full shadow-lg transition-all text-white ${isOptimizing ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                        title="Optimize MTA Distribution"
                    >
                        {isOptimizing ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Sparkles size={20} />
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
