import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Lock, Unlock, Trash2 } from 'lucide-react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { PromotionBadge } from './PromotionBadge';
import { cn } from '@/lib/utils';

interface SortableMemberRowProps {
    id: string; // Used as the sortable ID (should be reportId)
    memberId: string;
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
    isLocked: boolean;
    onToggleLock: (groupId: string, reportId: string) => void;
    disabled?: boolean; // When true, sorting is disabled (e.g., during optimization review)
}

export function SortableMemberRow({
    id,
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
    isLocked,
    onToggleLock,
    disabled = false,
}: SortableMemberRowProps) {
    const { deleteReport } = useNavfitStore();

    // @dnd-kit sortable hook - disabled for locked items
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id,
        disabled: isLocked || disabled,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: isDragging ? 'relative' as const : undefined,
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to remove this report from the cycle?")) {
            deleteReport(groupId, reportId);
        }
    };

    return (
        <tr
            ref={setNodeRef}
            style={style}
            onClick={onClick}
            className={cn(
                "cursor-pointer transition-colors hover:bg-slate-50 relative group",
                isSelected && 'bg-indigo-50/50',
                isDragging && 'bg-indigo-50 shadow-lg ring-1 ring-indigo-200 opacity-95'
            )}
        >
            {/* 1. Drag Handle Column */}
            <td className="w-12 px-0 py-3 text-center align-middle touch-none relative">
                {isLocked ? (
                    <div className="flex items-center justify-center p-1 text-slate-300">
                        <Lock className="w-3.5 h-3.5" />
                    </div>
                ) : (
                    <div
                        {...attributes}
                        {...listeners}
                        className={cn(
                            "drag-grip flex items-center justify-center p-1 rounded transition-colors text-slate-400 group-hover:text-slate-600",
                            !disabled && "cursor-grab hover:bg-slate-200/50 active:cursor-grabbing",
                            disabled && "cursor-not-allowed opacity-50"
                        )}
                    >
                        <GripVertical className="w-4 h-4" />
                    </div>
                )}
            </td>

            {/* 2. Lock Toggle Column */}
            <td className="w-12 px-0 py-3 text-center align-middle">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleLock(groupId, reportId);
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

            {/* 3. Rank Index */}
            <td className="px-4 py-3 text-center text-sm text-slate-500 font-medium relative w-12">
                {index + 1}
            </td>

            <td className="px-4 py-3 text-sm font-semibold text-slate-700 text-left w-[30%]">{name}</td>
            <td className="px-4 py-3 text-sm text-slate-500 text-center w-24">{designator}</td>
            <td className="px-4 py-3 text-sm text-slate-700 font-mono text-center w-16">
                {reportsRemaining !== undefined ? reportsRemaining : '-'}
            </td>
            <td className="px-4 py-3 text-sm text-center w-16">
                <PromotionBadge recommendation={promRec} size="sm" className="rounded-sm px-1.5" />
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
            <td className="w-12 px-0 py-3 text-center align-middle">
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
