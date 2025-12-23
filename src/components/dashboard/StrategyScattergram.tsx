import React, { useState, useRef, useMemo, useEffect } from 'react';
import { projectRSCA } from '../../lib/engines/rsca';
import { RscaFlexibilityWidget } from './RscaFlexibilityWidget';

// --- MOCK DATA FOR PROTOTYPING ---
const MOCK_START_DATE = new Date('2025-01-01');

const INITIAL_RSCA = 3.85;
const INITIAL_SIGNED_COUNT = 45;
const TARGET_RANGE = { min: 3.80, max: 4.00 };

// Types for detailed member info
interface MemberProfile {
    name: string;
    rank: string;
    designator?: string;
    rating?: string;
}

const MEMBERS: MemberProfile[] = [
    { name: "Mitchell, P.", rank: "O-3", designator: "1310" }, // URL
    { name: "Kazansky, T.", rank: "O-3", designator: "1310" }, // URL
    { name: "Bradshaw, N.", rank: "O-3", designator: "1310" }, // URL
    { name: "Metcalf, M.", rank: "O-4", designator: "1110" }, // URL
    { name: "Seresin, J.", rank: "O-2", designator: "1310" }, // URL
    { name: "Floyd, B.", rank: "E-6", rating: "OS" },          // Crew
    { name: "Trace, R.", rank: "E-6", rating: "BM" },          // Crew
    { name: "Connection, S.", rank: "O-3", designator: "1200" }, // HR (RL)
    { name: "Fanboy, M.", rank: "O-2", designator: "1310" },   // URL
    { name: "Payback, R.", rank: "O-3", designator: "1310" }, // URL
    { name: "Phoenix, N.", rank: "O-3", designator: "1310" },  // URL
    { name: "Bob, F.", rank: "O-3", designator: "1310" },      // URL
    { name: "Cates, B.", rank: "E-7", rating: "QMC" },         // CPO
    { name: "Singer, A.", rank: "E-8", rating: "BMCS" },       // CPO
];

// Helper to determine summary group
const getSummaryGroup = (m: MemberProfile): string => {
    if (m.designator) {
        if (['1110', '1120', '1310', '1320'].includes(m.designator)) return `URL ${m.rank}`;
        if (['1200', '1810', '1830'].includes(m.designator)) return `RL ${m.rank}`;
        if (m.designator.startsWith('3')) return `SC ${m.rank}`;
        return `OFF ${m.rank}`;
    }
    // Enlisted
    if (['E-7', 'E-8', 'E-9'].includes(m.rank)) return `CPO ${m.rank}`; // Simplified
    return `ENL ${m.rank}`;
};

const getShortRank = (rank: string) => {
    const map: Record<string, string> = {
        'O-1': 'ENS', 'O-2': 'LTJG', 'O-3': 'LT', 'O-4': 'LCDR', 'O-5': 'CDR', 'O-6': 'CAPT',
        'E-4': 'PO3', 'E-5': 'PO2', 'E-6': 'PO1', 'E-7': 'CPO', 'E-8': 'SCPO', 'E-9': 'MCPO'
    };
    return map[rank] || rank;
};

// Generate reports linked to specific members for consistency
const generateMockReports = () => {
    const reports = [];
    // Generate 2-3 reports per member to show connections
    for (let i = 0; i < MEMBERS.length; i++) {
        const m = MEMBERS[i];
        const numReports = 1 + Math.floor(Math.random() * 2); // 1 or 2 reports

        let lastDate = new Date(MOCK_START_DATE);
        // Randomize start slightly
        lastDate.setMonth(lastDate.getMonth() + Math.floor(Math.random() * 3));

        for (let r = 0; r < numReports; r++) {
            const monthOffset = r === 0 ? 0 : 4 + Math.floor(Math.random() * 4); // Gap between reports
            const date = new Date(lastDate);
            date.setMonth(date.getMonth() + monthOffset);

            if (date.getMonth() > 11) continue; // Keep within year for demo


            let type: 'Periodic' | 'Transfer' | 'Gain' | 'Special' = 'Periodic';
            const rand = Math.random();
            if (r === 0 && rand > 0.85) type = 'Gain'; // First might be gain
            else if (r === numReports - 1 && rand > 0.85) type = 'Transfer'; // Last might be transfer
            else if (rand > 0.95) type = 'Special'; // Occasional special

            reports.push({
                id: `r-${i}-${r}`,
                memberId: `m-${i}`,
                memberName: `${getShortRank(m.rank)} ${m.name}`,
                rawName: m.name,
                rank: m.rank,
                summaryGroup: getSummaryGroup(m),
                date: date.toISOString().split('T')[0],
                monthIndex: date.getMonth(),
                type: type,
                traitAverage: 3.5 + (Math.random() * 1.5), // 3.5 to 5.0
                initialTraitAverage: 0 // set later
            });
            lastDate = date;
        }
    }
    // Sort by date/member for ensuring lines draw correctly logic (though mapping by ID is better)
    return reports.map(r => ({ ...r, initialTraitAverage: r.traitAverage, isNOB: false }));
};

