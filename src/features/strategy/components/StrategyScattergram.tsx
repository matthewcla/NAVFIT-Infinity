import React, { useState, useRef, useMemo, useEffect } from 'react';
import { projectRSCA } from '@/features/strategy/logic/rsca';
import type { RosterMember } from '@/types/roster';
import type { SummaryGroup } from '@/types';
import { Lock, AlertCircle } from 'lucide-react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { THEME_COLORS } from '@/styles/theme';
import { useScatterLayout, type RSCAReport } from '../hooks/useScatterLayout';
import { useScatterChartDimensions } from '../hooks/useScatterChartDimensions';

// --- MOCK DATA FOR PROTOTYPING ---
const MOCK_START_DATE = new Date('2025-01-01');

const INITIAL_RSCA = 3.85;
const INITIAL_SIGNED_COUNT = 45;

interface StrategyScattergramProps {
    summaryGroups?: SummaryGroup[];
    roster?: RosterMember[];
    onOpenReport?: (memberId: string, name: string, rank?: string, reportId?: string) => void;
    onUpdateReport?: (reportId: string, newAverage: number) => void;
    minimal?: boolean;
    height?: number;
    focusDate?: string;
    flightPathMode?: boolean;
}

// --- STABLE CONSTANTS ---
const EMPTY_SUMMARY_GROUPS: SummaryGroup[] = [];
const EMPTY_ROSTER: RosterMember[] = [];

