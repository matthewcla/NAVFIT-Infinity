import { useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useScaleFactor } from '@/context/ScaleContext';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    ReferenceLine,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface RscaScattergramProps {
    members: Array<{ mta: number; id: string; name: string }>;
    rsca: number;
}

interface TooltipData {
    mta: string;
    count: number;
    users: string[];
}

export function RscaScattergram({ members, rsca }: RscaScattergramProps) {
    const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

    const data = useMemo(() => {
        if (members.length === 0) {
            return [];
        }

        // Calculate min and max MTA from actual member data
        const mtaValues = members.map(m => m.mta);
        const rawMin = Math.min(...mtaValues);
        const rawMax = Math.max(...mtaValues);

        // Round down min to nearest 0.1 and subtract 0.1 for padding
        // Round up max to nearest 0.1 and add 0.1 for padding
        const minMta = Math.floor((rawMin - 0.1) * 10) / 10;
        const maxMta = Math.ceil((rawMax + 0.1) * 10) / 10;

        // Initialize bins from minMta to maxMta in 0.1 increments
        const bins: Record<string, { mta: string; count: number; users: string[] }> = {};

        // Populate bins for the dynamic range
        for (let i = Math.round(minMta * 10); i <= Math.round(maxMta * 10); i++) {
            const val = (i / 10).toFixed(1);
            bins[val] = { mta: val, count: 0, users: [] };
        }

        // Fill bins with member data
        members.forEach(m => {
            // Round to nearest 0.1
            const binKey = m.mta.toFixed(1);

            if (bins[binKey]) {
                bins[binKey].count++;
                bins[binKey].users.push(m.name);
            }
        });

        return Object.values(bins);
    }, [members]);

    // Calculate strict Reference Line position matching the bin keys
    const rscaRef = rsca.toFixed(1);

    // Handle bar mouse events for portal tooltip
    const handleBarMouseMove = useCallback((entry: TooltipData, event: React.MouseEvent) => {
        setTooltipData(entry);
        setTooltipPosition({ x: event.clientX + 10, y: event.clientY - 10 });
    }, []);

    const handleBarMouseLeave = useCallback(() => {
        setTooltipData(null);
    }, []);

    // Portal Tooltip Component
    const PortalTooltip = () => {
        const { scale } = useScaleFactor();
        if (!tooltipData) return null;

        return createPortal(
            <div
                className="fixed bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-xs min-w-[150px] pointer-events-none"
                style={{
                    left: tooltipPosition.x,
                    top: tooltipPosition.y,
                    zIndex: 99999,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left'
                }}
            >
                <div className="flex justify-between items-center mb-2 border-b border-slate-100 pb-1">
                    <span className="font-bold text-slate-700">MTA: {tooltipData.mta}</span>
                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-medium">
                        {tooltipData.count}
                    </span>
                </div>

                {tooltipData.users.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-0.5">Members</span>
                        <ul className="max-h-[120px] overflow-y-auto custom-scrollbar">
                            {tooltipData.users.slice(0, 10).map((u: string, i: number) => (
                                <li key={i} className="text-slate-600 truncate py-0.5">{u}</li>
                            ))}
                            {tooltipData.users.length > 10 && (
                                <li className="text-slate-400 italic text-[10px] mt-1">
                                    +{tooltipData.users.length - 10} others
                                </li>
                            )}
                        </ul>
                    </div>
                ) : (
                    <span className="text-slate-400 italic">No reports</span>
                )}
            </div>,
            document.body
        );
    };

    return (
        <div className="h-full w-full bg-white relative pt-6 pl-2 pr-2">
            <div className="absolute top-3 left-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider z-10">
                MTA Distribution
            </div>

            <div className="w-full h-full" onMouseLeave={handleBarMouseLeave}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }} barGap={0} barCategoryGap={1}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="mta"
                            tick={{ fontSize: 9, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            interval={4} // Show every 0.5 (approx every 5th tick of 0.1 bins)
                            minTickGap={10}
                        />
                        <YAxis
                            tick={{ fontSize: 9, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                        />
                        <Bar
                            dataKey="count"
                            fill="#cbd5e1"
                            radius={[2, 2, 0, 0]}
                            maxBarSize={40}
                            onMouseMove={(data, _index, event) => handleBarMouseMove(data as unknown as TooltipData, event as unknown as React.MouseEvent)}
                            onMouseLeave={handleBarMouseLeave}
                        >
                            {
                                data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.mta === rscaRef ? '#818cf8' : '#cbd5e1'}
                                        className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                                    />
                                ))
                            }
                        </Bar>
                        <ReferenceLine
                            x={rscaRef}
                            stroke="#6366f1"
                            strokeDasharray="3 3"
                            strokeWidth={1.5}
                        >
                            <text
                                x={0}
                                y={0}
                                dy={-10}
                                dx={2}
                                fill="#6366f1"
                                fontSize={10}
                                fontWeight="bold"
                                textAnchor="start"
                            >
                                RSCA
                            </text>
                        </ReferenceLine>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <PortalTooltip />
        </div>
    );
}
