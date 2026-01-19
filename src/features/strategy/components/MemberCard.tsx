import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface MemberCardProps {
    id: string; // ReportID
    name: string;
    rank?: number;
    score?: number;
    overlay?: boolean;
    disabled?: boolean;
}

export function MemberCard({ id, name, rank, score, overlay, disabled }: MemberCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id, disabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    if (overlay) {
        return (
            <div className="bg-white border-2 border-indigo-500 shadow-xl rounded-lg p-3 w-[200px] flex items-center gap-3 cursor-grabbing z-50">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                    {rank || '#'}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 text-sm truncate">{name}</div>
                    {score && <div className="text-xs text-indigo-600 font-mono font-bold">{score.toFixed(2)}</div>}
                </div>
                <GripVertical className="w-4 h-4 text-slate-400" />
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`
                group relative flex items-center gap-3 bg-white border border-slate-200 shadow-sm rounded-lg p-2.5 mb-2 transition-all select-none
                ${disabled
                    ? 'opacity-80 cursor-default bg-slate-50'
                    : 'hover:border-indigo-300 hover:shadow-md cursor-grab active:cursor-grabbing'
                }
            `}
        >
            {/* Rank Badge */}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${disabled ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                }`}>
                {rank}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className={`font-bold text-sm truncate ${disabled ? 'text-slate-500' : 'text-slate-700 group-hover:text-slate-900'}`}>{name}</div>
                <div className="flex items-center justify-between mt-0.5">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Proj</div>
                    <div className={`text-xs font-mono font-bold ${score && score >= 4.0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {score ? score.toFixed(2) : '-'}
                    </div>
                </div>
            </div>

            {/* Drag Handle (Visible on Hover ONLY if NOT disabled) */}
            {!disabled && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300">
                    <GripVertical className="w-4 h-4" />
                </div>
            )}
        </div>
    );
}
