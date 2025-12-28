import React, { useState, useRef, useMemo, useEffect } from 'react';
import { projectRSCA } from '../../lib/engines/rsca';
import type { RosterMember } from '../../types/roster';
import type { SummaryGroup } from '../../types';
import { Lock } from 'lucide-react';

// --- MOCK DATA FOR PROTOTYPING ---
const MOCK_START_DATE = new Date('2025-01-01');

const INITIAL_RSCA = 3.85;
const INITIAL_SIGNED_COUNT = 45;

interface RSCAReport {
    id: string;
    memberId: string;
    memberName: string;
    rawName: string;
    rank: string;
    summaryGroup: string;
    date: string;
    monthIndex: number;
    type: 'Periodic' | 'Promotion' | 'Transfer' | 'Special' | 'Gain' | 'Detachment';
    traitAverage: number;
    isNOB: boolean;
    initialTraitAverage: number;
    draftStatus?: 'Draft' | 'Review' | 'Submitted' | 'Final' | 'Projected';
}

interface ScatterPoint {
    id: string;
    x: number; // pixel (render)
    y: number; // pixel (render)
    report: RSCAReport;
}

interface StrategyScattergramProps {
    summaryGroups?: SummaryGroup[];
    roster?: RosterMember[];
    onOpenReport?: (memberId: string, name: string, rank?: string, reportId?: string) => void;
    onUpdateReport?: (reportId: string, newAverage: number) => void;
    minimal?: boolean;
    height?: number;
    focusDate?: string;
}

// --- STABLE CONSTANTS ---
const EMPTY_SUMMARY_GROUPS: SummaryGroup[] = [];
const EMPTY_ROSTER: RosterMember[] = [];

