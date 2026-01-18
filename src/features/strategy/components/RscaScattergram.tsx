import { useMemo, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useScaleFactor } from '@/context/ScaleContext';
import { useNavfitStore } from '@/store/useNavfitStore';

// --- Types ---
export interface RscaScattergramProps {
    members: Array<{
        mta: number;
        id: string;
        name: string;
        promRec?: string; // Enhanced to support coloring
        reportId?: string;
    }>;
    rsca: number;
    onClickMember?: (id: string) => void;
}

// Internal interfaces for layout
interface BinData {
    mta: number;
    items: Array<{
        id: string;
        name: string;
        promRec: string;
        reportId?: string;
        mta: number;
    }>;
}

interface PointData {
    id: string;
    x: number;
    y: number;
    color: string;
    stroke: string;
    member: {
        id: string;
        name: string;
        promRec: string;
        mta: number;
    };
}

// --- Constants ---
const CHART_PADDING = { top: 50, right: 30, bottom: 30, left: 30 }; // Increased padding for crosshairs
const DOT_GAP = 4;
const BIN_WIDTH_PX = 40; // Wider bins for better label spacing
const HOVER_THRESHOLD_PX = 60; // Max distance to snap to a point

// --- Helper: Colors ---
const getPromRecColor = (rec?: string, isSelected: boolean = false) => {
    // Base Colors
    const colors = {
        EP: { fill: '#10b981', stroke: '#047857' }, // Emerald-500/700
        MP: { fill: '#f59e0b', stroke: '#b45309' }, // Amber-500/700
        P: { fill: '#64748b', stroke: '#334155' }, // Slate-500/700
        SP: { fill: '#ef4444', stroke: '#b91c1c' }, // Red-500/700
        PR: { fill: '#3b82f6', stroke: '#1d4ed8' }, // Blue-500/700
        NOB: { fill: '#e2e8f0', stroke: '#94a3b8' }, // Slate-200/400
        Default: { fill: '#94a3b8', stroke: '#475569' }
    };

    const palette = colors[rec as keyof typeof colors] || colors.Default;

    if (isSelected) {
        return { fill: palette.fill, stroke: '#000000', width: 2 };
    }
    return { fill: palette.fill, stroke: palette.stroke, width: 1 };
};


