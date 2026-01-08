import { useRef, useState } from 'react';
import { PromotionBadge } from './PromotionBadge';
import { GripVertical, Lock, Unlock } from 'lucide-react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { cn } from '@/lib/utils';

interface DragData {
    type: string;
    groupId: string;
    reportId: string;
}

interface MemberReportRowProps {
    id: string; // Report ID or Member ID? In parent it uses member.id for key/selection, but we need reportId for drag
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
    isRankMode: boolean;
    onClick: () => void;
    onDragStart: (e: React.DragEvent, data: DragData) => void;
    onDragEnd: () => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
}

export function MemberReportRow({
    // id, // Not used locally, but passed by parent. Removing from destructuring to silence warning.
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
    isRankMode,
    onClick,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop
}: MemberReportRowProps) {
    const dragPreviewRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const { toggleReportLock, summaryGroups } = useNavfitStore();
    const isLocked = summaryGroups.find(g => g.id === groupId)?.reports.find(r => r.id === reportId)?.isLocked;


    const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>) => {
        if (isLocked) {
            e.preventDefault();
            return;
        }
        setIsDragging(true);

        if (isRankMode) {
            // Reordering Mode
            e.dataTransfer.setData('text/plain', reportId);
            e.dataTransfer.effectAllowed = 'move';
            // Do NOT set custom drag image for reordering, standard ghost row is better
        } else {
            // Assignment Mode (Legacy/Normal)
            // Set drag image to custom mini card
            if (dragPreviewRef.current) {
                e.dataTransfer.setDragImage(dragPreviewRef.current, 0, 0);
            }

            const data: DragData = {
                type: 'member_report',
                groupId,
                reportId
            };
            onDragStart(e, data);
        }
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        onDragEnd();
    };

    return (
        <>
            <tr
                draggable={true}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onClick={onClick}
                className={`
                    cursor-pointer transition-colors hover:bg-slate-50 relative group
                    ${isSelected ? 'bg-indigo-50/50' : ''}
                    ${isDragging ? 'opacity-40 grayscale' : ''}
                `}
            >
                {/* 1. Rank Index Column (Contains Hidden Drag Preview for Normal Mode) */}
                <td className="px-4 py-3 text-center text-sm text-slate-500 font-medium relative w-12">
                    <div
                        ref={dragPreviewRef}
                        className="fixed -top-[9999px] left-0 w-56 h-12 bg-white border border-indigo-500 rounded-lg shadow-xl flex items-center px-4 gap-3 z-50 pointer-events-none overflow-hidden"
                    >
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-slate-800 truncate">{name}</div>
                            <div className="text-[10px] text-slate-500 font-mono truncate">{designator}</div>
                        </div>
                        <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                            {rscaMargin > 0 ? '+' : ''}{rscaMargin.toFixed(2)}
                        </div>
                    </div>
                    {index + 1}
                </td>

                {/* 2. Lock/Drag Column (Replaces Spacer/Grip) */}
                <td className="w-8 px-0 py-3 text-center align-middle touch-none relative">
                    {/* In Rank Mode: Show Grip (unless locked). In List Mode: Show Lock Toggle */}
                    {isRankMode ? (
                        isLocked ? (
                            // Rank Mode + Locked = Show Lock Icon (Cannot Drag)
                            <div className="flex items-center justify-center p-1 text-red-400">
                                <Lock className="w-3.5 h-3.5" />
                            </div>
                        ) : (
                            // Rank Mode + Unlocked = Grip
                            <div className="flex items-center justify-center p-1 rounded transition-colors cursor-grab hover:bg-slate-200/50 text-slate-400 group-hover:text-slate-600">
                                <GripVertical className="w-4 h-4" />
                            </div>
                        )
                    ) : (
                        // List Mode: Always show Lock Toggle
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleReportLock(groupId, reportId);
                            }}
                            className={cn(
                                "flex items-center justify-center p-1 rounded transition-colors mx-auto",
                                isLocked
                                    ? "text-red-500 hover:bg-red-50"
                                    : "text-slate-300 hover:text-slate-500 hover:bg-slate-100 opacity-0 group-hover:opacity-100 focus:opacity-100" // Hide unlock unless hover/focus in list mode
                            )}
                            title={isLocked ? "Unlock Rank" : "Lock Rank"}
                        >
                            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                    )}
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
            </tr>
        </>
    );
}
