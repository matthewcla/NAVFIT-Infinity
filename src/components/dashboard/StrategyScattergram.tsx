import React, { useState, useRef, useMemo, useEffect } from 'react';
import { projectRSCA } from '../../lib/engines/rsca';
import { Plus, Minus, RotateCcw } from 'lucide-react';

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

    // Zoom/Pan State
    // We now only zoom Y. k is effectively kY.
    const [viewport, setViewport] = useState({ x: 0, y: 0, k: 1 });
    const [isPanning, setIsPanning] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });

    // Z-Index Management (rendering order)
    const [zOrder, setZOrder] = useState<string[]>([]);

    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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
    const padding = { top: 60, right: 40, bottom: 40, left: 60 }; // Increased top padding for NOB
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // NOB Zone now at Top (negative relative to chart area or just in top padding)
    const NOB_ZONE_Y_CENTER = padding.top / 2;

    // Y-Axis: 1.0 to 5.0
    const MIN_TRAIT = 1.0;
    const MAX_TRAIT = 5.0;
    // ADVERSE_THRESHOLD removed

    const traitToY = (trait: number) => {
        const range = MAX_TRAIT - MIN_TRAIT;
        const normalized = (trait - MIN_TRAIT) / range;
        return chartHeight - (normalized * chartHeight) + padding.top;
    };

    const yToTrait = (y: number) => {
        const relativeY = y - padding.top;
        const clampedY = relativeY; // Don't clamp here, let logic decide limits
        const normalized = 1 - (clampedY / chartHeight);
        return MIN_TRAIT + (normalized * (MAX_TRAIT - MIN_TRAIT));
    };

    const monthToX = (monthIndex: number) => {
        const step = chartWidth / 11;
        return padding.left + (monthIndex * step);
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
            // Dynamically calculate y for NOB points to counteract viewport transform
            y: r.isNOB
                ? (NOB_ZONE_Y_CENTER - viewport.y) / viewport.k
                : traitToY(r.traitAverage),
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
                        const shift = Math.max(0.5, overlap / 2);

                        p1.x -= shift;
                        p2.x += shift;
                    }
                }
            }
        }

        return rawPoints;
    }, [filteredReports, NOB_ZONE_Y_CENTER, viewport]);

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
                // Determine y1 and y2. If NOB, use NOB center.
                // Actually they are already in pts.y
                // However, we need to respect the viewport transform for Y coordinates if we are drawing lines
                // But wait, the lines are inside the transformed group.
                // So we just use their local coords.
                // BUT: If they are NOB (at top), and we zoom deeply into the chart (middle), the NOB points might be way off screen or scaled weirdly?
                // Wait, if we scale Y, the NOB zone (top) moves away?
                // NOB zone should be STATIC overlay?
                // "Place NOB Trait Average assignment distinctly above 5.0."
                // If it's part of the chart scale, it will zoom away.
                // The user likely wants it accessible.
                // Let's make NOB zone fixed at top of SVG, NOT transformed?
                // But if the user drags a point, and the chart is zoomed, how do we handle the transition?
                // Easier if NOB is part of the data space (e.g. Trait 5.5).
                // User said "distinctly above 5.0".
                // Let's treat NOB as Trait = 5.2 (visually).
                // And extend Y axis range to include it?
                // Or keep it fixed overlay.
                // Drag to NOB: If we drag above the chart top.
                // Visualizing NOB points: If we zoom in on 2.0-3.0, do we want to see NOB points? Probably yes.
                // So NOB points should probably be in a STATIC layer on top, or stick to top edge?
                // Let's go with: NOB Zone is a fixed overlay at the top. NOB Points are rendered in that fixed overlay.
                // Connections: If one point is NOB (fixed top) and one is normal (transformed), drawing a line is hard because they are in different coordinate spaces.
                // Solution: Project the transformed point to screen space for the line?
                // Or, inverse project the NOB point to data space?
                // Let's keep simpler: Everything in data space. NOB is at Y = traitToY(5.2). 
                // If we zoom in on the bottom, the top disappears. This is standard zoom behavior.
                // User can zoom out to see NOB.

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
        // Expected format: "Rank Lastname, F." or similar
        // We want "Lastname F"
        // The mock data `memberName` is constructed as `${getShortRank(m.rank)} ${m.name}` where m.name is "Mitchell, P."
        // So memberName is "LT Mitchell, P."

        // Let's parse from the raw parts if possible, but here we just have the string.
        // Remove rank prefix if it exists
        const parts = memberName.split(' ');

        // If first part is a known rank, remove it? 
        // Or just look for the comma part.
        // "Mitchell, P." -> "Mitchell P"

        const namePart = parts.slice(1).join(' '); // Remove first token (Rank)
        // If original was "LT Mitchell, P.", namePart is "Mitchell, P."

        // Remove comma
        return namePart.replace(',', '');
    };

    const getPointColor = (type: string) => {
        switch (type) {
            case 'Periodic': return '#3b82f6'; // Blue-500
            case 'Transfer': return '#ef4444'; // Red-500
            case 'Gain': return '#22c55e'; // Green-500
            case 'Special': return '#eab308'; // Yellow-500
            default: return '#64748b';
        }
    };

    // --- HANDLERS ---
    // --- HANDLERS ---
    // Helper to Clamp Y
    const clampY = (y: number, k: number) => {
        const y5 = traitToY(5.0);
        const y1 = traitToY(1.0);

        // Allow some buffer or strict clamping
        const BUFFER = 50;

        // y <= height - y5 * k (Top of chart (5.0) hits bottom of view)
        // y >= -y1 * k (Bottom of chart (1.0) hits top of view)
        // Actually, let's keep it simpler: Don't let 5.0 go below padding.bottom?
        // Or 1.0 go above padding.top?

        const upperLimit = (height - padding.bottom) - y5 * k + BUFFER;
        const lowerLimit = padding.top - y1 * k - BUFFER;

        return Math.max(lowerLimit, Math.min(upperLimit, y));
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (!containerRef.current) return;
        const scaleBy = 1.1;
        const direction = e.deltaY < 0 ? 1 : -1;
        const factor = direction > 0 ? scaleBy : 1 / scaleBy;
        const newK = Math.max(1, Math.min(10, viewport.k * factor));

        setViewport(prev => {
            const newY = prev.y * factor + (height / 2) * (1 - factor);
            return {
                k: newK,
                x: 0,
                y: clampY(newY, newK)
            };
        });
    };

    const handlePanStart = (e: React.MouseEvent) => {
        if (activeDragId) return;
        setIsPanning(true);
        setStartPan({ x: e.clientX, y: e.clientY });
    };

    const handlePanMove = (e: React.MouseEvent) => {
        if (!isPanning) return;
        const dy = e.clientY - startPan.y;
        setViewport(prev => ({ ...prev, y: clampY(prev.y + dy, prev.k) }));
        setStartPan({ x: e.clientX, y: e.clientY });
    };

    const handlePanEnd = () => setIsPanning(false);

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
        if (isPanning) {
            handlePanMove(e);
            return;
        }

        if (!activeDragId || !svgRef.current) return;
        const CTM = svgRef.current.getScreenCTM();
        if (!CTM) return;

        const clientY = e.clientY;
        const svgY = (clientY - CTM.f) / CTM.d;

        const chartY = (svgY - viewport.y) / viewport.k;

        let newTrait = 0;
        let isNowNOB = false;

        // NOB Logic: Check if cursor visually in top area
        if (svgY < padding.top) {
            isNowNOB = true;
        } else {
            // Map Y back to Trait
            newTrait = Number(yToTrait(chartY).toFixed(2));

            // Allow dragging anywhere, but clamp for storage/logic
            // If newTrait > 5.0, check slightly looser threshold for NOB snapping?
            if (newTrait > 5.05) isNowNOB = true;
            else isNowNOB = false;

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
        handlePanEnd();
    };

    const handleResetView = () => setViewport({ x: 0, y: 0, k: 1 });

    useEffect(() => {
        const globalUp = () => { setActiveDragId(null); setIsPanning(false); };
        if (activeDragId || isPanning) window.addEventListener('mouseup', globalUp);
        return () => window.removeEventListener('mouseup', globalUp);
    }, [activeDragId, isPanning]);

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
                <div className="flex space-x-8 pt-1">
                    <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Start RSCA</p>
                        <p className="text-xl font-mono text-slate-400 font-bold">{INITIAL_RSCA.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
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

            <div className="relative border border-slate-100 rounded-lg bg-slate-50/50 flex-1 min-h-0 overflow-hidden" ref={containerRef} onWheel={handleWheel}>
                <div className="absolute top-4 right-4 flex flex-col space-y-2 z-10 bg-white shadow-md rounded-lg border border-slate-200 p-1">
                    <button onClick={() => setViewport(v => ({ ...v, k: Math.min(10, v.k * 1.2) }))} className="p-1 hover:bg-slate-100 rounded text-slate-600"><Plus size={16} /></button>
                    <button onClick={() => setViewport(v => ({ ...v, k: Math.max(1, v.k / 1.2) }))} className="p-1 hover:bg-slate-100 rounded text-slate-600"><Minus size={16} /></button>
                    <button onClick={handleResetView} className="p-1 hover:bg-slate-100 rounded text-slate-600 border-t border-slate-100"><RotateCcw size={14} /></button>
                </div>

                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${width} ${height}`}
                    preserveAspectRatio="xMidYMid meet"
                    className={`w-full h-full select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                    onMouseDown={handlePanStart}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* NOB ZONE (Static Fixed at Top) */}
                    <rect x={padding.left} y={0} width={chartWidth} height={padding.top - 10} fill="none" stroke="#ddd" strokeDasharray="4 4" rx={4} />
                    <text x={width / 2} y={padding.top / 2 + 5} textAnchor="middle" className="text-xl font-bold fill-slate-300 pointer-events-none tracking-widest">NOB</text>

                    {/* Transformed Group: Only Scale Y, Translate Y */}
                    {/* To keep X static, we translate(0, y) and scale(1, k). */}
                    {/* BUT, if we scale(1, k), the entire coordinate system stretches. */}
                    {/* This means circle(x,y) becomes circle(x, y*k). This is what we want for positioning. */}
                    {/* But we don't want circle shape to stretch. */}
                    <g transform={`translate(0, ${viewport.y}) scale(1, ${viewport.k})`}>

                        {/* Adverse Region Shading (1.0 to 3.0) */}
                        {/* Adverse Region Removed */}

                        {/* Grid & Axes */}
                        {[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map(val => {
                            const y = traitToY(val);
                            return (
                                <g key={val}>
                                    <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" /> {/* vectorEffect keeps line thin */}
                                    <text
                                        x={padding.left - 10}
                                        y={y}
                                        dy="0.3em"
                                        textAnchor="end"
                                        className="text-xs fill-slate-400 font-mono"
                                        transform={`scale(1, ${1 / viewport.k})`} // Counter-scale text
                                        style={{ fontSize: '10px' }} // fixed size
                                    >
                                        {val.toFixed(1)}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Connections */}
                        {connections.map(line => (
                            // Logic check: If NOB point is in static overlay (y < padding.top)
                            // and line is inside scaled group, we have a problem.
                            // Solution: Render NOB points inside the group too, but effectively at y corresponding to "above 5.0".
                            // Let's use 5.2 for visual NOB position in data space.
                            <line
                                key={line.id}
                                x1={line.x1} y1={line.y1}
                                x2={line.x2} y2={line.y2}
                                stroke="#cbd5e1"
                                strokeWidth={2 / viewport.k}
                                strokeDasharray={`${4} ${4 / viewport.k}`} // Adjust dash for stretch
                            />
                        ))}

                        {/* Trend Line */}
                        <polyline
                            points={trendPoints.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth={3 / viewport.k}
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

                            // If NOB, override position to be "above chart" in data space? 
                            // Or use the static calculated Y (which was NOB_ZONE_Y_CENTER).
                            // If NOB_ZONE_Y_CENTER is used inside the scaled group, it will be scaled too!
                            // Scaling 30px by 10x puts it at 300px (middle of chart). Bad.
                            // We need NOB points to "stick" to the inverse of the transform?
                            // OR, simpler: Don't render NOB points in the scaled group. Render them in Static overlay.
                            // BUT: connections need to reach them.

                            // Let's render lines and points in separate layers if needed?
                            // Complexity spike.
                            // Simplest: Define NOB Y in data space as maxTrait + buffer.
                            // traitToY(5.2). 
                            // Then it scales naturally with the chart.

                            // Override Y for NOB to be consistent with data space
                            const visualY = p.report.isNOB ? traitToY(5.2) : p.y;

                            return (
                                <g key={p.id}
                                    transform={`translate(${p.x}, ${visualY})`}
                                    className="cursor-ns-resize"
                                    onMouseDown={(e) => handleMouseDown(e, p.id)}
                                >
                                    {/* Counter-scale the shape so it stays circular */}
                                    <g transform={`scale(1, ${1 / viewport.k})`}>
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
                                </g>
                            );
                        })}
                    </g>

                    {/* Static Overlays */}
                    {/* Time Axis (Fixed Y visually at bottom, but needs to align with chart width) */}
                    {Array.from({ length: 12 }).map((_, i) => {
                        const x = monthToX(i);
                        const date = new Date(MOCK_START_DATE);
                        date.setMonth(i);
                        return (
                            <text key={i} x={x} y={height - padding.bottom + 20} textAnchor="middle" className="text-xs fill-slate-400 font-semibold uppercase">
                                {date.toLocaleDateString('en-US', { month: 'short' })}
                            </text>
                        );
                    })}
                    <text x={width / 2} y={height - 20} textAnchor="middle" className="text-xs fill-slate-500 font-semibold uppercase tracking-widest">Timeline (Months)</text>
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
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span>Gain</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 rounded-md transform rotate-45 bg-yellow-500"></div>
                        <span>Special</span>
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
