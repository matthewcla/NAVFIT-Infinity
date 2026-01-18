import { useMemo, useState, useRef } from 'react';
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
const CHART_PADDING = { top: 50, right: 20, bottom: 30, left: 20 };
// const DOT_RADIUS = 5; // Replaced by dynamic radius in geometry
const DOT_GAP = 4;
const BIN_WIDTH_PX = 40; // Wider bins for better label spacing

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
    const [hoveredMember, setHoveredMember] = useState<{ id: string, name: string, mta: number, x: number, y: number } | null>(null);

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
        // We iterate by integer steps to avoid float drift, then divide
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
                // If out of initialized range (shouldn't happen with calc above), add dynamic
                binMap.set(key, { mta: Math.round(m.mta * 10) / 10, items: [] });
            }
            binMap.get(key)!.items.push({
                ...m,
                promRec: m.promRec || 'P' // Default to P if missing
            });
        });

        return Array.from(binMap.values()).sort((a, b) => a.mta - b.mta);
    }, [members, range]);

    // 3. Compute Geometry
    const geometry = useMemo(() => {
        // Dynamic Dot Radius: Larger dots for smaller populations to fill negative space
        // Range: 5px (dense) -> 8px (sparse)
        const density = members.length;
        const baseRadius = density < 10 ? 8 : density < 30 ? 6 : 5;

        const numBins = bins.length;
        const totalWidth = numBins * BIN_WIDTH_PX + CHART_PADDING.left + CHART_PADDING.right;

        // Auto-height based on max stack
        // Reduce min-clamp to 3 to allow tighter wrapping on small-stack groups
        const maxStack = Math.max(...bins.map(b => b.items.length), 3);
        const stackHeight = maxStack * (baseRadius * 2 + DOT_GAP);
        const totalHeight = stackHeight + CHART_PADDING.top + CHART_PADDING.bottom;

        const points: PointData[] = [];

        bins.forEach((bin, binIdx) => {
            const x = CHART_PADDING.left + (binIdx * BIN_WIDTH_PX) + (BIN_WIDTH_PX / 2);

            // Stack from bottom up
            bin.items.forEach((item, itemIdx) => {
                // Use totalHeight - bottom_padding as the baseline
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


    // --- Interaction ---
    const handleClick = (memberId: string) => {
        selectMember(memberId);
        if (onClickMember) onClickMember(memberId);
    };

    const handleMouseEnter = (p: PointData) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setHoveredMember({
            id: p.id,
            name: p.member.name,
            mta: p.member.mta,
            x: rect.left + p.x,
            y: rect.top + p.y
        });
    };


    // --- Portal Tooltip ---
    const RscaTooltip = () => {
        const { scale } = useScaleFactor();
        if (!hoveredMember) return null;

        return createPortal(
            <div
                className="fixed pointer-events-none z-[99999] bg-slate-900 text-white text-xs px-2 py-1.5 rounded shadow-lg flex flex-col items-center"
                style={{
                    left: hoveredMember.x,
                    top: hoveredMember.y - 40, // Offset up
                    transform: `translate(-50%, 0) scale(${scale})`,
                    transformOrigin: 'bottom center'
                }}
            >
                <div className="font-bold whitespace-nowrap">{hoveredMember.name}</div>
                <div className="font-mono text-[10px] text-slate-300">MTA: {hoveredMember.mta.toFixed(2)}</div>
                {/* Little triangle arrow */}
                <div className="absolute top-full left-1/2 -ml-1 border-4 border-transparent border-t-slate-900"></div>
            </div>,
            document.body
        );
    };

    return (
        <div ref={containerRef} className="w-full h-full relative custom-scrollbar flex items-end justify-center overflow-x-auto overflow-y-hidden">
            {/* Center content if small, scroll if large */}
            <svg
                width={Math.max(geometry.width, 300)} // Min width
                height="100%"
                viewBox={`0 0 ${geometry.width} ${geometry.height}`}
                preserveAspectRatio="xMidYMax meet" // Align bottom, center horizontally
                className="overflow-visible flex-shrink-0"
            >
                {/* --- Grid & Axis --- */}
                {/* X-Axis Line */}
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
                    // Label every other bin if too crowded? or every 0.2?
                    // For now, label all 0.1s but rotate or stagger if needed?
                    // Or label "integers" and "halves" boldly?
                    // Let's just do every 0.1 small.
                    const isWhole = bin.mta % 1 === 0;

                    return (
                        <g key={`label-${bin.mta}`}>
                            {/* Tick */}
                            <line
                                x1={x} y1={geometry.height - CHART_PADDING.bottom}
                                x2={x} y2={geometry.height - CHART_PADDING.bottom + 4}
                                stroke="#cbd5e1"
                            />
                            {/* Text */}
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
                    />
                    <text
                        x={4} y={CHART_PADDING.top}
                        fill="#6366f1"
                        className="text-[10px] font-bold select-none"
                    >
                        RSCA
                    </text>
                </g>


                {/* --- Data Points (Members) --- */}
                {geometry.points.map(p => {
                    const isSelected = p.id === selectedMemberId;

                    return (
                        <g
                            key={p.id}
                            transform={`translate(${p.x}, ${p.y})`}
                            className="cursor-pointer group"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClick(p.id);
                            }}
                            onMouseEnter={() => handleMouseEnter(p)}
                            onMouseLeave={() => setHoveredMember(null)}
                        >
                            {/* 1. Stable Hit Target (Invisible, larger) */}
                            {/* This prevents flickering when the visual dot scales or cursor moves slightly */}
                            <circle
                                r={geometry.radius + 4}
                                fill="transparent"
                                className="z-10"
                            />

                            {/* 2. Visual Dot (Animated) */}
                            <circle
                                r={geometry.radius + (isSelected ? 1 : 0)}
                                fill={p.color}
                                stroke={p.stroke}
                                strokeWidth={isSelected ? 2 : 1}
                                className={`transition-all duration-300 ease-out origin-center group-hover:scale-150 ${isSelected ? 'shadow-md filter drop-shadow-md scale-110' : ''}`}
                                style={{ pointerEvents: 'none' }} // Let clicks pass to the group/hit target
                            />

                            {/* 3. Selection Halo */}
                            {isSelected && (
                                <circle
                                    r={geometry.radius + 4}
                                    fill="none"
                                    stroke={p.color}
                                    strokeOpacity={0.4}
                                    strokeWidth={2}
                                    style={{ pointerEvents: 'none' }}
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
