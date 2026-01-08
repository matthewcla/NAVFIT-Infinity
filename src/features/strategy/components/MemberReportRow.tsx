import { useRef, useState } from 'react';
import { PromotionBadge } from './PromotionBadge';
import { GripVertical, Lock, Unlock, Trash2 } from 'lucide-react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { cn } from '@/lib/utils';
import type { RankedMember } from './CycleMemberList';

interface MemberReportRowProps {
    id: string;
    reportId: string;
    groupId: string;
    index: number;
    name: string;
    designator: string;
    reportsRemaining?: number;
    promRec: string;
    mta: number;
    delta: number;
    rscaMargin: number;
    eotMta?: number;
    isSelected: boolean;
    onClick: () => void;

    // Reordering Props
    draggedReportId?: string | null;
    localOrderedMembers?: RankedMember[] | null;
    setLocalOrderedMembers?: (members: RankedMember[] | null) => void;
    setDraggedReportId?: (id: string | null) => void;
    setDraggingItemType?: (type: string | null) => void;
    rankedMembers?: RankedMember[];
    onReorderMembers?: (groupId: string, reportId: string, newOrderIds: string[]) => void;
}

export function MemberReportRow({
    reportId,
    groupId,
    index,
    name,
    designator,
    reportsRemaining,
    promRec,
    mta,
    delta,
    rscaMargin,
    eotMta,
    isSelected,
    onClick,

    draggedReportId,
    localOrderedMembers,
    setLocalOrderedMembers,
    setDraggedReportId,
    setDraggingItemType,
    rankedMembers,
    onReorderMembers
}: MemberReportRowProps) {
    const [isDragging, setIsDragging] = useState(false);
    const { toggleReportLock, summaryGroups, selectMember, deleteReport } = useNavfitStore();
    const isLocked = summaryGroups.find(g => g.id === groupId)?.reports.find(r => r.id === reportId)?.isLocked;



    const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>) => {
        // 1. Check if Locked
        if (isLocked) {
            e.preventDefault();
            return;
        }

        // 2. Verified Drag Handle Check
        const target = e.target as HTMLElement;
        // The event target might be the icon inside the div, so we check closest
        // But actually dragstart fires on the TR, so target is the element being dragged...
        // Wait, native HTML5 drag and drop is tricky with specific handles on a draggable parent.
        // We generally check the "active element" or use a ref, but `onMouseDown` is reliable to set a flag.

        // We will rely on checking if the drag behavior is what we want.
        // Actually, best practice for "Grip Only" drag in a table row:
        // Check e.target in onDragStart? No, e.target is the TR.
        // We use state set by onMouseDown. But I removed the ref. Let's add it back simply.
    };

    // Simpler Re-implementation for Grip Only:
    // We can just keep the TR draggable, but in onDragStart, check if we decided it's a valid drag.
    // Or simpler: Only make the drag handle draggable?
    // No, standard is row drag.

    // Let's use the standard pattern:
    // We only want the GRIP to initiate dragging.
    // A common way is to make the Grip `draggable="true"` and the TR `draggable="false"`, but then we drag the Grip element, not the TR ghost.
    // To get the TR ghost, we need the TR to be draggable.
    // So we use the "dragTypeRef" pattern again, or simply checks.

    // Let's restore a simple ref for "isGripDrag".
    const isGripDrag = useRef(false);

    const onMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-drag-handle="true"]')) {
            isGripDrag.current = true;
        } else {
            isGripDrag.current = false;
        }
    };

    const onDragStart = (e: React.DragEvent<HTMLTableRowElement>) => {
        if (isLocked || !isGripDrag.current) {
            e.preventDefault();
            return;
        }

        // REORDER MODE
        if (!onReorderMembers || !setLocalOrderedMembers || !setDraggedReportId || !rankedMembers) {
            e.preventDefault();
            return;
        }

        // Close Sidebar
        selectMember(null);

        // Initialize Local State
        setLocalOrderedMembers(rankedMembers);
        setDraggedReportId(reportId);
        if (setDraggingItemType) setDraggingItemType('reorder');

        e.dataTransfer.setData('text/plain', reportId);
        e.dataTransfer.effectAllowed = 'move';
        setIsDragging(true);
    };

    const onDragEnd = () => {
        setIsDragging(false);
        if (setDraggedReportId) setDraggedReportId(null);
        if (setLocalOrderedMembers) setLocalOrderedMembers(null);
        if (setDraggingItemType) setDraggingItemType(null);
        isGripDrag.current = false;
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        // Only handle reordering logic if valid state
        if (!draggedReportId || !localOrderedMembers || !setLocalOrderedMembers) return;

        e.dataTransfer.dropEffect = 'move';

        const draggedIndex = localOrderedMembers.findIndex(m => m.reportId === draggedReportId);
        const hoverIndex = index;

        if (draggedIndex === -1 || draggedIndex === hoverIndex) return;

        // Perform the swap in local state
        const newOrder = [...localOrderedMembers];
        const [reorderedItem] = newOrder.splice(draggedIndex, 1);
        newOrder.splice(hoverIndex, 0, reorderedItem);

        setLocalOrderedMembers(newOrder);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedReportId && localOrderedMembers && onReorderMembers) {
            const finalOrderIds = localOrderedMembers.map(m => m.reportId);
            onReorderMembers(groupId, draggedReportId, finalOrderIds);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to remove this report from the cycle?")) {
            deleteReport(groupId, reportId);
        }
    };

    return (
        <tr
            draggable={!isLocked}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onMouseDown={onMouseDown}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={onClick}
            className={`
                cursor-pointer transition-colors hover:bg-slate-50 relative group
                ${isSelected ? 'bg-indigo-50/50' : ''}
                ${isDragging ? 'opacity-40 grayscale' : ''}
                ${draggedReportId === reportId ? 'opacity-20 bg-slate-100' : ''} 
            `}
        >
            {/* 1. Drag Handle Column */}
            <td className="w-10 px-0 py-3 text-center align-middle touch-none relative">
                {isLocked ? (
                    <div className="flex items-center justify-center p-1 text-slate-300">
                        <Lock className="w-3.5 h-3.5" />
                    </div>
                ) : (
                    <div
                        data-drag-handle="true"
                        className="drag-grip flex items-center justify-center p-1 rounded transition-colors cursor-grab hover:bg-slate-200/50 text-slate-400 group-hover:text-slate-600 active:cursor-grabbing"
                    >
                        <GripVertical className="w-4 h-4 pointer-events-none" />
                    </div>
                )}
            </td>

            {/* 2. Rank Index */}
            <td className="px-4 py-3 text-center text-sm text-slate-500 font-medium relative w-12">
                {index + 1}
            </td>

            {/* 3. Lock Toggle Column */}
            <td className="w-8 px-0 py-3 text-center align-middle">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleReportLock(groupId, reportId);
                    }}
                    className={cn(
                        "flex items-center justify-center p-1 rounded transition-colors mx-auto",
                        isLocked
                            ? "text-red-500 hover:bg-red-50"
                            : "text-slate-300 hover:text-slate-500 hover:bg-slate-100 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    )}
                    title={isLocked ? "Unlock Rank" : "Lock Rank"}
                >
                    {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
            </td>

            <td className="px-4 py-3 text-sm font-semibold text-slate-700 text-left w-[30%]">{name}</td>
            <td className="px-4 py-3 text-sm text-slate-500 text-center w-24">{designator}</td>
            <td className="px-4 py-3 text-sm text-slate-700 font-mono text-center w-16">
                {reportsRemaining !== undefined ? reportsRemaining : '-'}
            </td>
            <td className="px-4 py-3 text-sm text-center w-16">
                <PromotionBadge recommendation={promRec} size="xs" className="rounded-sm px-1.5" />
            </td>
            <td className="px-4 py-3 text-sm font-mono text-slate-700 text-center w-20">{promRec === 'NOB' ? '-' : mta.toFixed(2)}</td>
            <td className="px-4 py-3 text-sm font-mono text-slate-400 text-center w-20">
                {delta === 0 ? '-' : (delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2))}
            </td>
            <td className={`px-4 py-3 text-sm font-mono text-center font-medium w-20 ${rscaMargin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {rscaMargin > 0 ? '+' : ''}{rscaMargin.toFixed(2)}
            </td>
            <td className="px-4 py-3 text-sm font-mono text-slate-400 text-center w-20">
                {eotMta ? eotMta.toFixed(2) : '-'}
            </td>

            {/* Trash Button */}
            <td className="w-10 px-0 py-3 text-center align-middle">
                <button
                    onClick={handleDelete}
                    className="flex items-center justify-center p-1.5 rounded transition-colors mx-auto text-slate-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Remove Report"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </td>
        </tr>
    );
}