const INITIAL_REPORTS = generateMockReports();

interface ScatterPoint {
    id: string;
    originalX: number;
    x: number; // pixel (render)
    y: number; // pixel (render)
    report: typeof INITIAL_REPORTS[0];
}

interface TrendPoint {
    monthIndex: number;
    x: number;
    y: number;
    value: number;
}

export const StrategyScattergram = () => {
    // --- STATE ---
    const [reports, setReports] = useState(INITIAL_REPORTS);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    // Toggle State
    const [macroFilter, setMacroFilter] = useState<'Wardroom' | 'CPO' | 'Crew'>('Wardroom');
    const [selectedSummaryGroup, setSelectedSummaryGroup] = useState<string>('');

    // Z-Index Management (rendering order)
    const [zOrder, setZOrder] = useState<string[]>([]);

    const svgRef = useRef<SVGSVGElement>(null);

    // --- FILTERS ---
    // ... (unchanged)
    // 1. Get available groups for current macro
    const availableGroups = useMemo(() => {
        const groups = new Set<string>();
        reports.forEach(r => {
            const isOfficer = r.rank.startsWith('O') || r.rank.startsWith('W');
            const isCPO = ['E-7', 'E-8', 'E-9'].includes(r.rank);

            let match = false;
            if (macroFilter === 'Wardroom' && isOfficer) match = true;
            else if (macroFilter === 'CPO' && isCPO) match = true;
            else if (macroFilter === 'Crew' && !isOfficer && !isCPO) match = true;

            if (match) groups.add(r.summaryGroup);
        });
        return Array.from(groups).sort();
    }, [reports, macroFilter]);

    useEffect(() => {
        if (!selectedSummaryGroup || !availableGroups.includes(selectedSummaryGroup)) {
            if (availableGroups.length > 0) {
                setSelectedSummaryGroup(availableGroups[0]);
            } else {
                setSelectedSummaryGroup('');
            }
        }
    }, [availableGroups, selectedSummaryGroup]);

    const filteredReports = useMemo(() => {
        if (!selectedSummaryGroup) return [];
        return reports.filter(r => r.summaryGroup === selectedSummaryGroup);
    }, [reports, selectedSummaryGroup]);


    // --- DIMENSIONS & SCALES ---
    const width = 800;
    const height = 500;
    const padding = { top: 60, right: 40, bottom: 80, left: 60 }; // Increased bottom padding for labels

    // Add internal buffer for X axis to prevent overlap with Y axis labels
    const X_AXIS_BUFFER = 40;
    const chartWidth = width - padding.left - padding.right - X_AXIS_BUFFER;
    const chartHeight = height - padding.top - padding.bottom;

    // NOB Zone now a specific line above 5.0
    const NOB_TRAIT_VALUE = 5.25;

    // Y-Axis: 1.0 to 5.5 (to include NOB line)
    const MIN_TRAIT = 1.0;
    const MAX_TRAIT = 5.5;

    const traitToY = (trait: number) => {
        const range = MAX_TRAIT - MIN_TRAIT;
        const normalized = (trait - MIN_TRAIT) / range;
        return chartHeight - (normalized * chartHeight) + padding.top;
    };

    const yToTrait = (y: number) => {
        const relativeY = y - padding.top;
        const normalized = 1 - (relativeY / chartHeight);
        return MIN_TRAIT + (normalized * (MAX_TRAIT - MIN_TRAIT));
    };

    const monthToX = (monthIndex: number) => {
        const step = chartWidth / 11;
        // Start after the buffer
        return padding.left + X_AXIS_BUFFER + (monthIndex * step);
    };

    // --- DERIVED DATA ---
    const projectedRSCAVal = useMemo(() => {
        const itas = filteredReports.filter(r => !r.isNOB).map(r => r.traitAverage);
        if (itas.length === 0) return INITIAL_RSCA;
        return projectRSCA(INITIAL_RSCA, INITIAL_SIGNED_COUNT, itas);
    }, [filteredReports]);

    const points: ScatterPoint[] = useMemo(() => {
        // 1. Calculate raw positions
        let rawPoints = filteredReports.map(r => ({
            id: r.id,
            originalX: monthToX(r.monthIndex),
            x: monthToX(r.monthIndex),
            // Dynamically calculate y based on trait value (NOB is just another value now)
            y: traitToY(r.isNOB ? NOB_TRAIT_VALUE : r.traitAverage),
            report: r
        }));

        // 2. Lateral Offset Collision Handling
        const COLLISION_RADIUS = 22; // approx icon size
        const ITERATIONS = 3;

        for (let iter = 0; iter < ITERATIONS; iter++) {
            // Sort by X to process left-to-right
            rawPoints.sort((a, b) => a.x - b.x);

            for (let i = 0; i < rawPoints.length; i++) {
                const p1 = rawPoints[i];
                for (let j = i + 1; j < rawPoints.length; j++) {
                    const p2 = rawPoints[j];

                    // Optimization: If X distance is large, break
                    if (p2.x - p1.x > COLLISION_RADIUS) break;

                    // Check Y overlap (visual distance in local scaled group space)
                    if (Math.abs(p1.y - p2.y) < COLLISION_RADIUS) {
                        // Overlap detected! Shift laterally.
                        const overlap = COLLISION_RADIUS - (p2.x - p1.x);
                        // Distribute shift
                        const shift = Math.max(0.5, overlap / 2);

                        p1.x -= shift;
                        p2.x += shift;
                    }
                }
            }
        }

        return rawPoints;
    }, [filteredReports]);

    const sortedPoints = useMemo(() => {
        if (zOrder.length === 0) return points;
        const orderMap = new Map(zOrder.map((id, index) => [id, index]));
        return [...points].sort((a, b) => {
            const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : -1;
            const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : -1;
            return indexA - indexB;
        });
    }, [points, zOrder]);

    const connections = useMemo(() => {
        const memberReports: Record<string, ScatterPoint[]> = {};
        points.forEach(p => {
            if (!memberReports[p.report.memberId]) memberReports[p.report.memberId] = [];
            memberReports[p.report.memberId].push(p);
        });

        const lines: { x1: number, y1: number, x2: number, y2: number, id: string }[] = [];
        Object.values(memberReports).forEach(pts => {
            pts.sort((a, b) => a.report.monthIndex - b.report.monthIndex);
            for (let i = 0; i < pts.length - 1; i++) {
                lines.push({
                    id: `${pts[i].id}-${pts[i + 1].id}`,
                    x1: pts[i].x,
                    y1: pts[i].y,
                    x2: pts[i + 1].x,
                    y2: pts[i + 1].y
                });
            }
        });
        return lines;
    }, [points]);

    const trendPoints: TrendPoint[] = useMemo(() => {
        const pts: TrendPoint[] = [];
        for (let m = 0; m < 12; m++) {
            const reportsUpToNow = filteredReports.filter(r => r.monthIndex <= m && r.type !== 'Gain' && !r.isNOB);
            if (reportsUpToNow.length === 0) continue;

            const itas = reportsUpToNow.map(r => r.traitAverage);
            const val = projectRSCA(INITIAL_RSCA, INITIAL_SIGNED_COUNT, itas);

            pts.push({
                monthIndex: m,
                x: monthToX(m),
                y: traitToY(val),
                value: val
            });
        }
        return pts;
    }, [filteredReports]);

    // --- UTILS ---
    const formatName = (memberName: string) => {
        const parts = memberName.split(' ');
        const namePart = parts.slice(1).join(' '); // Remove first token (Rank)
        return namePart.replace(',', '');
    };

    const getPointColor = (type: string) => {
        switch (type) {
            case 'Periodic': return '#3b82f6'; // Blue-500
            case 'Transfer': return '#ef4444'; // Red-500
            case 'Gain': return '#64748b'; // Slate-500 equivalent color for the stroke
            case 'Special': return '#eab308'; // Yellow-500
            case 'Promotion': return '#22c55e'; // Green-500
            default: return '#64748b';
        }
    };

    // --- HANDLERS ---

    // Simplified Mouse Down for Dragging only (no panning)
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
        const CTM = svgRef.current.getScreenCTM();
        if (!CTM) return;

        const clientY = e.clientY;
        const svgY = (clientY - CTM.f) / CTM.d;

        const chartY = svgY;

        let newTrait = 0;
        let isNowNOB = false;

        // NOB Logic: Check if cursor visually in top area (above 5.10)
        // Map Y back to Trait
        newTrait = Number(yToTrait(chartY).toFixed(2));

        if (newTrait > 5.10) {
            isNowNOB = true;
        } else {
            isNowNOB = false;
            newTrait = Math.max(MIN_TRAIT, Math.min(5.0, newTrait));
        }

        setReports(prev => prev.map(r =>
            r.id === activeDragId ? {
                ...r,
                traitAverage: isNowNOB ? 0 : newTrait, // Value doesn't determine position for NOB
                isNOB: isNowNOB
            } : r
        ));
    };

    const handleMouseUp = () => {
        setActiveDragId(null);
    };

    useEffect(() => {
        const globalUp = () => { setActiveDragId(null); };
        if (activeDragId) window.addEventListener('mouseup', globalUp);
        return () => window.removeEventListener('mouseup', globalUp);
    }, [activeDragId]);

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-start mb-4 flex-shrink-0">
                {/* Controls (same) */}
                <div>
                    <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit mb-3">
                        {(['Wardroom', 'CPO', 'Crew'] as const).map(tier => (
                            <button key={tier} onClick={() => setMacroFilter(tier)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${macroFilter === tier ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{tier}</button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                        {availableGroups.length > 0 ? availableGroups.map(group => (
                            <button key={group} onClick={() => setSelectedSummaryGroup(group)} className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${selectedSummaryGroup === group ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>{group}</button>
                        )) : <span className="text-xs text-slate-400 italic py-1">No summary groups found</span>}
                    </div>
                </div>
                <div className="flex space-x-8 pt-1 items-start">
                    {/* RSCA Flexibility Widget - Context Aware */}
                    <div className="mr-4">
                        <RscaFlexibilityWidget
                            score={84}
                            max={100}
                            message={`High flexibility for ${selectedSummaryGroup || 'current group'}.`}
                            className="w-64 border-none shadow-none bg-transparent p-0"
                        />
                    </div>

                    <div className="text-right pt-2">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Start RSCA</p>
                        <p className="text-xl font-mono text-slate-400 font-bold">{INITIAL_RSCA.toFixed(2)}</p>
                    </div>
                    <div className="text-right pt-2">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Projected</p>
                        <div className="flex items-center justify-end">
                            <p className={`text-2xl font-mono font-bold ${projectedRSCAVal >= TARGET_RANGE.min && projectedRSCAVal <= TARGET_RANGE.max ? 'text-green-600' : 'text-blue-600'}`}>
                                {projectedRSCAVal.toFixed(2)}
                            </p>
                            <span className={`ml-2 text-xs font-bold px-1.5 py-0.5 rounded ${projectedRSCAVal > INITIAL_RSCA ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {projectedRSCAVal > INITIAL_RSCA ? '+' : ''}{(projectedRSCAVal - INITIAL_RSCA).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative border border-slate-100 rounded-lg bg-slate-50/50 flex-1 min-h-0 overflow-hidden">
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${width} ${height}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="w-full h-full select-none"
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Grid & Axes */}
                    {[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map(val => {
                        const y = traitToY(val);
                        return (
                            <g key={val}>
                                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                                <text
                                    x={padding.left - 10}
                                    y={y}
                                    dy="0.3em"
                                    textAnchor="end"
                                    className="text-xs fill-slate-400 font-mono"
                                    style={{ fontSize: '10px' }}
                                >
                                    {val.toFixed(1)}
                                </text>
                            </g>
                        );
                    })}

                    {/* NOB Line */}
                    <g>
                        <line
                            x1={padding.left}
                            y1={traitToY(NOB_TRAIT_VALUE)}
                            x2={width - padding.right}
                            y2={traitToY(NOB_TRAIT_VALUE)}
                            stroke="#94a3b8"
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            vectorEffect="non-scaling-stroke"
                        />
                        <text
                            x={width / 2}
                            y={traitToY(NOB_TRAIT_VALUE) - 10}
                            textAnchor="middle"
                            className="text-sm font-bold fill-slate-400 pointer-events-none tracking-widest"
                        >
                            NOB
                        </text>
                    </g>

                    {/* Connections */}
                    {connections.map(line => (
                        <line
                            key={line.id}
                            x1={line.x1} y1={line.y1}
                            x2={line.x2} y2={line.y2}
                            stroke="#cbd5e1"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                        />
                    ))}

                    {/* Trend Line */}
                    <polyline
                        points={trendPoints.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="drop-shadow-sm pointer-events-none opacity-80"
                        vectorEffect="non-scaling-stroke"
                    />

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
                                        d="M0 -30 V30 M-30 0 H30"
                                        stroke="#22c55e"
                                        strokeWidth={5}
                                        strokeLinecap="round"
                                    />
                                    {/* No text for Gain as requested (implied 'no report') or just minimal marker */}
                                    <text y={40} textAnchor="middle" className="text-[9px] fill-slate-500 font-semibold uppercase pointer-events-none whitespace-nowrap">{formatName(p.report.memberName)}</text>
                                </g>
                            );
                        }

                        return (
                            <g key={p.id}
                                transform={`translate(${p.x}, ${p.y})`}
                                className="cursor-ns-resize"
                                onMouseDown={(e) => handleMouseDown(e, p.id)}
                            >
                                {p.report.type === 'Special' ? (
                                    <rect x={-radius + 2} y={-radius + 2} width={radius * 1.8} height={radius * 1.8} fill={baseColor} stroke={isAboveRSCA ? '#4ade80' : 'white'} strokeWidth={isAboveRSCA ? 3 : 2} transform="rotate(45)" className={`shadow-md ${isDragging ? 'brightness-110' : ''}`} />
                                ) : (
                                    <circle r={radius} fill={baseColor} stroke={isAboveRSCA ? '#4ade80' : 'white'} strokeWidth={isAboveRSCA ? 3 : 2} className={`shadow-md ${isDragging ? 'brightness-110' : ''}`} />
                                )}
                                <text dy="0.35em" textAnchor="middle" className="text-[10px] fill-white font-bold pointer-events-none font-mono">
                                    {p.report.isNOB ? 'NOB' : p.report.traitAverage.toFixed(2)}
                                </text>
                                <text y={radius + 14} textAnchor="middle" className="text-[9px] fill-slate-500 font-semibold uppercase pointer-events-none whitespace-nowrap">{formatName(p.report.memberName)}</text>
                            </g>
                        );
                    })}

                    {/* Static Overlays */}
                    {/* Time Axis (Fixed Y visually at bottom, but needs to align with chart width) */}
                    {Array.from({ length: 12 }).map((_, i) => {
                        const x = monthToX(i);
                        const date = new Date(MOCK_START_DATE);
                        date.setMonth(i);
                        return (
                            <text key={i} x={x} y={height - 60} textAnchor="middle" className="text-xs fill-slate-400 font-semibold uppercase">
                                {date.toLocaleDateString('en-US', { month: 'short' })}
                            </text>
                        );
                    })}
                    <text x={width / 2} y={height - 10} textAnchor="middle" className="text-xs fill-slate-500 font-semibold uppercase tracking-widest">Timeline (Months)</text>
                </svg>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500 px-2">
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
                </div>
                <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-slate-400 border-[3px] border-green-400"></span>
                    <span>Above RSCA</span>
                </div>
            </div>
        </div>
    );
};
