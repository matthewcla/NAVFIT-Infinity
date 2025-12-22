import { ChevronDown } from 'lucide-react';

interface GroupHeaderProps {
    title: string;
    count: number;
    avgRSCA?: string | number;
    isExpanded: boolean;
    onToggle: () => void;
    trendData?: number[]; // Deprecated, use trendPoints
    trendPoints: { monthIndex: number, value: number }[];
    targetRange: { min: number, max: number };
}

export const GroupHeader = ({ title, count, isExpanded, onToggle, trendPoints, targetRange }: GroupHeaderProps) => {
    // Chart Config
    const CHART_H = 100; // ViewBox Height
    const CHART_W = 1000; // ViewBox Width
    const Y_MIN = 3.0; // Fixed scale for trait evaluation context (usually 3.0 to 5.0)
    const Y_MAX = 5.0;

    // Helper to map Value to Y coord (inverted, 0 is top)
    const getY = (val: number) => {
        const pct = (val - Y_MIN) / (Y_MAX - Y_MIN);
        return CHART_H - (pct * CHART_H);
    };

    // Helper to map Month Index (0-11) to X coord
    const getX = (monthIdx: number) => {
        // Timeline has 12 columns. 
        // 0 -> Start of Jan. 11 -> Start of Dec.
        // We want to center in the month column? Or start? 
        // TimelineRow months are grid-cols-12. 
        // So each month is 1/12th of width.
        // Let's assume point is Middle of month: (MonthIdx + 0.5) * (TotalWidth / 12)
        return ((monthIdx + 0.5) / 12) * CHART_W;
    };

    return (
        <div
            className="bg-slate-50 border-y border-slate-200 grid grid-cols-12 gap-4 hover:bg-slate-100 transition-colors group"
            onClick={onToggle}
        >
            {/* Left Info Section (Matches "Member / Milestone" col-span-3) */}
            <div className="col-span-3 pl-4 py-4 flex flex-col justify-start cursor-pointer">
                <div className="flex items-center space-x-2 mb-2">
                    <ChevronDown
                        size={16}
                        className={`text-slate-500 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}
                    />
                    <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{title}</h4>
                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{count}</span>
                </div>

                <div className="text-xs text-slate-500 pl-6">
                    <div className="flex justify-between w-32 mb-1">
                        <span>Target Range:</span>
                        <span className="font-mono font-bold text-slate-700">{targetRange.min.toFixed(2)} - {targetRange.max.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-32">
                        <span>Current RSCA:</span>
                        <span className="font-mono font-bold text-blue-600">{trendPoints.length > 0 ? trendPoints[trendPoints.length - 1].value.toFixed(2) : 'N/A'}</span>
                    </div>
                </div>
            </div>

            {/* Right Chart Section (Matches "Timeline" col-span-9) */}
            <div className="col-span-9 relative h-32 pr-4 border-l border-slate-200">
                <svg width="100%" height="100%" viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" className="overflow-visible">

                    {/* 1. Vertical Grid Lines (Matches Months) */}
                    {Array.from({ length: 12 }).map((_, i) => (
                        <line
                            key={i}
                            x1={((i + 1) / 12) * CHART_W}
                            y1="0"
                            x2={((i + 1) / 12) * CHART_W}
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
                    <polyline
                        points={trendPoints.map(p => `${getX(p.monthIndex)},${getY(p.value)}`).join(' ')}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="drop-shadow-sm"
                    />

                    {/* 4. Data Points & Labels */}
                    {trendPoints.map((p, i) => (
                        <g key={i}>
                            <circle cx={getX(p.monthIndex)} cy={getY(p.value)} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                            <text
                                x={getX(p.monthIndex)}
                                y={getY(p.value) - 10}
                                textAnchor="middle"
                                className="text-[10px] font-bold fill-slate-600"
                                style={{ fontSize: '12px' }}
                            >
                                {p.value.toFixed(2)}
                            </text>
                        </g>
                    ))}

                </svg>
            </div>
        </div>
    );
};
