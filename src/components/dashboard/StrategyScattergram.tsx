import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Target, Wand2 } from 'lucide-react';
import { projectRSCA } from '../../lib/engines/rsca';
import { optimizeStrategy } from '../../lib/engines/strategy';
import type { RosterMember } from '../../types/roster';
import type { SummaryGroup } from '../../types';

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
}

export function StrategyScattergram({ summaryGroups = [], roster = [], onOpenReport, onUpdateReport, minimal = false, height: propHeight }: StrategyScattergramProps) {
    // --- STATE ---
    const [reports, setReports] = useState<RSCAReport[]>(() => {
        // If summaryGroups passed, flatten them to RSCAReport[]
        if (summaryGroups && summaryGroups.length > 0) {
            return summaryGroups.flatMap(group =>
                group.reports.map(r => ({
                    id: r.id,
                    memberId: r.memberId,
                    memberName: r.memberId,
                    rawName: "Unknown",
                    rank: group.name.split(' ')[0],
                    summaryGroup: group.name,
                    date: r.periodEndDate,
                    monthIndex: new Date(r.periodEndDate).getMonth(),
                    type: (r.type === 'Detachment' ? 'Detachment' : r.type) as any,
                    traitAverage: r.traitAverage || 3.0,
                    isNOB: r.promotionRecommendation === 'NOB',
                    initialTraitAverage: r.traitAverage || 3.0,
                    draftStatus: r.draftStatus
                }))
            );
        }
        return [];
    });

    // If props change, update state
    useEffect(() => {
        if (summaryGroups) {
            const mapped = summaryGroups.flatMap(group =>
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
                        type: (r.type === 'Detachment' ? 'Detachment' : r.type) as any,
                        traitAverage: r.traitAverage || 3.0,
                        isNOB: r.promotionRecommendation === 'NOB',
                        initialTraitAverage: r.traitAverage || 3.0,
                        draftStatus: r.draftStatus
                    };
                })
            );
            setReports(mapped);
        }
    }, [summaryGroups, roster]);

    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    // Z-Index Management (rendering order)
    const [zOrder, setZOrder] = useState<string[]>([]);

    const svgRef = useRef<SVGSVGElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // --- DIMENSIONS & SCALES ---
    const height = propHeight || 500;
    const padding = minimal ? { top: 40, bottom: 30 } : { top: 60, bottom: 40 };

    // Y-Axis Config
    const CHART_H = height - padding.top - padding.bottom;

    // X-Axis Config
    const NUM_MONTHS = 24;
    const COL_WIDTH = 96;
    const CHART_TOTAL_WIDTH = NUM_MONTHS * COL_WIDTH;

    const NOB_TRAIT_VALUE = 5.5;
    const MIN_TRAIT = 1.0;
    const MAX_TRAIT = 5.5;

    const traitToY = (trait: number) => {
        const range = MAX_TRAIT - MIN_TRAIT;
        const normalized = (trait - MIN_TRAIT) / range;
        return CHART_H - (normalized * CHART_H) + padding.top;
    };

    const yToTrait = (y: number) => {
        const relativeY = y - padding.top;
        const normalized = 1 - (relativeY / CHART_H);
        return MIN_TRAIT + (normalized * (MAX_TRAIT - MIN_TRAIT));
    };

    const monthToX = (monthIndex: number) => {
        return (monthIndex * COL_WIDTH) + (COL_WIDTH / 2);
    };

    // Auto-Scroll Logic
    const handleJumpToNow = () => {
        if (scrollContainerRef.current) {
            const now = new Date();
            const start = new Date(MOCK_START_DATE);
            const diffYears = now.getFullYear() - start.getFullYear();
            const diffMonths = now.getMonth() - start.getMonth();
            const totalMonthsDiff = (diffYears * 12) + diffMonths;
            const currentMonthIndex = totalMonthsDiff + 3;

            const scrollX = (currentMonthIndex * COL_WIDTH) - (scrollContainerRef.current.clientWidth / 2) + (COL_WIDTH / 2);
            scrollContainerRef.current.scrollTo({ left: Math.max(0, scrollX), behavior: 'smooth' });
        }
    };

    // Initial Scroll
    useEffect(() => {
        const timer = setTimeout(() => {
            handleJumpToNow();
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // --- DERIVED DATA ---
    // No more internal filtering. Just use 'reports' directly.
    const projectedRSCAVal = useMemo(() => {
        const itas = reports.filter(r => !r.isNOB).map(r => r.traitAverage);
        if (itas.length === 0) return INITIAL_RSCA;
        return projectRSCA(INITIAL_RSCA, INITIAL_SIGNED_COUNT, itas);
    }, [reports]);

    const points: ScatterPoint[] = useMemo(() => {
        let rawPoints = reports.map(r => ({
            id: r.id,
            // Shift +3 months to align with display timeline start (which starts 3 months before mock start)
            x: monthToX(r.monthIndex + 3),
            y: traitToY((r.isNOB || r.type === 'Gain') ? NOB_TRAIT_VALUE : r.traitAverage),
            report: r
        }));

        // Collision Handling
        const COLLISION_RADIUS = 22;
        const ITERATIONS = 3;

        for (let iter = 0; iter < ITERATIONS; iter++) {
            rawPoints.sort((a, b) => a.x - b.x);
            for (let i = 0; i < rawPoints.length; i++) {
                const p1 = rawPoints[i];
                for (let j = i + 1; j < rawPoints.length; j++) {
                    const p2 = rawPoints[j];
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
        return rawPoints;
    }, [reports]);

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
        reports.forEach(r => {
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

        const finalConnections = reports.map(r => {
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
    }, [reports]);

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
        const clientY = e.clientY - rect.top;

        let newTrait = 0;
        let isNowNOB = false;

        newTrait = Number(yToTrait(clientY).toFixed(2));

        if (newTrait > 5.10) {
            isNowNOB = true;
        } else {
            isNowNOB = false;
            newTrait = Math.max(MIN_TRAIT, Math.min(5.0, newTrait));
        }

        setReports(prev => prev.map(r =>
            r.id === activeDragId ? {
                ...r,
                traitAverage: isNowNOB ? 0 : newTrait,
                isNOB: isNowNOB
            } : r
        ));
    };

    const handleMouseUp = () => {
        if (activeDragId && onUpdateReport) {
            const r = reports.find(r => r.id === activeDragId);
            if (r) {
                onUpdateReport(r.id, r.traitAverage);
            }
        }
        setActiveDragId(null);
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

    const handleOptimize = () => {
        const currentProjection = projectedRSCAVal || INITIAL_RSCA;
        const optimized = optimizeStrategy(reports, currentProjection);
        setReports(optimized);
    };


    return (
        <div className={`bg-white ${minimal ? 'p-2 border-0' : 'p-6 border border-slate-200 rounded-xl shadow-sm'} h-full flex flex-col`}>
            {/* Header: Jump to Now on LEFT, Toggles Removed */}
            <div className={`flex justify-between items-center ${minimal ? 'mb-2' : 'mb-4'} flex-shrink-0`}>
                {/* Left: Jump to Now & Optimize */}
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handleJumpToNow}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors border border-slate-200"
                        title="Jump to Current Month"
                    >
                        <Target size={minimal ? 16 : 20} />
                    </button>
                    <button
                        onClick={handleOptimize}
                        className={`flex items-center space-x-2 px-3 py-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-full transition-colors border border-purple-200 ${minimal ? 'text-xs' : ''}`}
                        title="Auto-Optimize Strategy (Seniority Based)"
                    >
                        <Wand2 size={minimal ? 14 : 16} />
                        <span className="text-xs font-bold">Optimize</span>
                    </button>
                </div>

                {/* Right: Controls Removed */}
            </div>

            {/* Main Chart Area with Frozen Y-Axis */}
            <div className="border border-slate-100 rounded-lg bg-slate-50/50 flex-1 min-h-0 relative flex overflow-hidden">

                {/* Sticky Y-Axis */}
                <div className="w-[60px] shrink-0 border-r border-slate-200 bg-white/80 backdrop-blur-sm z-20 flex flex-col relative" style={{ height: height }}>
                    <svg width="100%" height="100%" className="overflow-visible">
                        {/* Grid Labels */}
                        {[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map(val => {
                            const y = traitToY(val);
                            return (
                                <text
                                    key={val}
                                    x={50}
                                    y={y}
                                    dy="0.3em"
                                    textAnchor="end"
                                    className="text-xs fill-slate-400 font-semibold"
                                >
                                    {val.toFixed(1)}
                                </text>
                            );
                        })}
                        {/* NOB Label */}
                        <text
                            x={45}
                            y={traitToY(NOB_TRAIT_VALUE)}
                            dy="0.3em"
                            textAnchor="end"
                            className="text-xs font-bold fill-slate-400"
                        >
                            NOB
                        </text>
                    </svg>
                </div>

                {/* Scrollable Content */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 min-w-0 overflow-x-auto custom-scrollbar relative"
                >
                    <svg
                        ref={svgRef}
                        width={CHART_TOTAL_WIDTH}
                        height={height}
                        className="block"
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        {/* Grid Lines */}
                        {[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map(val => {
                            const y = traitToY(val);
                            return (
                                <line key={val} x1={0} y1={y} x2={CHART_TOTAL_WIDTH} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                            );
                        })}

                        {/* NOB Line */}
                        <line
                            x1={0}
                            y1={traitToY(NOB_TRAIT_VALUE)}
                            x2={CHART_TOTAL_WIDTH}
                            y2={traitToY(NOB_TRAIT_VALUE)}
                            stroke="#94a3b8"
                            strokeWidth={2}
                            strokeDasharray="6 4"
                        />

                        {/* Month Vertical Lines */}
                        {Array.from({ length: NUM_MONTHS }).map((_, i) => (
                            <line key={i} x1={(i + 1) * COL_WIDTH} y1={0} x2={(i + 1) * COL_WIDTH} y2={height} stroke="#f1f5f9" strokeWidth={1} />
                        ))}

                        {/* Top X-Axis Labels */}
                        {TIMELINE_LABELS.map((label, i) => {
                            const x = monthToX(i);
                            return (
                                <text key={i} x={x} y={30} textAnchor="middle" className="text-xs fill-slate-400 font-semibold uppercase">
                                    {label}
                                </text>
                            );
                        })}

                        {/* Connections from Reports to RSCA Impact */}
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

                        {/* Stepped RSCA Trend Lines */}
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
                            const isAboveRSCA = p.report.traitAverage >= projectedRSCAVal;
                            const baseColor = getPointColor(p.report.type);
                            const radius = isDragging ? 22 : 18;

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
                                        <rect x={-radius + 2} y={-radius + 2} width={radius * 1.8} height={radius * 1.8} fill={baseColor} stroke={isAboveRSCA ? '#4ade80' : 'white'} strokeWidth={isAboveRSCA ? 3 : 2} transform="rotate(45)" className={`shadow-md ${isDragging ? 'brightness-110' : ''}`} />
                                    ) : (
                                        <circle
                                            r={radius}
                                            fill={p.report.draftStatus === 'Projected' ? 'white' : baseColor}
                                            fillOpacity={p.report.draftStatus === 'Projected' ? 0.3 : 1}
                                            stroke={p.report.draftStatus === 'Projected' ? baseColor : (isAboveRSCA ? '#4ade80' : 'white')}
                                            strokeWidth={p.report.draftStatus === 'Projected' ? 2 : (isAboveRSCA ? 3 : 2)}
                                            strokeDasharray={p.report.draftStatus === 'Projected' ? "3 1" : undefined}
                                            className={`shadow-md ${isDragging ? 'brightness-110' : ''}`}
                                        />
                                    )}
                                    <text dy="0.35em" textAnchor="middle" className="text-[10px] fill-white font-bold pointer-events-none font-mono">
                                        {p.report.isNOB ? 'NOB' : p.report.traitAverage.toFixed(2)}
                                    </text>
                                    <text y={radius + 14} textAnchor="middle" className="text-[9px] fill-slate-500 font-semibold uppercase pointer-events-none whitespace-nowrap">{formatName(p.report.memberName)}</text>
                                </g>
                            );
                        })}
                    </svg>
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
};
