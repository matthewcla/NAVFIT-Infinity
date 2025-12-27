
import {
    Plus,
    Users,
} from 'lucide-react';
import type { Member } from '../../types';
import { PERIODIC_SCHEDULE } from '../../lib/constants';

interface TimelineRowProps {
    member: Member;
    coDetachDate: string;
    avgRSCA: number;
    onReportClick?: () => void;
    onOpenReport?: (reportId: string) => void;
    timelineMonths: { label: string; monthIndex: number; year: number; index: number }[];
    rankIndex?: number;
    onDragStart?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
    isDraggable?: boolean;
}

export const TimelineRow = ({
    member,
    coDetachDate,
    avgRSCA,
    onReportClick,
    onOpenReport,
    timelineMonths,
    rankIndex,
    onDragStart,
    onDragOver,
    onDrop,
    isDraggable
}: TimelineRowProps) => {
    // Width per month column (must match ManningWaterfall header)
    const COL_WIDTH = 96; // w-24 = 6rem = 96px

    // --- Helper to Generate Mock Report IDs for Demo Navigation ---
    const getReportId = (type: 'periodic' | 'transfer' | 'promo' | 'special') => {
        return `r-mw-${member.id}-${type}`;
    };

    // Helper to calculate pixel position based on date
    const getPosPx = (targetMonthIndex: number, day = 15, targetYear: number) => {
        // Find the index in the timelineMonths array
        const startIdx = timelineMonths.findIndex(m => m.monthIndex === targetMonthIndex && m.year === targetYear);

        if (startIdx === -1) {
            // Handle edge case: date is outside our view window
            // If before first month, return negative? If after, return > width?
            // For now, simple check if it fits in range
            return -1;
        }

        const daysInMonth = 30; // approx
        const dayOffset = (day / daysInMonth) * COL_WIDTH;

        return (startIdx * COL_WIDTH) + dayOffset;
    };

    const getPosPxSimple = (date: Date) => {
        return getPosPx(date.getMonth(), date.getDate(), date.getFullYear());
    }


    // Periodic
    const periodicMonth = PERIODIC_SCHEDULE[member.rank] || -1;
    let periodicPos = -1;
    if (periodicMonth > 0) {
        // Calculate year for periodic. If periodic month is earlier in year than today, it might be next year?
        // Or simple logic: Find the next occurrence of this periodic month in our timeline
        const targetTimelineBase = timelineMonths.find(m => m.monthIndex === periodicMonth - 1);
        if (targetTimelineBase) {
            periodicPos = getPosPx(targetTimelineBase.monthIndex, 15, targetTimelineBase.year);
        }
    }

    // Parse Dates
    const detachDateObj = new Date(coDetachDate);
    const coDetachPos = getPosPxSimple(detachDateObj);

    // const isTransferring = member.prd && member.prd.startsWith(CURRENT_YEAR.toString()); // Basic check, ideally parse real date
    const transferDate = member.prd ? new Date(member.prd) : null;
    const transferPos = transferDate ? getPosPxSimple(transferDate) : -1;

    const isGaining = member.status === 'Gain';
    const gainDate = isGaining && member.gainDate ? new Date(member.gainDate) : null;
    const gainPos = gainDate ? getPosPxSimple(gainDate) : -1;

    return (
        <div
            className={`flex border-b border-slate-100 items-center h-16 group transition-colors ${isDraggable ? 'cursor-grab active:cursor-grabbing hover:bg-slate-50' : ''}`}
            draggable={isDraggable}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            {/* Member Info (Sticky Column) */}
            <div className="w-80 px-6 shrink-0 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 z-20 flex items-center shadow-[1px_0_4px_-1px_rgba(0,0,0,0.1)] transition-colors">

                {/* Rank # Column */}
                <div className="w-8 mr-2 shrink-0 text-center font-bold text-slate-400 text-xs">
                    {rankIndex}
                </div>

                <div className="flex-1 flex flex-col justify-center items-end text-right">
                    <div className="font-bold text-slate-800 text-sm truncate">{member.name}</div>
                    <div className="text-xs text-slate-500 flex items-center space-x-2">
                        <span className="bg-slate-200 px-1.5 rounded text-slate-700 font-mono">{member.rank}</span>
                        <span>{member.designator || member.rating}</span>
                        <span className="text-blue-600 font-semibold truncate">• {member.milestone}</span>
                    </div>
                </div>
            </div>

            {/* The Timeline Visual */}
            <div className="flex-1 relative h-full flex items-center min-w-[500px]">
                {/* Background Grid Lines (Months) */}
                <div className="absolute inset-0 flex pointer-events-none">
                    {timelineMonths.map((_, idx) => (
                        <div key={idx} className="w-24 shrink-0 border-r border-slate-100 h-full"></div>
                    ))}
                </div>

                {/* Timeline Track */}
                <div className="absolute w-full h-1 bg-slate-200 rounded top-1/2 -translate-y-1/2 mx-2"></div>

                {/* 1. Periodic Report Marker - Only show if before Detach Date */}
                {!isGaining && periodicPos > 0 && (periodicPos <= coDetachPos || coDetachPos === -1) && (
                    <div
                        className={`absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 shadow-sm flex items-center justify-center z-10 group/marker cursor-pointer hover:scale-110 transition-transform ${typeof member.nextPlan === 'number' && member.nextPlan >= avgRSCA
                            ? 'bg-blue-500 border-green-400 ring-2 ring-green-100'
                            : 'bg-blue-500 border-white'
                            }`}
                        style={{ left: `${periodicPos}px` }}
                        onClick={onReportClick}
                        onDoubleClick={() => onOpenReport && onOpenReport(getReportId('periodic'))}
                    >
                        <span className="text-[10px] font-bold text-white">
                            {member.nextPlan === 'NOB' || !member.nextPlan ? 'NOB' : (member.nextPlan as number).toFixed(2)}
                        </span>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/marker:opacity-100 whitespace-nowrap z-20 pointer-events-none text-center">
                            <div>Periodic Report</div>
                            {typeof member.nextPlan === 'number' && (
                                <div className={member.nextPlan >= avgRSCA ? 'text-green-300' : 'text-yellow-300'}>
                                    {member.nextPlan >= avgRSCA ? '+' : ''}{(member.nextPlan - avgRSCA).toFixed(2)} vs RSCA
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. Transfer/Loss Marker - Only show if before Detach Date */}
                {/* Simplified logic: Show if exists and valid position */}
                {transferPos > 0 && (
                    <div
                        className={`absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 shadow-sm flex items-center justify-center z-10 group/marker cursor-pointer hover:scale-110 transition-transform ${typeof member.target === 'number' && member.target >= avgRSCA
                            ? 'bg-red-500 border-green-400 ring-2 ring-green-100'
                            : 'bg-red-500 border-white'
                            }`}
                        style={{ left: `${transferPos}px` }}
                        onClick={onReportClick}
                        onDoubleClick={() => onOpenReport && onOpenReport(getReportId('transfer'))}
                    >
                        <span className="text-[10px] font-bold text-white">
                            {member.target ? member.target.toFixed(2) : 'N/A'}
                        </span>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/marker:opacity-100 whitespace-nowrap z-20 pointer-events-none text-center">
                            <div>Transfer PRD</div>
                            {typeof member.target === 'number' && (
                                <div className={member.target >= avgRSCA ? 'text-green-300' : 'text-yellow-300'}>
                                    {member.target >= avgRSCA ? '+' : ''}{(member.target - avgRSCA).toFixed(2)} vs RSCA
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. Gain Marker */}
                {gainPos > 0 && (
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center z-10 group/marker cursor-pointer"
                        style={{ left: `${gainPos}px` }}
                    >
                        <Plus size={12} className="text-white" />
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/marker:opacity-100 whitespace-nowrap z-20 pointer-events-none">
                            Gain: {member.gainDate}
                        </div>
                    </div>
                )}

                {/* 4. CO Detachment Line (Change of Reporting Senior) */}
                {coDetachPos > 0 && (
                    <div
                        className="absolute h-full w-0.5 bg-purple-500 top-0 z-0 opacity-60 dashed"
                        style={{ left: `${coDetachPos}px`, borderLeft: '2px dashed #a855f7' }}
                    >
                        <div className="absolute top-1/2 -translate-y-1/2 -left-2.5 w-5 h-5 bg-purple-100 rounded-full border border-purple-500 flex items-center justify-center z-20">
                            <Users size={10} className="text-purple-700" />
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
