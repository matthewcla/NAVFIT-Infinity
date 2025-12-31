import React from 'react';
import {
    Plus,
    Users,
} from 'lucide-react';
import type { Member } from '@/types';
import { PERIODIC_SCHEDULE } from '@/lib/constants';

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
    onReportUpdate?: (reportId: string, newAverage: number) => void;
    projections?: Record<string, number>;
    periodicReportId?: string;
    transferReportId?: string;
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
    isDraggable,
    onReportUpdate,
    projections = {},
    periodicReportId,
    transferReportId
}: TimelineRowProps) => {
    // Width per month column (must match ManningWaterfall header)
    const COL_WIDTH = 96; // w-24 = 6rem = 96px

    // --- Helper to Generate Mock Report IDs for Demo Navigation ---
    const getReportId = (type: 'periodic' | 'transfer' | 'promo' | 'special') => {
        if (type === 'periodic' && periodicReportId) return periodicReportId;
        if (type === 'transfer' && transferReportId) return transferReportId;
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

    // --- Vertical Drag Logic for Report Adjustment ---
    const [draggingReport, setDraggingReport] = React.useState<{
        id: string;
        initialCenterY: number; // Center of the icon at start
        initialCenterX: number; // Center of the visual icon X
        startMouseY: number;    // Mouse Y at start
        currentMouseY: number;  // Current Mouse Y
        initialClientX: number; // Screen X (mouse status)
        startValue: number | 'NOB';
    } | null>(null);

    const handleReportMouseDown = (e: React.MouseEvent, reportId: string, currentValue: number | 'NOB' | null) => {
        e.stopPropagation(); // Prevent Row Drag
        e.preventDefault();

        // Only draggable if onReportUpdate is present
        if (!onReportUpdate) return;

        // Calculate Icon Center
        const rect = e.currentTarget.getBoundingClientRect();
        const centerY = rect.top + (rect.height / 2);
        const centerX = rect.left + (rect.width / 2);

        // Fix: Explicitly check for 0 to handle "NOB" correctly when it comes from DB as 0
        const startVal = (currentValue === null || currentValue === 0) ? 'NOB' : currentValue;
        setDraggingReport({
            id: reportId,
            initialCenterY: centerY,
            initialCenterX: centerX,
            startMouseY: e.clientY,
            currentMouseY: e.clientY,
            initialClientX: e.clientX,
            startValue: startVal
        });
    };

    const calculateDragValue = (startVal: number | 'NOB', startCenterY: number, currentCenterY: number): number | 'NOB' => {
        // Constants for layout
        const NOB_CENTER_Y = 18; // 36px height / 2
        const RAIL_TOP_Y = 44; // 36px (NOB) + 8px (mb-2)
        const PX_PER_POINT = 40;

        // 1. Determine Start Offset based on value
        let startOffset = 0;
        if (startVal === 'NOB') {
            startOffset = NOB_CENTER_Y;
        } else {
            startOffset = RAIL_TOP_Y + ((5.0 - startVal) * PX_PER_POINT);
        }

        // 2. Calculate "Virtual" position relative to the Scale Container Top
        // ScaleTop would be at (startCenterY - startOffset)
        // So RelativeY = currentCenterY - (startCenterY - startOffset)
        const relativeY = currentCenterY - (startCenterY - startOffset);

        // 3. Logic for Value
        // Midpoint between NOB (18) and 5.0 (44) is 31
        // Hysteresis/Snap:
        if (relativeY < 31) {
            return 'NOB';
        }

        // Rail Logic
        if (relativeY >= 31 && relativeY < RAIL_TOP_Y + 10) {
            // Snap to 5.0 for a bit of distance ('resistance' or 'magnetic pull' to top of rail)
            return 5.0;
        }

        // Calculate numeric
        // relativeY = RAIL_TOP_Y + (5.0 - val) * 40
        // val = 5.0 - (relativeY - RAIL_TOP_Y) / 40
        const raw = 5.0 - ((relativeY - RAIL_TOP_Y) / PX_PER_POINT);

        if (raw > 5.0) return 5.0; // Should be caught by snap above, but safety
        if (raw < 1.0) return 1.0;

        // Round
        return Math.round(raw * 100) / 100;
    };

    React.useEffect(() => {
        if (!draggingReport) return;

        const handleMouseMove = (e: MouseEvent) => {
            setDraggingReport(prev => prev ? { ...prev, currentMouseY: e.clientY } : null);
        };

        const handleMouseUp = (e: MouseEvent) => {
            // Calculate final value using derived currentCenterY
            const deltaY = e.clientY - draggingReport.startMouseY;
            const currentCenterY = draggingReport.initialCenterY + deltaY;

            const val = calculateDragValue(draggingReport.startValue, draggingReport.initialCenterY, currentCenterY);

            if (onReportUpdate && val !== draggingReport.startValue) {
                onReportUpdate(draggingReport.id, val === 'NOB' ? 0 : val);
            }

            setDraggingReport(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingReport, onReportUpdate]);




    const renderDragOverlay = () => {
        if (!draggingReport) return null;

        const deltaY = draggingReport.currentMouseY - draggingReport.startMouseY;
        const currentCenterY = draggingReport.initialCenterY + deltaY;

        const currentVal = calculateDragValue(draggingReport.startValue, draggingReport.initialCenterY, currentCenterY);
        const isPeriodic = draggingReport.id.includes('periodic');
        const baseColor = isPeriodic ? 'bg-blue-500' : 'bg-red-500';

        // Border Color Logic
        let borderColor = 'border-yellow-400';
        if (currentVal === 'NOB') {
            borderColor = 'border-white';
        } else if (typeof currentVal === 'number' && currentVal > avgRSCA) {
            borderColor = 'border-green-500';
        }

        // Layout Constants (Must match calculateDragValue)
        const NOB_HEIGHT = 36; // h-9
        const MARGIN = 8; // mb-2
        const RAIL_PADDING_Y = 24; /* Adjusted to match py-6 (24px) */

        // Revised Layout Logic:
        // The container adds padding. So the "Top" of the rail content is shifted down by RAIL_PADDING_Y.

        const NOB_CENTER_Y_RAW = NOB_HEIGHT / 2;
        const RAIL_TOP_Y_RAW = NOB_HEIGHT + MARGIN;

        const PX_PER_POINT = 40;
        const SCALE_HEIGHT = PX_PER_POINT * 4; // 160px

        // 1. Calculate Scale Top Position to align exactly with Start Value
        // We need to position the *Container* such that the Value Point aligns with draggingReport.initialCenterY
        let valueOffsetFromContentTop = 0;

        if (draggingReport.startValue === 'NOB') {
            valueOffsetFromContentTop = NOB_CENTER_Y_RAW;
        } else {
            valueOffsetFromContentTop = RAIL_TOP_Y_RAW + ((5.0 - draggingReport.startValue) * PX_PER_POINT);
        }

        // Total offset includes the container padding
        const totalOffsetFromContainerTop = valueOffsetFromContentTop + RAIL_PADDING_Y;

        const scaleTopY = draggingReport.initialCenterY - totalOffsetFromContainerTop;

        // 2. Calculate Visual Icon Y (Snapped)
        let visualY = currentCenterY;
        // Optional: Apply magnetic snap to visual position for NOB/5.0
        if (currentVal === 'NOB') {
            visualY = scaleTopY + RAIL_PADDING_Y + NOB_CENTER_Y_RAW;
        } else if (currentVal === 5.0) {
            // If strictly 5.0, snap to tick?
            visualY = scaleTopY + RAIL_PADDING_Y + RAIL_TOP_Y_RAW;
        }
        // Else, let it follow mouse (or stick to rail track x-axis, but Y follows value)
        if (typeof currentVal === 'number' && currentVal < 5.0) {
            // To make it look like it's ON the value:
            visualY = scaleTopY + RAIL_PADDING_Y + RAIL_TOP_Y_RAW + ((5.0 - currentVal) * PX_PER_POINT);
        }

        return (
            <div
                className="fixed inset-0 z-50 pointer-events-none"
                style={{ zIndex: 9999 }}
            >
                {/* 1. The Vertical Scale Track (Behind) */}
                <div
                    className="absolute w-28 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-200 flex flex-col items-center py-6"
                    style={{
                        left: draggingReport.initialCenterX - 56, // Center 112px (w-28) container on mouse X. 28*4 = 112. 112/2 = 56.
                        top: scaleTopY
                    }}
                >
                    {/* NOB Parking Lot */}
                    <div className={`w-16 h-9 border-2 border-dashed ${currentVal === 'NOB' ? 'border-slate-400 bg-slate-50' : 'border-slate-300 bg-slate-50/50'} rounded flex items-center justify-center mb-2 transition-colors`}>
                        <span className={`text-xs font-bold ${currentVal === 'NOB' ? 'text-slate-900' : 'text-slate-400'}`}>NOB</span>
                    </div>

                    {/* The Rail */}
                    <div className="w-2 bg-slate-300 rounded-full relative" style={{ height: `${SCALE_HEIGHT}px` }}>
                        {/* Ticks */}
                        {[5, 4, 3, 2, 1].map(tick => (
                            <div
                                key={tick}
                                className="absolute w-8 h-1 bg-slate-400 -left-3 flex items-center rounded-sm"
                                style={{ top: `${(5 - tick) * PX_PER_POINT}px` }}
                            >
                                <span className="absolute -left-8 text-xs font-bold font-mono text-slate-700">{tick.toFixed(1)}</span>
                            </div>
                        ))}

                        {/* RSCA Line */}
                        <div
                            className="absolute w-12 h-1 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] z-10 -left-5 flex items-center rounded-sm"
                            style={{ top: `${(5 - avgRSCA) * PX_PER_POINT}px` }}
                        >
                            <span className="absolute -right-14 text-[11px] font-black text-red-600 tracking-wider">RSCA</span>
                        </div>
                    </div>
                </div>

                {/* 2. The Ghost Icon (Draggable) */}
                <div
                    className={`absolute w-9 h-9 rounded-full border-4 shadow-xl flex items-center justify-center z-50 transition-transform ${baseColor} ${borderColor} ring-2 ring-blue-200/50`}
                    style={{
                        left: draggingReport.initialCenterX - 18,
                        top: visualY - 18, // Use calculated visualY for snap effect
                    }}
                >
                    <span className="text-[10px] font-bold text-white">
                        {/* Blank during drag, per user request */}
                    </span>

                    {/* Side Tooltip */}
                    <div className="absolute left-full ml-3 bg-slate-800 text-white text-xs px-3 py-2 rounded shadow-lg whitespace-nowrap flex flex-col items-center z-[9999]">
                        <div className="font-bold mb-1">
                            {currentVal === 'NOB' ? 'NOB' : currentVal.toFixed(2)}
                        </div>
                        {(typeof currentVal === 'number') && (
                            <div className={`text-xl font-black leading-none ${currentVal - avgRSCA > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {currentVal - avgRSCA > 0 ? '+' : ''}{(currentVal - avgRSCA).toFixed(2)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // --- Row DnD Visuals ---
    const memberInfoRef = React.useRef<HTMLDivElement>(null);
    const [isDragOver, setIsDragOver] = React.useState(false);
    const dragEnterCounter = React.useRef(0);

    const handleRowDragStart = (e: React.DragEvent) => {
        // Set drag image to just the member info card, not the whole row
        if (memberInfoRef.current) {
            e.dataTransfer.setDragImage(memberInfoRef.current, 0, 0);
        }
        if (onDragStart) onDragStart(e);
    };

    const handleRowDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        dragEnterCounter.current += 1;
        if (dragEnterCounter.current === 1) {
            setIsDragOver(true);
        }
    };

    const handleRowDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        dragEnterCounter.current -= 1;
        if (dragEnterCounter.current === 0) {
            setIsDragOver(false);
        }
    };

    const handleRowDrop = (e: React.DragEvent) => {
        dragEnterCounter.current = 0;
        setIsDragOver(false);
        if (onDrop) onDrop(e);
    };

    const handleRowDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (onDragOver) onDragOver(e);
    };

    return (
        <div
            className={`flex border-b items-center h-16 group transition-colors ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''
                } ${isDragOver ? 'border-t-2 border-t-blue-500 border-b-slate-100 bg-blue-50/30' : 'border-b-slate-100 hover:bg-slate-50'
                }`}
            draggable={isDraggable && !draggingReport} // Disable row drag if modifying report
            onDragStart={handleRowDragStart}
            onDragOver={handleRowDragOver}
            onDragEnter={handleRowDragEnter}
            onDragLeave={handleRowDragLeave}
            onDrop={handleRowDrop}
        >
            {draggingReport && (
                <div
                    className="fixed inset-0 z-50 cursor-ns-resize"
                    onMouseMove={() => {
                        // Fallback if document listener lags? usually doc listener enough
                    }}
                >
                    {/* Overlay Portal or Render Direct? Direct is easier if fixed pos */}
                    <div
                        className="absolute bg-slate-900/80 text-white px-3 py-2 rounded-r-md shadow-lg pointer-events-none flex flex-col items-center gap-1"
                        style={{
                            top: draggingReport.initialCenterY - 100, // Anchor relative to start center
                            left: 40
                        }}
                    >
                    </div>
                    {renderDragOverlay()}
                </div>
            )}

            {/* Member Info (Sticky Column) */}
            <div
                ref={memberInfoRef}
                className="w-80 px-6 shrink-0 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 z-20 flex items-center shadow-[1px_0_4px_-1px_rgba(0,0,0,0.1)] transition-colors"
            >

                {/* Rank # Column */}
                <div className="w-8 mr-2 shrink-0 text-center font-bold text-slate-400 text-xs">
                    {rankIndex}
                </div>

                <div className="flex-1 flex flex-col justify-center items-end text-right">
                    <div className="font-bold text-slate-800 text-sm truncate">
                        {member.name.startsWith(member.rank) ? member.name.substring(member.rank.length).trim() : member.name}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center space-x-2">
                        <span className="text-blue-600 font-semibold truncate">{member.milestone}</span>
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
                        key="periodic"
                        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-blue-500 border-4 shadow-sm flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-10 cursor-ns-resize ${(() => {
                            const pid = getReportId('periodic');
                            const proj = projections[pid];
                            const val = proj !== undefined ? proj : member.nextPlan;

                            if ((val as any) === 'NOB' || !val) return 'border-white';
                            return (val as number) > avgRSCA ? 'border-green-500' : 'border-yellow-400';
                        })()
                            }`}
                        style={{ left: `${periodicPos}px` }}
                        onClick={onReportClick}
                        onDoubleClick={() => onOpenReport && onOpenReport(getReportId('periodic'))}
                        onMouseDown={(e) => {
                            const pid = getReportId('periodic');
                            const proj = projections[pid];
                            const val = proj !== undefined ? proj : (member.nextPlan ?? null);
                            handleReportMouseDown(e, pid, val);
                        }}
                    >
                        <span className="text-[10px] font-bold text-white">
                            {(() => {
                                const pid = getReportId('periodic');
                                const proj = projections[pid];
                                if (proj !== undefined) return proj === 0 ? 'NOB' : proj.toFixed(2);
                                return member.nextPlan === 'NOB' || !member.nextPlan ? 'NOB' : (member.nextPlan as number).toFixed(2);
                            })()}
                        </span>
                        {/* Tooltip */}
                        {!draggingReport && (
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/marker:opacity-100 whitespace-nowrap z-20 pointer-events-none text-center">
                                <div>Periodic Report</div>
                                {(() => {
                                    const pid = getReportId('periodic');
                                    const proj = projections[pid];
                                    const val = proj !== undefined ? proj : member.nextPlan;

                                    if (typeof val === 'number' && val !== 0) {
                                        return (
                                            <div className={val >= avgRSCA ? 'text-green-300' : 'text-yellow-300'}>
                                                {val >= avgRSCA ? '+' : ''}{(val - avgRSCA).toFixed(2)} vs RSCA
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                                <div className="text-slate-400 mt-1 italic text-[10px]">Drag Vertically to Adjust</div>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. Transfer/Loss Marker - Only show if before Detach Date */}
                {/* Simplified logic: Show if exists and valid position */}
                {transferPos > 0 && (
                    <div
                        key="transfer"
                        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-red-500 border-4 shadow-sm flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-10 cursor-ns-resize ${(() => {
                            const tid = getReportId('transfer');
                            const proj = projections[tid];
                            const val = proj !== undefined ? proj : member.target;

                            // Fix TS error: val is number | null, comparison to 'NOB' is invalid without cast
                            if ((val as any) === 'NOB' || !val) return 'border-white';
                            return (val as number) > avgRSCA ? 'border-green-500' : 'border-yellow-400';
                        })()
                            }`}
                        style={{ left: `${transferPos}px` }}
                        onClick={onReportClick}
                        onDoubleClick={() => onOpenReport && onOpenReport(getReportId('transfer'))}
                        onMouseDown={(e) => {
                            const tid = getReportId('transfer');
                            const proj = projections[tid];
                            const val = proj !== undefined ? proj : (member.target ?? null);
                            handleReportMouseDown(e, tid, val);
                        }}
                    >
                        <span className="text-[10px] font-bold text-white">
                            {(() => {
                                const tid = getReportId('transfer');
                                const proj = projections[tid];
                                if (proj !== undefined) return proj === 0 ? 'NOB' : proj.toFixed(2);
                                return typeof member.target === 'number' ? member.target.toFixed(2) : 'N/A';
                            })()}
                        </span>
                        {/* Tooltip */}
                        {!draggingReport && (
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/marker:opacity-100 whitespace-nowrap z-20 pointer-events-none text-center">
                                <div>Transfer PRD</div>
                                {(() => {
                                    const tid = getReportId('transfer');
                                    const proj = projections[tid];
                                    const val = proj !== undefined ? proj : member.target;

                                    if (typeof val === 'number' && val !== 0) {
                                        return (
                                            <div className={val >= avgRSCA ? 'text-green-300' : 'text-yellow-300'}>
                                                {val >= avgRSCA ? '+' : ''}{(val - avgRSCA).toFixed(2)} vs RSCA
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                                <div className="text-slate-400 mt-1 italic text-[10px]">Drag Vertically to Adjust</div>
                            </div>
                        )}
                    </div>
                )
                }

                {/* 3. Gain Marker */}
                {
                    gainPos > 0 && (
                        <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center z-10 group/marker cursor-pointer"
                            style={{ left: `${gainPos}px` }}
                        >
                            <Plus size={12} className="text-white" />
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/marker:opacity-100 whitespace-nowrap z-20 pointer-events-none">
                                Gain: {member.gainDate}
                            </div>
                        </div>
                    )
                }

                {/* 4. CO Detachment Line (Change of Reporting Senior) */}
                {
                    coDetachPos > 0 && (
                        <div
                            className="absolute h-full w-0.5 bg-purple-500 top-0 z-0 opacity-60 dashed"
                            style={{ left: `${coDetachPos}px`, borderLeft: '2px dashed #a855f7' }}
                        >
                            <div className="absolute top-1/2 -translate-y-1/2 -left-2.5 w-5 h-5 bg-purple-100 rounded-full border border-purple-500 flex items-center justify-center z-20">
                                <Users size={10} className="text-purple-700" />
                            </div>
                        </div>
                    )
                }

            </div >
        </div >
    );
};
