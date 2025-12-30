import { ChevronDown } from 'lucide-react';

interface GroupHeaderProps {
    title: string;
    count: number;
    avgRSCA?: string | number;
    isExpanded: boolean;
    onToggle: () => void;
    trendData?: number[]; // Deprecated, use trendPoints
    trendPoints: { monthIndex: number, value: number, isProjected?: boolean }[];
    targetRange: { min: number, max: number };
    timelineMonths: { label: string; monthIndex: number; year: number; index: number }[];
}

export const GroupHeader = ({ title, count, isExpanded, onToggle, trendPoints, targetRange, timelineMonths }: GroupHeaderProps) => {
    // Chart Config
    const CHART_H = 100; // ViewBox Height
    const Y_MIN = 3.0; // Fixed scale for trait evaluation context (usually 3.0 to 5.0)
    const Y_MAX = 5.0;

    // Width per month column (must match ManningWaterfall header)
    const COL_WIDTH = 96; // w-24 = 6rem = 96px
    const CHART_W = timelineMonths.length * COL_WIDTH;

    // Helper to map Value to Y coord (inverted, 0 is top)
    const getY = (val: number) => {
        const pct = (val - Y_MIN) / (Y_MAX - Y_MIN);
        return CHART_H - (pct * CHART_H);
    };

    // Helper to map Month Index to X coord relative to the timeline start
    const getX = (monthIndex: number) => {
        // Find the index in our timelineMonths array that matches this monthIndex
        // For simplicity in this demo, we can just use the absolute index if we passed it, 
        // but let's assume trendPoints.monthIndex is relative to the *start* of the timeline array?
        // Actually, ManningWaterfall passes "relative to extended timeline" indices in the mock usage:
        // { monthIndex: 3, ... } -> 3 months from start

        // So we just map 0..N
        const idx = monthIndex;
        return (idx * COL_WIDTH) + (COL_WIDTH / 2); // Center of column
    };

    return (
        <div
            className="bg-slate-50 border-y border-slate-200 flex hover:bg-slate-100 transition-colors group h-32 items-stretch"
            onClick={onToggle}
        >
            {/* Left Info Section (Sticky Column) */}
            <div className="w-80 px-6 shrink-0 sticky left-0 bg-slate-50 group-hover:bg-slate-100 border-r border-slate-200 z-10 flex flex-col justify-center cursor-pointer shadow-[1px_0_4px_-1px_rgba(0,0,0,0.1)] transition-colors">
                <div className="flex items-center space-x-2 mb-2">
                    <ChevronDown
                        size={16}
                        className={`text-slate-500 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}
                    />
                    <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{title}</h4>
                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{count}</span>
                </div>

                <div className="flex flex-col gap-2 pl-6 mt-1 w-full pr-2">
                    {/* KPI Grid */}
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                        {/* Current RSCA */}
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Current</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-slate-800">
                                    {trendPoints.length > 0 ? trendPoints[trendPoints.length - 1].value.toFixed(2) : 'N/A'}
                                </span>
                                {trendPoints.length > 0 && (
                                    <span className={`text-xs font-bold ${(trendPoints[trendPoints.length - 1].value - targetRange.max) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {(trendPoints[trendPoints.length - 1].value - targetRange.max) > 0 ? '+' : ''}
                                        {(trendPoints[trendPoints.length - 1].value - targetRange.max).toFixed(2)}
                                    </span>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Right Chart Section (Scrollable Area) */}
            <div className="flex-1 relative border-l border-slate-200">
                <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="overflow-visible block">

                    {/* 1. Vertical Grid Lines (Matches Months) */}
                    {timelineMonths.map((_, i) => (
                        <line
                            key={i}
                            x1={(i + 1) * COL_WIDTH}
                            y1="0"
                            x2={(i + 1) * COL_WIDTH}
                            y2={CHART_H}
                            stroke="#e2e8f0"
                            strokeWidth="1"
                        />
                    ))}

                    {/* 2. Target Range Band */}
                    <rect
                        x="0"
                        y={getY(targetRange.max)}
                        width={CHART_W}
                        height={getY(targetRange.min) - getY(targetRange.max)}
                        fill="#10b981" // Emerald-500
                        fillOpacity="0.1"
                    />
                    {/* Dashed Lines for Target Range Boundaries */}
                    <line x1="0" y1={getY(targetRange.max)} x2={CHART_W} y2={getY(targetRange.max)} stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.5" />
                    <line x1="0" y1={getY(targetRange.min)} x2={CHART_W} y2={getY(targetRange.min)} stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.5" />

                    {/* 3. Trend Line */}
                    {/* 3. Trend Line (Segments for dashed support) */}
                    {trendPoints.map((p, i) => {
                        if (i === 0) return null;
                        const prev = trendPoints[i - 1];
                        return (
                            <line
                                key={`line-${i}`}
                                x1={getX(prev.monthIndex)}
                                y1={getY(prev.value)}
                                x2={getX(p.monthIndex)}
                                y2={getY(p.value)}
                                stroke="#3b82f6"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray={p.isProjected ? "4 4" : ""}
                                strokeOpacity={p.isProjected ? "0.5" : "1"}
                            />
                        );
                    })}

                    {/* 4. Data Points & Labels */}
                    {trendPoints.map((p, i) => (
                        <g key={i}>
                            {/* Only show dots for real changes, or the very end */}
                            {(!p.isProjected || i === trendPoints.length - 1) && (
                                <>
                                    <circle
                                        cx={getX(p.monthIndex)}
                                        cy={getY(p.value)}
                                        r={p.isProjected ? 3 : 4}
                                        fill={p.isProjected ? "white" : "#3b82f6"}
                                        stroke="#3b82f6"
                                        strokeWidth="2"
                                    />
                                    <text
                                        x={getX(p.monthIndex)}
                                        y={getY(p.value) - 10}
                                        textAnchor="middle"
                                        className="text-[10px] font-bold fill-slate-600"
                                        style={{ fontSize: '12px' }}
                                    >
                                        {p.value.toFixed(2)}
                                    </text>
                                </>
                            )}
                        </g>
                    ))}

                </svg>
            </div>
        </div>
    );
};
