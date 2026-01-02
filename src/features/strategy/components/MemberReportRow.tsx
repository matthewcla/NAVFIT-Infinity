import { useRef, useState } from 'react';
import { PromotionBadge } from './PromotionBadge';

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
    isSelected: boolean;
    isRankMode: boolean;
    onClick: () => void;
    onDragStart: (e: React.DragEvent, data: DragData) => void;
    onDragEnd: () => void;
}

export function MemberReportRow({
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
    isSelected,
    isRankMode,
    onClick,
    onDragStart,
    onDragEnd
}: MemberReportRowProps) {
    const dragPreviewRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>) => {
        // Set drag image to custom mini card
        if (dragPreviewRef.current) {
            e.dataTransfer.setDragImage(dragPreviewRef.current, 0, 0);
        }

        setIsDragging(true);

        const data: DragData = {
            type: 'member_report',
            groupId,
            reportId
        };

        // Pass up to parent for store updates / global state
        onDragStart(e, data);
    };

    const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
        setIsDragging(false);
        onDragEnd();
    };

    return (
        <>
            {/* Drag Preview - Hidden Mini Card */}
            {/* We place this inside a hidden div or portal, or just absolute offscreen. 
                Using a <tr> here is invalid HTML if not inside a table, but we can't easily put a div inside a tr safely for ref.
                Actually, refs work on any element. 
                But this component returns a <tr>. 
                We can't render a <div> sibling to a <tr> in a map usually without Fragment, 
                but <Fragment> doesn't support refs directly, and setDragImage needs a DOM node.
                
                Solution: Put the preview inside a <td className="hidden"> or similar, 
                OR rely on the fact that this component is called inside a map, so we can return an array or Fragment.
                However, React Fragments can't hold refs.
                
                Better: Render the preview *inside* the first <td> or just absolutely positioned inside relative cell.
                BUT `setDragImage` requires the element to be visible (rendered), just usually off-screen.
            */}

            <tr
                draggable={!isRankMode}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onClick={onClick}
                className={`
                    cursor-pointer transition-colors hover:bg-slate-50 relative
                    ${isSelected ? 'bg-indigo-50/50' : ''}
                    ${isDragging ? 'opacity-40 grayscale' : ''}
                `}
            >
                {/* 
                    Hidden Drag Preview Container 
                    We put it in the first cell, absolutely positioned off-screen.
                */}
                <td className="px-4 py-3 text-center text-sm text-slate-500 font-medium relative">
                    {/* 
                        Hidden Drag Preview Container 
                        We put it in the first cell, absolutely positioned off-screen.
                    */}
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
                <td className="px-4 py-3 text-sm font-semibold text-slate-700 text-left">{name}</td>
                <td className="px-4 py-3 text-sm text-slate-500 text-center">{designator}</td>
                <td className="px-4 py-3 text-sm text-slate-700 font-mono text-center">
                    {reportsRemaining !== undefined ? reportsRemaining : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-center">
                    <PromotionBadge recommendation={promRec} size="xs" className="rounded-sm px-1.5" />
                </td>
                <td className="px-4 py-3 text-sm font-mono text-slate-700 text-center">{mta.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm font-mono text-slate-400 text-center">
                    {delta === 0 ? '-' : (delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2))}
                </td>
                <td className={`px-4 py-3 text-sm font-mono text-center font-medium ${rscaMargin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {rscaMargin > 0 ? '+' : ''}{rscaMargin.toFixed(2)}
                </td>
            </tr>
        </>
    );
}