export function RscaScattergram({ members, rsca, onClickMember }: RscaScattergramProps) {
    const { selectedMemberId, selectMember } = useNavfitStore();
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    // Hover state now includes the exact screen coordinates for the tooltip to prevent jitter
    const [hoveredMember, setHoveredMember] = useState<{
        id: string,
        name: string,
        mta: number,
        x: number, // SVG-relative X
        y: number, // SVG-relative Y
        screenX: number, // Absolute Screen X (for Portal)
        screenY: number // Absolute Screen Y (for Portal)
    } | null>(null);

    // --- Layout Calculation ---
    // 1. Determine X-Axis Range (Min/Max MTA) around the RSCA/Group
    const range = useMemo(() => {
        if (members.length === 0) return { min: rsca - 0.5, max: rsca + 0.5 };
        const mtas = members.map(m => m.mta);
        const minMta = Math.min(...mtas, rsca - 0.2);
        const maxMta = Math.max(...mtas, rsca + 0.2);

        // Pad to nearest 0.1
        let viewMin = Math.floor(minMta * 10) / 10 - 0.1;
        let viewMax = Math.ceil(maxMta * 10) / 10 + 0.1;

        // Clamp to valid 1.0 - 5.0 range
        viewMin = Math.max(1.0, viewMin);
        viewMax = Math.min(5.0, viewMax);

        return { min: viewMin, max: viewMax };
    }, [members, rsca]);

    // 2. Bin Data
    const bins = useMemo(() => {
        const binMap = new Map<string, BinData>();

        // Initialize all needed bins
        const start = Math.round(range.min * 10);
        const end = Math.round(range.max * 10);

        for (let i = start; i <= end; i++) {
            const val = i / 10;
            const key = val.toFixed(1);
            binMap.set(key, { mta: val, items: [] });
        }

        // Place Members
        members.forEach(m => {
            const key = m.mta.toFixed(1);
            if (!binMap.has(key)) {
                // If out of initialized range, add dynamic
                binMap.set(key, { mta: Math.round(m.mta * 10) / 10, items: [] });
            }
            binMap.get(key)!.items.push({
                ...m,
                promRec: m.promRec || 'P'
            });
        });

        return Array.from(binMap.values()).sort((a, b) => a.mta - b.mta);
    }, [members, range]);

    // 3. Compute Geometry
    const geometry = useMemo(() => {
        const density = members.length;
        const baseRadius = density < 10 ? 8 : density < 30 ? 6 : 5;

        const numBins = bins.length;
        const totalWidth = numBins * BIN_WIDTH_PX + CHART_PADDING.left + CHART_PADDING.right;

        const maxStack = Math.max(...bins.map(b => b.items.length), 3);
        const stackHeight = maxStack * (baseRadius * 2 + DOT_GAP);
        const totalHeight = stackHeight + CHART_PADDING.top + CHART_PADDING.bottom;

        const points: PointData[] = [];

        bins.forEach((bin, binIdx) => {
            const x = CHART_PADDING.left + (binIdx * BIN_WIDTH_PX) + (BIN_WIDTH_PX / 2);

            // Sort items by MTA ascending (Lowest -> Highest)
            // Stacking starts from bottom (y=height), so first item is bottom, last is top.
            // This ensures Highest MTA is at the visual Top.
            const sortedItems = [...bin.items].sort((a, b) => a.mta - b.mta);

            // Stack from bottom up
            sortedItems.forEach((item, itemIdx) => {
                const baseline = totalHeight - CHART_PADDING.bottom;
                const y = baseline - baseRadius - (itemIdx * (baseRadius * 2 + DOT_GAP));

                const isSelected = item.id === selectedMemberId;
                const style = getPromRecColor(item.promRec, isSelected);

                points.push({
                    id: item.id,
                    x,
                    y,
                    color: style.fill,
                    stroke: style.stroke,
                    member: item
                });
            });
        });

        // RSCA Line X position
        const rscaVal = rsca;
        const startMta = bins[0]?.mta || 0;
        const indexOffset = (rscaVal - startMta) * 10; // 0.1 steps
        const rscaX = CHART_PADDING.left + (indexOffset * BIN_WIDTH_PX) + (BIN_WIDTH_PX / 2);

        return { points, width: totalWidth, height: totalHeight, bins, rscaX, radius: baseRadius };
    }, [bins, selectedMemberId, rsca, members.length]);


    // --- Interaction: Magnetic Hover ---
    const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
        const svg = svgRef.current;
        if (!geometry.points.length || !svg) return;

        // 1. Map Mouse to SVG Coordinates (User Units)
        // This handles scaling, viewing transformations, etc.
        let mouseX = 0;
        let mouseY = 0;

        try {
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;

            // Transform screen pixel -> SVG unit
            const ctm = svg.getScreenCTM();
            if (ctm) {
                const inverseCtm = ctm.inverse();
                const svgP = pt.matrixTransform(inverseCtm);
                mouseX = svgP.x;
                mouseY = svgP.y;
            } else {
                // Fallback (unlikely to work well with scaling, but safe)
                const rect = svg.getBoundingClientRect();
                mouseX = e.clientX - rect.left;
                mouseY = e.clientY - rect.top;
            }
        } catch (err) {
            console.warn('SVG Matrix Error', err);
            return;
        }

        // 2. Find Closest Point in SVG Space
        let minDistance = Infinity;
        let closestPoint: PointData | null = null;

        // Optimize: Only check points within reasonable range if list is huge?
        // For < 500 items, simple iteration is fine.
        for (const p of geometry.points) {
            // Calculate distance in SVG Units (consistent)
            const dx = p.x - mouseX;
            const dy = p.y - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDistance) {
                minDistance = dist;
                closestPoint = p;
            }
        }

        // Apply Threshold (in SVG Units)
        // We might want to scale threshold if the chart is zoomed out?
        // Ideally threshold is visual pixels, but simplified to Units here.
        if (closestPoint && minDistance < HOVER_THRESHOLD_PX) {

            // 3. Map Closest Point back to Screen Coordinates for Tooltip
            try {
                const pt = svg.createSVGPoint();
                pt.x = closestPoint.x;
                pt.y = closestPoint.y;
                const ctm = svg.getScreenCTM();

                if (ctm) {
                    const screenP = pt.matrixTransform(ctm);
                    setHoveredMember({
                        id: closestPoint.id,
                        name: closestPoint.member.name,
                        mta: closestPoint.member.mta,
                        x: closestPoint.x, // Internal SVG X
                        y: closestPoint.y, // Internal SVG Y
                        screenX: screenP.x, // Absolute Screen X
                        screenY: screenP.y  // Absolute Screen Y
                    });
                }
            } catch (err) {
                console.warn('SVG Matrix Error', err);
            }
        } else {
            setHoveredMember(null);
        }
    }, [geometry.points]);

    const handleMouseLeave = () => {
        setHoveredMember(null);
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hoveredMember) {
            selectMember(hoveredMember.id);
            if (onClickMember) onClickMember(hoveredMember.id);
        }
    };

    // --- Portal Tooltip ---
    const RscaTooltip = () => {
        const { scale } = useScaleFactor();
        if (!hoveredMember) return null;

        return createPortal(
            <div
                className="fixed pointer-events-none z-[99999] flex flex-col items-center"
                style={{
                    left: hoveredMember.screenX,
                    top: hoveredMember.screenY - 24, // Offset up slightly more
                    transform: `translate(-50%, -100%) scale(${scale})`, // Translate up 100% to sit above
                    transformOrigin: 'bottom center'
                }}
            >
                {/* Tooltip Card */}
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 text-white text-xs px-3 py-2 rounded-lg shadow-xl mb-2 flex flex-col items-center min-w-[120px]">
                    <div className="font-bold whitespace-nowrap text-sm text-slate-100">{hoveredMember.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">MTA</span>
                        <span className="font-mono text-xs font-bold text-emerald-400">{hoveredMember.mta.toFixed(2)}</span>
                    </div>
                </div>

                {/* Triangle */}
                <div className="-mt-2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900/90 backdrop-blur-md"></div>
            </div>,
            document.body
        );
    };

    return (
        <div ref={containerRef} className="w-full h-full relative custom-scrollbar flex items-end justify-center overflow-x-auto overflow-y-hidden">
            {/* Center content if small, scroll if large */}
            <svg
                ref={svgRef}
                width={Math.max(geometry.width, 300)} // Min width
                height="100%" // Fill height
                viewBox={`0 0 ${geometry.width} ${geometry.height}`}
                preserveAspectRatio="xMidYMax meet" // Align bottom, center horizontally
                className="overflow-visible flex-shrink-0 touch-none" // touch-none for better gesture handling if needed
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
                style={{ cursor: hoveredMember ? 'pointer' : 'default' }}
            >
                {/* --- Grid & Axis --- */}
                <line
                    x1={CHART_PADDING.left}
                    y1={geometry.height - CHART_PADDING.bottom}
                    x2={geometry.width - CHART_PADDING.right}
                    y2={geometry.height - CHART_PADDING.bottom}
                    stroke="#e2e8f0"
                    strokeWidth={1}
                />

                {/* X-Axis Labels (MTA Bins) */}
                {geometry.bins.map((bin, i) => {
                    const x = CHART_PADDING.left + (i * BIN_WIDTH_PX) + (BIN_WIDTH_PX / 2);
                    const isWhole = bin.mta % 1 === 0;

                    return (
                        <g key={`label-${bin.mta}`}>
                            <line
                                x1={x} y1={geometry.height - CHART_PADDING.bottom}
                                x2={x} y2={geometry.height - CHART_PADDING.bottom + 4}
                                stroke="#cbd5e1"
                            />
                            <text
                                x={x}
                                y={geometry.height - CHART_PADDING.bottom + 14}
                                textAnchor="middle"
                                className={`text-[11px] font-mono select-none ${isWhole ? 'fill-slate-600 font-bold' : 'fill-slate-400'}`}
                            >
                                {bin.mta.toFixed(1)}
                            </text>
                        </g>
                    );
                })}

                {/* --- RSCA Reference Line --- */}
                <g transform={`translate(${geometry.rscaX}, 0)`}>
                    <line
                        x1={0} y1={CHART_PADDING.top}
                        x2={0} y2={geometry.height - CHART_PADDING.bottom}
                        stroke="#6366f1"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        opacity={0.5}
                    />
                    <text
                        x={4} y={CHART_PADDING.top}
                        fill="#6366f1"
                        className="text-[10px] font-bold select-none"
                    >
                        RSCA
                    </text>
                </g>

                {/* --- Crosshairs (Active State) --- */}
                {hoveredMember && (
                    <g className="pointer-events-none transition-opacity duration-200">
                        {/* Vertical Drop to Axis */}
                        <line
                            x1={hoveredMember.x}
                            y1={hoveredMember.y + geometry.radius + 4}
                            x2={hoveredMember.x}
                            y2={geometry.height - CHART_PADDING.bottom}
                            stroke="#94a3b8"
                            strokeWidth={1}
                            strokeDasharray="3 3"
                            opacity={0.6}
                        />
                        {/* Highlight Axis Label Tick (Optional, maybe just the line is enough) */}
                    </g>
                )}


                {/* --- Data Points (Members) --- */}
                {geometry.points.map(p => {
                    const isSelected = p.id === selectedMemberId;
                    const isHovered = hoveredMember?.id === p.id;

                    return (
                        <g
                            key={p.id}
                            transform={`translate(${p.x}, ${p.y})`}
                            className="transition-all duration-300"
                        >
                            {/* 1. Active Glow (Only when hovered or selected) */}
                            {(isHovered || isSelected) && (
                                <circle
                                    r={geometry.radius + 6}
                                    fill={p.color}
                                    opacity={isHovered ? 0.2 : 0.15}
                                    className="animate-pulse-slow"
                                />
                            )}

                            {/* 2. Visual Dot */}
                            <circle
                                r={geometry.radius + (isHovered || isSelected ? 2 : 0)}
                                fill={p.color}
                                stroke={p.stroke}
                                strokeWidth={isSelected || isHovered ? 2 : 1}
                                className={`transition-all duration-200 ease-out ${isHovered || isSelected ? 'drop-shadow-md' : ''}`}
                            />

                            {/* 3. Selection Ring */}
                            {isSelected && (
                                <circle
                                    r={geometry.radius + 5}
                                    fill="none"
                                    stroke={p.color}
                                    strokeWidth={1.5}
                                    opacity={0.8}
                                />
                            )}
                        </g>
                    );
                })}
            </svg>
            <RscaTooltip />
        </div>
    );
}