export function StrategyScattergram({ summaryGroups = EMPTY_SUMMARY_GROUPS, roster = EMPTY_ROSTER, onOpenReport, onUpdateReport, minimal = false, height: propHeight, focusDate }: StrategyScattergramProps) {
    // --- STATE ---
    // --- STATE ---
    // Removed local reports state to avoid synchronization issues.
    // We derive reports from props and apply local drag overrides.


    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // --- DIMENSIONS & SCALES ---
    const containerHeight = propHeight || 320;

    // VISUAL CONSTANTS
    const HEADER_HEIGHT = 40; // Sticky header
    const ICON_RADIUS = 22;   // Max radius for collision/vis
    const TOP_BUFFER = 20;    // Margin below header for NOB line
    const BOTTOM_BUFFER = 30; // Margin at bottom for 3.0 line visibility inside container

    // Start Y for NOB Line (Visually)
    // Needs to clear sticky header (40) + Top Buffer + Radius/Half-element
    // Actually relative to the Scroll Container content flow.
    // The "Sticky Header" visually overlays.
    // If we want NOB line at visual Y = HEADER_HEIGHT + TOP_BUFFER (+ Radius roughly), then:
    const VISIBLE_TOP_Y = HEADER_HEIGHT + TOP_BUFFER + ICON_RADIUS;

    // Target Bottom Y for 3.0 Line (Visually) within container
    const VISIBLE_BOTTOM_Y = containerHeight - BOTTOM_BUFFER;

    // Available Height for Range (NOB to 3.0)
    const VISIBLE_PIXEL_HEIGHT = VISIBLE_BOTTOM_Y - VISIBLE_TOP_Y;

    const NOB_VALUE = 5.5;
    const TARGET_BOTTOM_TRAIT = 3.0;
    const VISIBLE_TRAIT_RANGE = NOB_VALUE - TARGET_BOTTOM_TRAIT; // 2.5 units

    const pixelsPerTrait = VISIBLE_PIXEL_HEIGHT / VISIBLE_TRAIT_RANGE;

    // Helper: Trait -> Y Coordinate (relative to Scroll Container Top 0)
    const traitToY = React.useCallback((trait: number) => {
        // NOB (5.5) is at VISIBLE_TOP_Y
        const valFromTop = NOB_VALUE - trait;
        return VISIBLE_TOP_Y + (valFromTop * pixelsPerTrait);
    }, [VISIBLE_TOP_Y, pixelsPerTrait, NOB_VALUE]);

    const yToTrait = React.useCallback((y: number) => {
        const relativeY = y - VISIBLE_TOP_Y;
        const valFromTop = relativeY / pixelsPerTrait;
        return NOB_VALUE - valFromTop;
    }, [VISIBLE_TOP_Y, pixelsPerTrait, NOB_VALUE]);

    // Total content height required to reach 1.0 (plus buffer)
    const MIN_TRAIT = 1.0;
    const CHART_BOTTOM_Y = traitToY(MIN_TRAIT) + BOTTOM_BUFFER;
    const TOTAL_SCROLL_HEIGHT = Math.max(containerHeight, CHART_BOTTOM_Y);


    // Helper to map date string to X coordinate
    const dateToX = (dateStr: string) => {
        const d = new Date(dateStr);
        const start = new Date(MOCK_START_DATE);
        // Visual timeline starts 3 months before MOCK_START_DATE
        const diffTime = d.getTime() - start.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);
        const diffMonths = diffDays / 30.44;

        // Add 3 months offset for visual alignment, and center in column
        const visualMonthIndex = diffMonths + 3;

        return (visualMonthIndex * 96) + 48; // 96 is COL_WIDTH
    };

    // Auto-scroll to focusDate (Horizontal)
    useEffect(() => {
        if (focusDate && scrollContainerRef.current) {
            const timer = setTimeout(() => {
                const x = dateToX(focusDate);
                if (scrollContainerRef.current) {
                    const containerWidth = scrollContainerRef.current.clientWidth;
                    scrollContainerRef.current.scrollTo({
                        left: Math.max(0, x - (containerWidth / 2)),
                        top: 0, // Reset to top (Default view) on focus? Or preserve? User said magnetic snap to Default View.
                        behavior: 'smooth'
                    });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [focusDate]);

    // Initial Scroll / Magnetic Logic
    // Default View: Top of container (0) corresponds to NOB visible at top.
    // So scrollTop 0 IS the default view.
    // We add a snap point at 0.

    // If props change, update state
    // --- DERIVED DATA ---
    const reports = useMemo(() => {
        if (!summaryGroups) return [];
        return summaryGroups.flatMap(group =>
            group.reports.map(r => {
                const member = roster.find(m => m.id === r.memberId);
                const name = member ? `${member.rank} ${member.lastName}, ${member.firstName}` : r.memberId;
                const rawName = member ? `${member.lastName}, ${member.firstName}` : "Unknown";

                return {
                    id: r.id,
                    memberId: r.memberId,
                    memberName: name,
                    rawName: rawName,
                    rank: group.name.split(' ')[0],
                    summaryGroup: group.name,
                    date: r.periodEndDate,
                    monthIndex: new Date(r.periodEndDate).getMonth(),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    type: (r.type === 'Detachment' ? 'Detachment' : r.type) as any,
                    traitAverage: r.traitAverage || 3.0,
                    isNOB: r.promotionRecommendation === 'NOB',
                    initialTraitAverage: r.traitAverage || 3.0,
                    draftStatus: r.draftStatus
                };
            })
        );
    }, [summaryGroups, roster]);

    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [dragOverride, setDragOverride] = useState<{ id: string, val: number, isNOB: boolean } | null>(null);
    const [zOrder, setZOrder] = useState<string[]>([]);
    const svgRef = useRef<SVGSVGElement>(null);

    // Merge Override
    const displayReports = useMemo(() => {
        if (!dragOverride) return reports;
        return reports.map(r => {
            if (r.id === dragOverride.id) {
                return { ...r, traitAverage: dragOverride.val, isNOB: dragOverride.isNOB };
            }
            return r;
        });
    }, [reports, dragOverride]);

    // X-Axis Config
    const NUM_MONTHS = 24;
    const COL_WIDTH = 96;
    const CHART_TOTAL_WIDTH = NUM_MONTHS * COL_WIDTH;

    // Ideal RSCA Range
    const IDEAL_RSCA_MIN = 3.8;
    const IDEAL_RSCA_MAX = 4.0;

    const monthToX = (monthIndex: number) => {
        return (monthIndex * COL_WIDTH) + (COL_WIDTH / 2);
    };

    // --- DERIVED DATA ---
    const projectedRSCAVal = useMemo(() => {
        const itas = displayReports.filter(r => !r.isNOB).map(r => r.traitAverage);
        if (itas.length === 0) return INITIAL_RSCA;
        return projectRSCA(INITIAL_RSCA, INITIAL_SIGNED_COUNT, itas);
    }, [displayReports]);

    const points: ScatterPoint[] = useMemo(() => {
        const rawPoints = displayReports.map(r => ({
            id: r.id,
            // Shift +3 months to align with display timeline start
            x: monthToX(r.monthIndex + 3),
            y: traitToY((r.isNOB || r.type === 'Gain') ? NOB_VALUE : r.traitAverage),
            report: r
        }));

        // Collision Handling
        const COLLISION_RADIUS = 22;

        const sortedPointsRaw = [...rawPoints].sort((a, b) => a.x - b.x);

        for (let iter = 0; iter < 3; iter++) {
            for (let i = 0; i < sortedPointsRaw.length; i++) {
                const p1 = sortedPointsRaw[i];
                for (let j = i + 1; j < sortedPointsRaw.length; j++) {
                    const p2 = sortedPointsRaw[j];
                    if (p2.x - p1.x > COLLISION_RADIUS) break;
                    if (Math.abs(p1.y - p2.y) < COLLISION_RADIUS) {
                        const overlap = COLLISION_RADIUS - (p2.x - p1.x);
                        const shift = Math.max(0.5, overlap / 2);
                        p1.x -= shift;
                        p2.x += shift;
                    }
                }
            }
        }
        return sortedPointsRaw;
    }, [displayReports, traitToY]);

    const sortedPoints = useMemo(() => {
        if (zOrder.length === 0) return points;
        const orderMap = new Map(zOrder.map((id, index) => [id, index]));
        return [...points].sort((a, b) => {
            const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : -1;
            const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : -1;
            return indexA - indexB;
        });
    }, [points, zOrder]);


    // Stepped RSCA Trend Lines & Connections
    const { trendLines, impactConnections } = useMemo(() => {
        const lines: { x1: number, x2: number, y: number, value: number }[] = [];
        let currentRSCA = INITIAL_RSCA;
        const RSCA_LAG_MONTHS = 3;

        const impacts = new Map<number, number[]>();
        displayReports.forEach(r => {
            if (r.isNOB) return;
            const impactMonth = r.monthIndex + RSCA_LAG_MONTHS;
            if (!impacts.has(impactMonth)) impacts.set(impactMonth, []);
            impacts.get(impactMonth)?.push(r.traitAverage);
        });

        let lastX = 0;

        for (let m = 0; m < NUM_MONTHS + RSCA_LAG_MONTHS; m++) {
            const chartMonthIndex = m;
            const realMonthIndex = chartMonthIndex - 3;

            if (impacts.has(realMonthIndex)) {
                const thisX = monthToX(chartMonthIndex);

                lines.push({
                    x1: lastX,
                    x2: thisX,
                    y: traitToY(currentRSCA),
                    value: currentRSCA
                });

                const newItas = impacts.get(realMonthIndex) || [];
                const avgNew = newItas.reduce((a, b) => a + b, 0) / newItas.length;
                const diff = (avgNew - currentRSCA) * 0.1;
                const nextRSCA = currentRSCA + diff;

                currentRSCA = nextRSCA;
                lastX = thisX;
            }
        }

        lines.push({
            x1: lastX,
            x2: CHART_TOTAL_WIDTH,
            y: traitToY(currentRSCA),
            value: currentRSCA
        });

        const finalConnections = displayReports.map(r => {
            if (r.isNOB) return null;
            const impactChartMonth = (r.monthIndex + 3) + RSCA_LAG_MONTHS;
            const impactX = monthToX(impactChartMonth);

            const lineAtImpact = lines.find(l => l.x1 <= impactX && l.x2 >= impactX);
            const impactY = lineAtImpact ? lineAtImpact.y : traitToY(currentRSCA);

            const reportX = monthToX(r.monthIndex + 3);
            const reportY = traitToY(r.traitAverage);

            return {
                id: r.id,
                x1: reportX,
                y1: reportY,
                x2: impactX,
                y2: impactY,
                color: r.traitAverage >= impactY ? '#22c55e' : '#ef4444'
            };
        }).filter(Boolean) as { id: string, x1: number, y1: number, x2: number, y2: number, color: string }[];

        return { trendLines: lines, impactConnections: finalConnections };
    }, [displayReports, traitToY, CHART_TOTAL_WIDTH]);

    // --- UTILS ---
    const formatName = (memberName: string) => {
        const parts = memberName.split(' ');
        const namePart = parts.slice(1).join(' ');
        return namePart.replace(',', '');
    };

    const getPointColor = (type: string) => {
        switch (type) {
            case 'Periodic': return '#3b82f6';
            case 'Transfer': return '#ef4444';
            case 'Detachment': return '#ef4444';
            case 'Gain': return '#64748b';
            case 'Special': return '#eab308';
            case 'Promotion': return '#22c55e';
            default: return '#64748b';
        }
    };

    // --- HANDLERS ---
    const handleReportDoubleClick = (report: RSCAReport) => {
        if (onOpenReport) {
            onOpenReport(report.memberId || report.id, report.memberName || "Unknown Member", report.rank, report.id);
        }
    };

    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        setActiveDragId(id);
        setZOrder(prev => {
            const filtered = prev.filter(zid => zid !== id);
            return [...filtered, id];
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!activeDragId || !svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();

        // Y Calculation inverse
        // MouseY within SVG
        const clientY = e.clientY - rect.top;

        // We need to account for scroll?
        // No, rect corresponds to the SVG element which is usually inside the scroll container.
        // If SVG is full height in scroll container, clientY is relative to SVG top (0).
        // traitToY returns Y relative to SVG top (0).
        // So this logic holds.

        let newTrait = 0;
        let isNowNOB = false;

        newTrait = Number(yToTrait(clientY).toFixed(2));

        if (newTrait > 5.10) {
            isNowNOB = true;
        } else {
            isNowNOB = false;
            newTrait = Math.max(MIN_TRAIT, Math.min(5.0, newTrait));
        }

        setDragOverride({
            id: activeDragId,
            val: isNowNOB ? 0 : newTrait,
            isNOB: isNowNOB
        });
    };

    const handleMouseUp = () => {
        if (activeDragId && onUpdateReport && dragOverride) {
            onUpdateReport(activeDragId, dragOverride.val);
        }
        setActiveDragId(null);
        setDragOverride(null);
    };

    useEffect(() => {
        const globalUp = () => { setActiveDragId(null); };
        if (activeDragId) window.addEventListener('mouseup', globalUp);
        return () => window.removeEventListener('mouseup', globalUp);
    }, [activeDragId]);

    // Timeline Labels Generator
    const TIMELINE_LABELS = useMemo(() => {
        const arr = [];
        const start = new Date(MOCK_START_DATE);
        start.setMonth(start.getMonth() - 3);

        for (let i = 0; i < NUM_MONTHS; i++) {
            const d = new Date(start);
            d.setMonth(start.getMonth() + i);
            arr.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
        }
        return arr;
    }, []);



    return (
        <div className={`bg-white ${minimal ? 'p-2 border-0' : 'p-4 border border-slate-200 rounded-xl shadow-sm'} flex flex-col`}
            style={{ height: minimal ? 'auto' : (containerHeight + 100) }}
        >

            {/* Main Chart Area with 2D Scroll */}
            <div
                ref={scrollContainerRef}
                className="border border-slate-300 rounded-lg bg-slate-200 flex-1 min-h-0 relative overflow-auto custom-scrollbar scroll-smooth"
                style={{
                    height: containerHeight,
                    scrollSnapType: 'y proximity'
                }}
            >
                {/* Scroll Snap Point: To Default View (0) */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1, scrollSnapAlign: 'start' }} />

                <div
                    className="relative"
                    style={{
                        width: Math.max(900, CHART_TOTAL_WIDTH + 60),
                        height: TOTAL_SCROLL_HEIGHT
                    }}
                >
                    {/* Sticky Top: Timeline Labels (X-Axis) */}
                    <div className="sticky top-0 left-0 right-0 h-[40px] z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 flex">
                        <div className="w-[60px] h-full shrink-0 border-r border-slate-200 bg-white"></div>
                        <div className="flex-1 relative overflow-hidden">
                            <svg width={CHART_TOTAL_WIDTH} height={40} className="absolute left-0 top-0">
                                {TIMELINE_LABELS.map((label, i) => {
                                    const x = monthToX(i);
                                    return (
                                        <text key={i} x={x} y={25} textAnchor="middle" className="text-xs fill-slate-900 font-bold uppercase">
                                            {label}
                                        </text>
                                    );
                                })}
                            </svg>
                        </div>
                    </div>

                    {/* Main Content Area: Y-Axis + Chart */}
                    <div className="flex" style={{ height: TOTAL_SCROLL_HEIGHT - 40 }}> {/* Subtract header height */}

                        {/* Sticky Left: Y-Axis */}
                        <div className="sticky left-0 w-[60px] shrink-0 border-r border-slate-500 bg-slate-200/95 backdrop-blur-sm z-20 h-full">
                            <svg width="100%" height="100%" className="overflow-visible">
                                {/* Grid Labels */}
                                {[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map(val => {
                                    const y = traitToY(val) - HEADER_HEIGHT; // Local to container below header
                                    return (
                                        <text
                                            key={val}
                                            x={50}
                                            y={y}
                                            dy="0.3em"
                                            textAnchor="end"
                                            className="text-xs fill-slate-900 font-bold"
                                        >
                                            {val.toFixed(1)}
                                        </text>
                                    );
                                })}
                                {/* NOB Label */}
                                <text
                                    x={45}
                                    y={traitToY(NOB_VALUE) - HEADER_HEIGHT}
                                    dy="0.3em"
                                    textAnchor="end"
                                    className="text-xs font-black fill-slate-900"
                                >
                                    NOB
                                </text>
                            </svg>
                        </div>

                        {/* Chart Body */}
                        <div className="relative flex-1">
                            <svg
                                ref={svgRef}
                                width={CHART_TOTAL_WIDTH}
                                height={TOTAL_SCROLL_HEIGHT - HEADER_HEIGHT}
                                className="block"
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            >
                                <g transform={`translate(0, -${HEADER_HEIGHT})`}>

                                    {/* Grid Lines */}
                                    {[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map(val => {
                                        const y = traitToY(val);
                                        return (
                                            <line key={val} x1={0} y1={y} x2={CHART_TOTAL_WIDTH} y2={y} stroke="#94a3b8" strokeDasharray="4 4" />
                                        );
                                    })}

                                    {/* Ideal RSCA Range Band */}
                                    <rect
                                        x="0"
                                        y={traitToY(IDEAL_RSCA_MAX)}
                                        width={CHART_TOTAL_WIDTH}
                                        height={traitToY(IDEAL_RSCA_MIN) - traitToY(IDEAL_RSCA_MAX)}
                                        fill="#10b981"
                                        fillOpacity="0.1"
                                    />
                                    <line
                                        x1={0} y1={traitToY(IDEAL_RSCA_MAX)}
                                        x2={CHART_TOTAL_WIDTH} y2={traitToY(IDEAL_RSCA_MAX)}
                                        stroke="#10b981" strokeWidth={1} strokeDasharray="4 4" strokeOpacity="0.5"
                                    />
                                    <line
                                        x1={0} y1={traitToY(IDEAL_RSCA_MIN)}
                                        x2={CHART_TOTAL_WIDTH} y2={traitToY(IDEAL_RSCA_MIN)}
                                        stroke="#10b981" strokeWidth={1} strokeDasharray="4 4" strokeOpacity="0.5"
                                    />

                                    {/* NOB Line */}
                                    <line
                                        x1={0}
                                        y1={traitToY(NOB_VALUE)}
                                        x2={CHART_TOTAL_WIDTH}
                                        y2={traitToY(NOB_VALUE)}
                                        stroke="#94a3b8"
                                        strokeWidth={2}
                                        strokeDasharray="6 4"
                                    />

                                    {/* Month Vertical Lines */}
                                    {Array.from({ length: NUM_MONTHS }).map((_, i) => (
                                        <line key={i} x1={(i + 1) * COL_WIDTH} y1={0} x2={(i + 1) * COL_WIDTH} y2={TOTAL_SCROLL_HEIGHT} stroke="#f1f5f9" strokeWidth={1} />
                                    ))}

                                    {/* Connections & Trends */}
                                    {impactConnections.map(conn => (
                                        <path
                                            key={`impact-${conn.id}`}
                                            d={`M ${conn.x1} ${conn.y1} L ${conn.x2} ${conn.y1} L ${conn.x2} ${conn.y2}`}
                                            fill="none"
                                            stroke={conn.color}
                                            strokeWidth={1}
                                            strokeDasharray="3 3"
                                            className="opacity-40"
                                        />
                                    ))}

                                    {trendLines.map((line, i) => (
                                        <g key={`trend-${i}`}>
                                            <line
                                                x1={line.x1} y1={line.y}
                                                x2={line.x2} y2={line.y}
                                                stroke="#a855f7"
                                                strokeWidth={3}
                                                strokeDasharray="6 4"
                                                className="opacity-70"
                                            />
                                            {i < trendLines.length - 1 && Math.abs(trendLines[i + 1].y - line.y) > 0.05 && (
                                                <line
                                                    x1={line.x2} y1={line.y}
                                                    x2={line.x2} y2={trendLines[i + 1].y}
                                                    stroke="#a855f7"
                                                    strokeWidth={1}
                                                    strokeDasharray="2 2"
                                                    className="opacity-40"
                                                />
                                            )}
                                        </g>
                                    ))}

                                    {/* Interactive Scatter Points */}
                                    {sortedPoints.map(p => {
                                        const isDragging = activeDragId === p.id;
                                        // Border Logic:
                                        // NOB -> White
                                        // > RSCA -> Green
                                        // Else (<= RSCA) -> Yellow
                                        let strokeColor = '#eab308';
                                        if (p.report.isNOB) {
                                            strokeColor = 'white';
                                        } else if (p.report.traitAverage > projectedRSCAVal) {
                                            strokeColor = '#22c55e';
                                        }

                                        const baseColor = getPointColor(p.report.type);
                                        const radius = isDragging ? 22 : 18;
                                        const isFinal = p.report.draftStatus === 'Final';

                                        if (p.report.type === 'Gain') {
                                            return (
                                                <g key={p.id}
                                                    transform={`translate(${p.x}, ${p.y})`}
                                                    className="cursor-default"
                                                >
                                                    <path
                                                        d="M0 -18 V18 M-18 0 H18"
                                                        stroke="#22c55e"
                                                        strokeWidth={4}
                                                        strokeLinecap="round"
                                                    />
                                                    <text y={28} textAnchor="middle" className="text-[9px] fill-slate-500 font-semibold uppercase pointer-events-none whitespace-nowrap">{formatName(p.report.memberName)}</text>
                                                </g>
                                            );
                                        }

                                        return (
                                            <g key={p.id}
                                                transform={`translate(${p.x}, ${p.y})`}
                                                className="cursor-ns-resize"
                                                onMouseDown={(e) => handleMouseDown(e, p.id)}
                                                onDoubleClick={(e) => {
                                                    e.stopPropagation();
                                                    handleReportDoubleClick(p.report);
                                                }}
                                            >
                                                {p.report.type === 'Special' ? (
                                                    <rect x={-radius + 2} y={-radius + 2} width={radius * 1.8} height={radius * 1.8}
                                                        fill={baseColor}
                                                        stroke={strokeColor}
                                                        strokeWidth={3}
                                                        transform="rotate(45)"
                                                        className={`shadow-md ${isDragging ? 'brightness-110' : ''}`} />
                                                ) : (
                                                    <circle
                                                        r={radius}
                                                        fill={baseColor}
                                                        fillOpacity={1}
                                                        stroke={strokeColor}
                                                        strokeWidth={3}
                                                        className={`shadow-md ${isDragging ? 'brightness-110' : ''}`}
                                                    />
                                                )}

                                                <text dy="0.35em" textAnchor="middle" className="text-[10px] fill-white font-bold pointer-events-none font-mono">
                                                    {p.report.isNOB ? 'NOB' : p.report.traitAverage.toFixed(2)}
                                                </text>

                                                {isFinal && (
                                                    <g transform="translate(10, -14)">
                                                        <circle r="8" fill="white" stroke="#64748b" strokeWidth="1" />
                                                        <Lock size={10} className="text-slate-600" x={-5} y={-5} />
                                                        <path d="M5.5 5.5v-1a2.5 2.5 0 0 0-5 0v1" transform="translate(-1.5, -4)" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
                                                        <rect x="-3" y="1" width="6" height="5" rx="1" fill="#64748b" />
                                                    </g>
                                                )}

                                                <text y={radius + 14} textAnchor="middle" className="text-[9px] fill-slate-500 font-semibold uppercase pointer-events-none whitespace-nowrap">{formatName(p.report.memberName)}</text>
                                            </g>
                                        );
                                    })}
                                </g>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend - Unchanged */}
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500 px-2 shrink-0">
                <div className="flex space-x-4">
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span>Periodic</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span>Transfer</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        <span>Gain</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 rounded-md transform rotate-45 bg-yellow-500"></div>
                        <span>Special</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span>Promotion</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-0.5 h-4 bg-purple-500 border-l border-dashed border-purple-500"></div>
                        <span>RS Detach</span>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-slate-400 border-[3px] border-green-400"></span>
                    <span>Above RSCA</span>
                </div>
            </div>
        </div>
    );
}
