
import { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    ReferenceLine
} from 'recharts';
import { format } from 'date-fns';
import type { SummaryGroup } from '@/types';

interface MtaTrendChartProps {
    groups: SummaryGroup[];
    // Optional global target if not per-group? Phase 2 added metricConfig to groups, 
    // so we should prefer per-group config or the latest planned target.
}

export function MtaTrendChart({ groups }: MtaTrendChartProps) {
    const data = useMemo(() => {
        // Sort chronologically
        const sorted = [...groups].sort((a, b) => new Date(a.periodEndDate).getTime() - new Date(b.periodEndDate).getTime());

        return sorted.map(g => {
            const isProjected = g.status === 'Planned' || g.status === 'Draft';

            // For projected groups, we might want to use the Calculated Projected RSCA if available, 
            // or the `rsca` field if the engine updated it. 
            // Phase 2 engine updates `reports` -> we should recalc rsca from reports to be safe 
            // or trust `group.rsca` if it was updated (NavfitStore doesn't always auto-update `rsca` property on the group object itself).

            // Let's calc largely to be safe for display
            // Align logic with optimizer.ts: valid reports only (Trait > 0, Not NOB, Not Observed)
            const activeReports = g.reports.filter(r => r.traitAverage > 0 && r.promotionRecommendation !== 'NOB' && !r.notObservedReport);

            const calculatedRsca = activeReports.length > 0
                ? activeReports.reduce((sum, r) => sum + r.traitAverage, 0) / activeReports.length
                : (g.rsca || 0);

            return {
                id: g.id,
                name: g.name,
                date: g.periodEndDate,
                rsca: Number(calculatedRsca.toFixed(2)),
                target: g.metricConfig?.targetRsca, // Might be undefined for old history
                isProjected,
                status: g.status
            };
        });
    }, [groups]);

    // Determine Y Axis domain padding
    const domain = useMemo(() => {
        if (data.length === 0) return [3.0, 5.0];
        const values = data.map(d => d.rsca).filter(v => v > 0);
        if (data.some(d => d.target)) values.push(...data.filter(d => d.target).map(d => d.target!));

        const min = Math.min(...values);
        const max = Math.max(...values);

        return [Math.max(2.0, min - 0.2), Math.min(5.0, max + 0.2)];
    }, [data]);

    return (
        <div className="w-full h-full bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex flex-col">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">RSCA Trend & Projection</h3>

            <div className="flex-1 w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(val) => format(new Date(val), 'MMM yy')}
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                            minTickGap={30}
                        />
                        <YAxis
                            domain={domain}
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                            width={40}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            labelFormatter={(label, payload) => {
                                const dateStr = format(new Date(label), 'MMM d, yyyy');
                                // Check if this is the last point (EOT) - heuristic matching the data array order
                                if (payload && payload.length > 0 && payload[0].payload.id === data[data.length - 1].id) {
                                    return `${dateStr} (End of Tour)`;
                                }
                                return dateStr;
                            }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                        {/* History Line (Solid) */}
                        {/* We split data into history vs projected segments or use customized activeDot/strokeDasharray */}

                        <Line
                            type="monotone"
                            dataKey="rsca"
                            name="Actual / Projected"
                            stroke="#6366f1"
                            strokeWidth={2}
                            dot={(props: any) => {
                                const { cx, cy, payload } = props;
                                if (!cx || !cy) return null;
                                const isProj = payload.isProjected;
                                return (
                                    <circle
                                        cx={cx} cy={cy} r={4}
                                        fill={isProj ? "#fff" : "#6366f1"}
                                        stroke={isProj ? "#6366f1" : "none"}
                                        strokeWidth={2}
                                    />
                                );
                            }}
                            activeDot={{ r: 6 }}
                        />

                        {/* Target Line (Dashed) */}
                        <Line
                            type="stepAfter"
                            dataKey="target"
                            name="Target RSCA"
                            stroke="#10b981"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={false}
                            connectNulls
                        />

                        {/* Today Horizon Line */}
                        <ReferenceLine
                            x={new Date().getTime()}
                            stroke="#94a3b8"
                            strokeDasharray="3 3"
                            label={{ position: 'insideTopLeft', value: 'TODAY', fill: '#94a3b8', fontSize: 10 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-2 flex justify-center gap-6 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <span>Historical</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full border border-indigo-500 bg-white"></div>
                    <span>Projected</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-4 h-0.5 border-t border-dashed border-emerald-500"></div>
                    <span>Target</span>
                </div>
            </div>
        </div>
    );
}
