import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { PromotionBadge } from './PromotionBadge';

interface SortableRankRowProps {
    member: {
        id: string; // This MUST be the draggable id (reportId usually for reordering reports, or memberId if that's what we sort)
        // Wait, reorderMembers in store takes report IDs or member IDs?
        // Store: reorderMembers: (groupId: string, newOrder: string[])
        // Strategy: "Using Report ID as Member ID for the calculator context"
        // CycleContextPanel uses member.id which is memberId. BUT reports are the entity.
        // Let's check CycleContextPanel:
        //  id: report.memberId,
        //  reportId: report.id
        // The list is of MEMBERS. But the store reorders REPORTS. 
        // We should probably drag by REPORT ID to be safe and consistent with store.
        reportId: string;
        name: string;
        rank: string;
        mta: number;
        promRec: string;
    };
    index: number; // 0-based index for display (so rank is index + 1)
}

export function SortableRankRow({ member, index }: SortableRankRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: member.reportId });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
        position: isDragging ? 'relative' as const : undefined,
    };

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={`
                group border-b border-slate-100 last:border-0 
                ${isDragging ? 'bg-indigo-50 shadow-md ring-1 ring-indigo-200 opacity-90' : 'bg-white hover:bg-slate-50'}
                transition-colors
            `}
        >
            {/* Rank # (Fixed Index) */}
            <td className="px-4 py-3 text-center text-sm font-medium text-slate-500 w-12">
                {index + 1}
            </td>

            {/* Drag Handle */}
            <td className="w-10 px-2 py-3 text-center cursor-grab active:cursor-grabbing touch-none">
                <div {...attributes} {...listeners} className="flex items-center justify-center p-1 rounded hover:bg-slate-200/50 text-slate-400 group-hover:text-slate-600 transition-colors">
                    <GripVertical className="w-4 h-4" />
                </div>
            </td>

            {/* Name */}
            <td className="px-4 py-3 text-sm font-medium text-slate-900">
                {member.name}
                <span className="ml-2 text-xs font-normal text-slate-400">{member.rank}</span>
            </td>

            {/* Projected MTA (Read Only) */}
            <td className="px-4 py-3 text-sm text-slate-600 text-center font-mono">
                {member.mta.toFixed(2)}
            </td>

            {/* Prom Rec (Read Only - but reflects simulated outcome) */}
            <td className="px-4 py-3 text-center">
                <PromotionBadge recommendation={member.promRec} size="sm" />
            </td>
        </tr>
    );
}
