
import { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Cell
} from 'recharts';
import type { Report } from '@/types';

interface MtaWaterlineWidgetProps {
    reports: Report[];
    targetRsca: number;
    rscaMargin: number;
}

export function MtaWaterlineWidget({ reports, targetRsca, rscaMargin }: MtaWaterlineWidgetProps) {
    const data = useMemo(() => {
        // Sort by Trait Average Descending (Rank Order usually correlates)
        // Actually, let's sort by Rank Index (input order) if possible, but reports might not have explicit rank index unless we map it.
        // In RankEditor, reports are already ordered by Rank.
        return reports.map((r, index) => ({
            name: r.memberName,
            rank: index + 1,
            mta: r.traitAverage,
            rec: r.promotionRecommendation,
            isLocked: r.isLocked,
            id: r.memberId
        }));
    }, [reports]);



    return (
        <div className="w-full h-full flex flex-col bg-white rounded-lg border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700">MTA Waterline</h3>
                <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        <span className="text-slate-500">Optimized</span>
                    </span>
                    <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                        <span className="text-slate-500">Locked</span>
                    </span>
                </div>
            </div>

            <div className="flex-1 min-h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="rank"
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            domain={[3.0, 5.0]}
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                            ticks={[3.0, 3.5, 4.0, 4.5, 5.0]}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ color: '#64748b', fontSize: '11px', marginBottom: '2px' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                            formatter={(value: any) => [value ? Number(value).toFixed(2) : '', 'MTA']}
                            labelFormatter={(label) => `Rank ${label}`}
                        />
                        <ReferenceLine
                            y={targetRsca}
                            stroke="#10b981"
                            strokeDasharray="3 3"
                            label={{ value: 'Target', position: 'right', fill: '#10b981', fontSize: 10 }}
                        />

                        {/* Upper Margin Line */}
                        <ReferenceLine
                            y={targetRsca + rscaMargin}
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                            strokeOpacity={0.5}
                        />

                        <Bar dataKey="mta" radius={[2, 2, 0, 0]} maxBarSize={40}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.isLocked ? '#cbd5e1' : '#6366f1'}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-2 text-center text-xs text-slate-400">
                Sorted by Rank (1 = Highest)
            </div>
        </div>
    );
}
