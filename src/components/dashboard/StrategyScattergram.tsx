import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Target, Wand2 } from 'lucide-react';
import { projectRSCA } from '../../lib/engines/rsca';
import { optimizeStrategy } from '../../lib/engines/strategy';

// --- MOCK DATA FOR PROTOTYPING ---
const MOCK_START_DATE = new Date('2025-01-01');

const INITIAL_RSCA = 3.85;
const INITIAL_SIGNED_COUNT = 45;
// const TARGET_RANGE = { min: 3.80, max: 4.00 };

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
    x: number; // pixel (render)
    y: number; // pixel (render)
    report: typeof INITIAL_REPORTS[0];
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
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // --- DIMENSIONS & SCALES ---
    const height = 500;
    const padding = { top: 60, bottom: 40 }; // Reduced bottom padding as labels moved up

    // Y-Axis Config
    const CHART_H = height - padding.top - padding.bottom;

    // X-Axis Config
    // Extended Timeline: 24 Months
    const NUM_MONTHS = 24;
    const COL_WIDTH = 96; // match ManningWaterfall
    const CHART_TOTAL_WIDTH = NUM_MONTHS * COL_WIDTH; // Scrollable Width

    const NOB_TRAIT_VALUE = 5.5; // Exactly 0.5 above 5.0
    const MIN_TRAIT = 1.0;
    const MAX_TRAIT = 5.5; // NOB is at the max edge

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
            // Calculate months between MOCK_START_DATE and Now
            const now = new Date();
            const start = new Date(MOCK_START_DATE);
            // Timeline starts 3 months BEFORE Mock Start
            // So index 0 = MOCK_START - 3 months.
            // Index of MOCK_START = 3.

            const diffYears = now.getFullYear() - start.getFullYear();
            const diffMonths = now.getMonth() - start.getMonth();
            const totalMonthsDiff = (diffYears * 12) + diffMonths;

            // Timeline index for "Now"
            const currentMonthIndex = totalMonthsDiff + 3;

            const scrollX = (currentMonthIndex * COL_WIDTH) - (scrollContainerRef.current.clientWidth / 2) + (COL_WIDTH / 2);
            scrollContainerRef.current.scrollTo({ left: Math.max(0, scrollX), behavior: 'smooth' });
        }
    };


    // Initial Scroll
    useEffect(() => {
        // Small timeout to ensure layout is ready
        const timer = setTimeout(() => {
            handleJumpToNow();
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // --- FILTERS ---
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


    // --- DERIVED DATA ---
    const projectedRSCAVal = useMemo(() => {
        const itas = filteredReports.filter(r => !r.isNOB).map(r => r.traitAverage);
        if (itas.length === 0) return INITIAL_RSCA;
        return projectRSCA(INITIAL_RSCA, INITIAL_SIGNED_COUNT, itas);
    }, [filteredReports]);

    const points: ScatterPoint[] = useMemo(() => {
        let rawPoints = filteredReports.map(r => ({
            id: r.id,
            // Shift +3 months to align with display timeline start (which starts 3 months before mock start)
            x: monthToX(r.monthIndex + 3),
            y: traitToY(r.isNOB ? NOB_TRAIT_VALUE : r.traitAverage),
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



    // Stepped RSCA Trend Lines & Connections
    const { trendLines, impactConnections } = useMemo(() => {
        const lines: { x1: number, x2: number, y: number, value: number }[] = [];

        // We simulate time flowing.
        // RSCA holds steady until (Report Date + 3 Months).
        // At (Report Date + 3 Months), RSCA updates.
        let currentRSCA = INITIAL_RSCA;
        const RSCA_LAG_MONTHS = 3;

        // Create a map of "Impact Months" -> "Trait Averages"
        const impacts = new Map<number, number[]>();
        filteredReports.forEach(r => {
            if (r.isNOB) return;
            const impactMonth = r.monthIndex + RSCA_LAG_MONTHS;
            if (!impacts.has(impactMonth)) impacts.set(impactMonth, []);
            impacts.get(impactMonth)?.push(r.traitAverage);
        });

        // Find all "Change Events" (months where RSCA changes)


        let lastX = 0;

        for (let m = 0; m < NUM_MONTHS + RSCA_LAG_MONTHS; m++) {
            const chartMonthIndex = m;
            const realMonthIndex = chartMonthIndex - 3; // Convert back to data month index

            // Check if there's an impact at this Real Month Index
            if (impacts.has(realMonthIndex)) {
                // Time to update RSCA
                // 1. End previous line at this X
                const thisX = monthToX(chartMonthIndex);

                lines.push({
                    x1: lastX,
                    x2: thisX,
                    y: traitToY(currentRSCA),
                    value: currentRSCA
                });

                // 2. Calculate new RSCA
                // Simple weighted average drift for visual demo
                const newItas = impacts.get(realMonthIndex) || [];
                // Calculate average of new reports
                const avgNew = newItas.reduce((a, b) => a + b, 0) / newItas.length;

                // If avg > rsca, it goes up.
                const diff = (avgNew - currentRSCA) * 0.1; // Damped impact
                const nextRSCA = currentRSCA + diff;

                currentRSCA = nextRSCA;
                lastX = thisX;
            }
        }

        // Final line to end
        lines.push({
            x1: lastX,
            x2: CHART_TOTAL_WIDTH,
            y: traitToY(currentRSCA),
            value: currentRSCA
        });

        const finalConnections = filteredReports.map(r => {
            if (r.isNOB) return null;
            // Impact is 3 months later
            const impactChartMonth = (r.monthIndex + 3) + RSCA_LAG_MONTHS;
            const impactX = monthToX(impactChartMonth);

            // Find RSCA value at that time (roughly)
            // We can just look at the lines we generated
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
                color: r.traitAverage >= impactY ? '#22c55e' : '#ef4444' // Green if pulling up? Or just neutral
            };
        }).filter(Boolean) as { id: string, x1: number, y1: number, x2: number, y2: number, color: string }[];

        return { trendLines: lines, impactConnections: finalConnections };
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
            case 'Gain': return '#64748b'; // Slate-500
            case 'Special': return '#eab308'; // Yellow-500
            case 'Promotion': return '#22c55e'; // Green-500
            default: return '#64748b';
        }
    };

    // --- HANDLERS ---
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

        if (newTrait > 5.10) { // Threshold for snapping to NOB
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
        start.setMonth(start.getMonth() - 3); // Start 3 months back

        for (let i = 0; i < NUM_MONTHS; i++) {
            const d = new Date(start);
            d.setMonth(start.getMonth() + i);
            arr.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
        }
        return arr;
    }, []);

    // Optimization Logic
    const handleOptimize = () => {
        // Run optimization based on current RSCA projection (or initial if not enough data)
        const currentProjection = projectedRSCAVal || INITIAL_RSCA;

        const optimized = optimizeStrategy(reports, currentProjection);
        setReports(optimized);
    };


    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
            {/* Header: Jump to Now on LEFT, Toggles on RIGHT */}
            <div className="flex justify-between items-center mb-4 flex-shrink-0">

                {/* Left: Jump to Now & Optimize */}
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handleJumpToNow}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors border border-slate-200"
                        title="Jump to Current Month"
                    >
                        <Target size={20} />
                    </button>
                    <button
                        onClick={handleOptimize}
                        className="flex items-center space-x-2 px-3 py-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-full transition-colors border border-purple-200"
                        title="Auto-Optimize Strategy (Seniority Based)"
                    >
                        <Wand2 size={16} />
                        <span className="text-xs font-bold">Optimize</span>
                    </button>
                </div>

                {/* Right: Controls */}
                <div className="flex flex-col items-end space-y-2">
                    <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
                        {(['Wardroom', 'CPO', 'Crew'] as const).map(tier => (
                            <button key={tier} onClick={() => setMacroFilter(tier)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${macroFilter === tier ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{tier}</button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm justify-end">
                        {availableGroups.length > 0 ? availableGroups.map(group => (
                            <button key={group} onClick={() => setSelectedSummaryGroup(group)} className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${selectedSummaryGroup === group ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>{group}</button>
                        )) : <span className="text-xs text-slate-400 italic py-1">No summary groups found</span>}
                    </div>
                </div>
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
                        {/* NOB Label - Aligned with new 5.5 position */}
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
                                    stroke="#a855f7" // Purple-500
                                    strokeWidth={3}
                                    strokeDasharray="6 4" // Dotted
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
                </div>
                <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-slate-400 border-[3px] border-green-400"></span>
                    <span>Above RSCA</span>
                </div>
            </div>
        </div>
    );
};