export function StrategyScattergram({ summaryGroups = EMPTY_SUMMARY_GROUPS, roster: propRoster = EMPTY_ROSTER, onOpenReport, onUpdateReport, minimal = false, height: propHeight, focusDate, flightPathMode = false }: StrategyScattergramProps) {
    // --- STATE ---
    // Use store for selected member context if flightPathMode is active
    const { selectedMemberId, roster: storeRoster } = useNavfitStore();

    // Prefer passed roster prop, fallback to store
    const roster = propRoster.length > 0 ? propRoster : storeRoster;

    const { selectedReportId, selectReport } = useNavfitStore();

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // --- DIMENSIONS & SCALES ---
    const {
        containerHeight,
        TOTAL_SCROLL_HEIGHT,
        CHART_TOTAL_WIDTH,
        HEADER_HEIGHT,
        COL_WIDTH,
        NUM_MONTHS,
        NOB_VALUE,
        MIN_TRAIT,
        IDEAL_RSCA_MIN,
        IDEAL_RSCA_MAX,
        ICON_RADIUS,
        traitToY,
        yToTrait,
        dateToX,
        monthToX
    } = useScatterChartDimensions({ height: propHeight, startDate: MOCK_START_DATE });

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
    }, [focusDate, dateToX]);

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

    // --- FLIGHT PATH / CONE LOGIC ---
    // Logic: Identify selected member, their current/projected report, and calculate bounds based on PRD.
    const flightPathData = useMemo(() => {
        if (!flightPathMode || !selectedMemberId) return null;

        const member = roster.find(m => m.id === selectedMemberId);
        if (!member || !member.prd) return null;

        // Find the "current" report for visualization (the one likely being edited or latest)
        // We look in displayReports because it contains the live drag value
        // Filter for this member
        const memberReports = displayReports.filter(r => r.memberId === selectedMemberId);
        if (memberReports.length === 0) return null;

        // Use the latest report by date as the "Current" point
        // Or if we specifically want the one that is NOT final?
        // Let's assume the latest report IS the one we are concerned with (Projected).
        const currentReport = memberReports.reduce((latest, r) =>
            new Date(r.date) > new Date(latest.date) ? r : latest
            , memberReports[0]);

        if (!currentReport) return null;

        // Calculate Attributes
        const currentGrade = currentReport.isNOB ? 0 : currentReport.traitAverage; // If NOB, flight path is weird, assume 0 or hide
        const currentDateX = dateToX(currentReport.date);
        const currentGradeY = traitToY(currentGrade);

        const prdX = dateToX(member.prd);
        const prdGradeY = traitToY(5.00);

        // --- Upper Bound Logic ---
        // Max grade allowed today without hitting 5.00 before PRD.
        // Formula: 5.00 - ((ReportsRemaining - 1) * Increment)
        // Default increment 0.10 for meaningful progression
        const reportsRemaining = member.reportsRemaining !== undefined ? member.reportsRemaining : 1;
        const PROGRESSION_STEP = 0.10;

        let maxGradeToday = 5.00;
        if (reportsRemaining > 1) {
            maxGradeToday = 5.00 - ((reportsRemaining - 1) * PROGRESSION_STEP);
        }
        // Clamp maxGradeToday?
        maxGradeToday = Math.min(5.00, Math.max(1.0, maxGradeToday));

        const upperBoundY = traitToY(maxGradeToday);

        // Check if grade exceeds MAX POSSIBLE today
        const isOverLimit = currentGrade > (maxGradeToday + 0.001); // epsilon

        return {
            currentReport,
            currentX: currentDateX,
            currentY: currentGradeY,
            prdX,
            prdY: prdGradeY,
            upperStartY: upperBoundY,
            isOverLimit,
            maxGradeToday
        };
    }, [flightPathMode, selectedMemberId, roster, displayReports, dateToX, traitToY]);


    // --- DERIVED DATA ---
    const projectedRSCAVal = useMemo(() => {
        const itas = displayReports.filter(r => !r.isNOB).map(r => r.traitAverage);
        if (itas.length === 0) return INITIAL_RSCA;
        return projectRSCA(INITIAL_RSCA, INITIAL_SIGNED_COUNT, itas);
    }, [displayReports]);

    // --- USE CUSTOM LAYOUT HOOK ---
    const { points, trendLines, impactConnections } = useScatterLayout({
        displayReports,
        startDate: MOCK_START_DATE,
        traitToY,
        monthToX,
        chartTotalWidth: CHART_TOTAL_WIDTH
    });

    const sortedPoints = useMemo(() => {
        if (zOrder.length === 0) return points;
        const orderMap = new Map(zOrder.map((id, index) => [id, index]));
        return [...points].sort((a, b) => {
            const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : -1;
            const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : -1;
            return indexA - indexB;
        });
    }, [points, zOrder]);


    // --- UTILS ---
    const formatName = (memberName: string) => {
        const parts = memberName.split(' ');
        const namePart = parts.slice(1).join(' ');
        return namePart.replace(',', '');
    };

    const getPointColor = (type: string) => {
        switch (type) {
            case 'Periodic': return THEME_COLORS.periodic;
            case 'Transfer': return THEME_COLORS.transfer;
            case 'Detachment': return THEME_COLORS.transfer;
            case 'Gain': return THEME_COLORS.gain;
            case 'Special': return THEME_COLORS.special;
            case 'Promotion': return THEME_COLORS.promotion;
            default: return THEME_COLORS.gain;
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
        // clientY is relative to the SVG top (which is rendered AFTER the headers)
        // traitToY returns Y relative to the SCROLL CONTAINER TOP (0).
        // The SVG starts at Y = HEADER_HEIGHT relative to the scroll container.
        const svgRelativeY = e.clientY - rect.top;

        // Convert to Scroll Container Y
        const scrollContainerY = svgRelativeY + HEADER_HEIGHT;

        let newTrait = 0;
        let isNowNOB = false;

        newTrait = Number(yToTrait(scrollContainerY).toFixed(2));

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
    }, [NUM_MONTHS]);



    return (
        <div className={`bg-white ${minimal ? 'p-2 border-0' : 'p-4 border border-slate-200 rounded-xl shadow-sm'} flex flex-col`}
            style={{ height: minimal ? 'auto' : (containerHeight + 100) }}
        >

            {/* Main Chart Area with 2D Scroll */}
            <div
                ref={scrollContainerRef}
                className="border border-slate-300 rounded-lg bg-white flex-1 min-h-0 relative overflow-auto custom-scrollbar scroll-smooth"
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
                                            <line key={val} x1={0} y1={y} x2={CHART_TOTAL_WIDTH} y2={y} stroke={THEME_COLORS.slate400} strokeDasharray="4 4" />
                                        );
                                    })}

                                    {/* Ideal RSCA Range Band */}
                                    <rect
                                        x="0"
                                        y={traitToY(IDEAL_RSCA_MAX)}
                                        width={CHART_TOTAL_WIDTH}
                                        height={traitToY(IDEAL_RSCA_MIN) - traitToY(IDEAL_RSCA_MAX)}
                                        fill={THEME_COLORS.success}
                                        fillOpacity="0.1"
                                    />
                                    <line
                                        x1={0} y1={traitToY(IDEAL_RSCA_MAX)}
                                        x2={CHART_TOTAL_WIDTH} y2={traitToY(IDEAL_RSCA_MAX)}
                                        stroke={THEME_COLORS.success} strokeWidth={1} strokeDasharray="4 4" strokeOpacity="0.5"
                                    />
                                    <line
                                        x1={0} y1={traitToY(IDEAL_RSCA_MIN)}
                                        x2={CHART_TOTAL_WIDTH} y2={traitToY(IDEAL_RSCA_MIN)}
                                        stroke={THEME_COLORS.success} strokeWidth={1} strokeDasharray="4 4" strokeOpacity="0.5"
                                    />

                                    {/* NOB Line */}
                                    <line
                                        x1={0}
                                        y1={traitToY(NOB_VALUE)}
                                        x2={CHART_TOTAL_WIDTH}
                                        y2={traitToY(NOB_VALUE)}
                                        stroke={THEME_COLORS.slate400}
                                        strokeWidth={2}
                                        strokeDasharray="6 4"
                                    />

                                    {/* Month Vertical Lines */}
                                    {Array.from({ length: NUM_MONTHS }).map((_, i) => (
                                        <line key={i} x1={(i + 1) * COL_WIDTH} y1={0} x2={(i + 1) * COL_WIDTH} y2={TOTAL_SCROLL_HEIGHT} stroke={THEME_COLORS.slate100} strokeWidth={1} />
                                    ))}

                                    {/* Flight Path Cone (Behind points) */}
                                    {flightPathData && (
                                        <g className="pointer-events-none">
                                            {/* Cone Fill */}
                                            <path
                                                d={`M ${flightPathData.currentX} ${flightPathData.currentY} L ${flightPathData.prdX} ${flightPathData.prdY} L ${flightPathData.currentX} ${flightPathData.upperStartY} Z`}
                                                fill={flightPathData.isOverLimit ? THEME_COLORS.red200 : THEME_COLORS.green100} // Red tint if over, Green tint if safe
                                                fillOpacity="0.4"
                                            />
                                            {/* Lower Bound Line (Linear to 5.0) */}
                                            <line
                                                x1={flightPathData.currentX} y1={flightPathData.currentY}
                                                x2={flightPathData.prdX} y2={flightPathData.prdY}
                                                stroke={flightPathData.isOverLimit ? THEME_COLORS.danger : THEME_COLORS.promotion}
                                                strokeWidth={2}
                                                strokeDasharray="4 2"
                                            />
                                            {/* Upper Bound Line (Max Headroom) */}
                                            <line
                                                x1={flightPathData.currentX} y1={flightPathData.upperStartY}
                                                x2={flightPathData.prdX} y2={flightPathData.prdY}
                                                stroke={THEME_COLORS.danger}
                                                strokeWidth={1}
                                                strokeDasharray="2 2"
                                                strokeOpacity="0.6"
                                            />

                                            {/* Tooltip for Over Limit */}
                                            {flightPathData.isOverLimit && (
                                                <g transform={`translate(${flightPathData.currentX - 10}, ${flightPathData.currentY - 40})`}>
                                                    <rect x="-100" y="-24" width="200" height="24" rx="4" fill={THEME_COLORS.red100} stroke={THEME_COLORS.danger} strokeWidth="1" />
                                                    <text x="0" y="-8" textAnchor="middle" className="text-[10px] fill-red-700 font-bold">
                                                        No headroom for future progression
                                                    </text>
                                                </g>
                                            )}
                                        </g>
                                    )}

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
                                                stroke={THEME_COLORS.purple500}
                                                strokeWidth={3}
                                                strokeDasharray="6 4"
                                                className="opacity-70"
                                            />
                                            {i < trendLines.length - 1 && Math.abs(trendLines[i + 1].y - line.y) > 0.05 && (
                                                <line
                                                    x1={line.x2} y1={line.y}
                                                    x2={line.x2} y2={trendLines[i + 1].y}
                                                    stroke={THEME_COLORS.purple500}
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
                                        // Flight Path Override: Red if Over Limit
                                        let strokeColor: string = THEME_COLORS.special;

                                        // Highlight Selected Member if in Flight Path Mode
                                        const isSelected = selectedMemberId === p.report.memberId || selectedReportId === p.report.id;
                                        const opacity = (flightPathData && !isSelected) ? 0.3 : 1; // Dim others in Flight Mode

                                        // Default Logic
                                        if (p.report.isNOB) {
                                            strokeColor = 'white';
                                        } else if (p.report.traitAverage > projectedRSCAVal) {
                                            strokeColor = THEME_COLORS.promotion;
                                        }

                                        // Flight Path Override
                                        if (flightPathData && p.report.id === flightPathData.currentReport.id && flightPathData.isOverLimit) {
                                            strokeColor = THEME_COLORS.danger; // Red
                                        }

                                        const baseColor = getPointColor(p.report.type);
                                        const radius = isDragging ? ICON_RADIUS : 18;
                                        const isFinal = p.report.draftStatus === 'Final';

                                        if (p.report.type === 'Gain') {
                                            return (
                                                <g key={p.id}
                                                    transform={`translate(${p.x}, ${p.y})`}
                                                    className="cursor-default"
                                                    opacity={opacity}
                                                >
                                                    <path
                                                        d="M0 -18 V18 M-18 0 H18"
                                                        stroke={THEME_COLORS.promotion}
                                                        strokeWidth={4}
                                                        strokeLinecap="round"
                                                    />
                                                    <g className="opacity-0 hover:opacity-100 transition-opacity">
                                                        <rect x="-60" y="20" width="120" height="20" rx="4" fill="rgba(0,0,0,0.8)" />
                                                        <text y={34} textAnchor="middle" className="text-[10px] fill-white font-semibold uppercase pointer-events-none whitespace-nowrap">{formatName(p.report.memberName)}</text>
                                                    </g>
                                                </g>
                                            );
                                        }

                                        return (
                                            <g key={p.id}
                                                transform={`translate(${p.x}, ${p.y})`}
                                                className="cursor-ns-resize group"
                                                opacity={opacity}
                                                onMouseDown={(e) => handleMouseDown(e, p.id)}
                                                onClick={(e) => {
                                                    // Single click selects member/report
                                                    e.stopPropagation();
                                                    if (selectReport) selectReport(p.report.id);

                                                    // Also update member selection for context if needed
                                                    if (useNavfitStore.getState().selectMember) {
                                                        useNavfitStore.getState().selectMember(p.report.memberId);
                                                    }
                                                }}
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
                                                        <circle r="8" fill="white" stroke={THEME_COLORS.slate500} strokeWidth="1" />
                                                        <Lock size={10} className="text-slate-600" x={-5} y={-5} />
                                                        <path d="M5.5 5.5v-1a2.5 2.5 0 0 0-5 0v1" transform="translate(-1.5, -4)" fill="none" stroke={THEME_COLORS.slate500} strokeWidth="1.5" strokeLinecap="round" />
                                                        <rect x="-3" y="1" width="6" height="5" rx="1" fill={THEME_COLORS.slate500} />
                                                    </g>
                                                )}

                                                {flightPathData && p.report.id === flightPathData.currentReport.id && flightPathData.isOverLimit && (
                                                    <g transform="translate(-14, -14)">
                                                        <circle r="8" fill={THEME_COLORS.red100} stroke={THEME_COLORS.danger} strokeWidth="1" />
                                                        <AlertCircle size={10} className="text-red-500" x={-5} y={-5} />
                                                    </g>
                                                )}

                                                {/* Text Label - Hover Only or Selected */}
                                                <g className={`transition-opacity ${isSelected || isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                    <rect x="-60" y={radius + 8} width="120" height="18" rx="4" fill="rgba(255,255,255,0.9)" stroke={THEME_COLORS.slate300} strokeWidth="1" />
                                                    <text y={radius + 20} textAnchor="middle" className="text-[10px] fill-slate-700 font-bold uppercase pointer-events-none whitespace-nowrap">{formatName(p.report.memberName)}</text>
                                                </g>
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
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={THEME_COLORS.promotion} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
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
