import { useMemo } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';
import { calculateCumulativeRSCA, calculateEotRsca } from '@/features/strategy/logic/rsca';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ReferenceLine, Cell } from 'recharts';
import { format } from 'date-fns';





export function RscaScatterPlot() {
    const summaryGroups = useSummaryGroups();
    const { rsConfig, roster, setActiveTab, selectCycle, setStrategyViewMode } = useNavfitStore();

    const data = useMemo(() => {
        // Group by Key first to handle the "projection" aggregation properly per group
        const groupsByKey = new Map<string, typeof summaryGroups>();

        summaryGroups.forEach(g => {
            const key = g.competitiveGroupKey || 'Uncategorized';
            // Trajectory Engine needs FULL visibility:
            // 1. History (Final/Submitted)
            // 2. Active (Draft/Review)
            // 3. ALL Future Plans (Planned/Pending) - overrides the 90-day "Active" rule for this specific visual
            const status = g.status || 'Draft';
            if (['Draft', 'Drafting', 'Planning', 'Review', 'Submitted', 'Final', 'Planned', 'Pending'].includes(status)) {
                if (!groupsByKey.has(key)) groupsByKey.set(key, []);
                groupsByKey.get(key)!.push(g);
            }
        });

        const plotPoints: {
            x: number; // Timestamp
            y: number; // Margin (Positive = Good, Negative = Risk)
            z: number; // Member Count (Bubble Size)
            name: string; // Group Name
            rsca: number; // Projected Value
            target: number;
            id: string; // ID to jump to
            compKey: string;
        }[] = [];

        groupsByKey.forEach((groups, key) => {
            // Find the "Active" cycle for this group to get the 'end date' for the X-Axis
            // We use the Latest Active cycle as the anchor
            const sortedGroups = [...groups].sort((a, b) => new Date(b.periodEndDate).getTime() - new Date(a.periodEndDate).getTime());
            const primaryGroup = sortedGroups[0];
            if (!primaryGroup) return;

            const rank = primaryGroup.paygrade || key.split(' ')[0];
            const limit = rsConfig.targetRsca || 3.60;

            // 1. Current RSCA Logic (Same as RscaRiskWidget)
            const currentRsca = calculateCumulativeRSCA(groups, rank, ['Final', 'Submitted', 'Review', 'Planning', 'Drafting', 'Draft']);

            // 2. Count Reports
            let totalReports = 0;
            groups.forEach(g => {
                if (['Final', 'Submitted', 'Review', 'Planning', 'Drafting', 'Draft'].includes(g.status || '')) {
                    totalReports += g.reports.filter(r => r.traitAverage > 0).length;
                }
            });

            // 3. EOT Projection
            const { eotRsca } = calculateEotRsca(
                roster,
                currentRsca,
                totalReports,
                rsConfig.changeOfCommandDate || new Date(new Date().getFullYear() + 2, 0, 1).toISOString(),
                rank
            );

            // 4. Construct Point
            // Y-Axis: Margin. 
            // If Limit is 3.60 and EOT is 3.65, Margin is -0.05 (Bad).
            // We want "Up" to be "Good" visually? Or "Center" to be target?
            // Let's settle on: Y = Limit - Projected.
            // Result: 3.60 - 3.65 = -0.05. (Below Axis = Risk).
            // Result: 3.60 - 3.40 = +0.20. (Above Axis = Safe).
            const margin = limit - eotRsca;
            const size = primaryGroup.reports.length || 5; // Min size 5 for visibility

            plotPoints.push({
                x: new Date(primaryGroup.periodEndDate).getTime(),
                y: margin,
                z: size,
                name: key,
                rsca: eotRsca,
                target: limit,
                id: primaryGroup.id,
                compKey: key
            });
        });

        return plotPoints;
    }, [summaryGroups, rsConfig, roster]);

    return (
        <div className="w-full h-full min-h-[300px] flex flex-col">
            <style>{`
                .recharts-wrapper { outline: none !important; }
                .recharts-surface:focus { outline: none !important; }
            `}</style>
            <div className="flex justify-between items-center mb-4 px-2">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">Trajectory Engine</h3>
                    <p className="text-xs text-slate-500">Projected EOT RSCA Margin vs. Timeline</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium">
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Safe</div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Watch</div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Risk</div>
                </div>
            </div>

            <div className="flex-1 w-full min-h-0 bg-gradient-to-b from-white to-slate-50/50 rounded-2xl border border-slate-200/60 shadow-inner relative overflow-hidden">
                {/* Decoration Lines */}
                <div className="absolute inset-x-0 top-1/2 h-px bg-indigo-500/10 border-t border-dashed border-indigo-500/20 z-0 pointer-events-none" />

                <div className="w-full h-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                    <div className="min-w-[800px] lg:min-w-[1000px] h-full p-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                                <XAxis
                                    dataKey="x"
                                    domain={['auto', 'auto']}
                                    name="Date"
                                    tickFormatter={(unixTime) => format(new Date(unixTime), 'MMM yyyy')}
                                    type="number"
                                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    dataKey="y"
                                    name="Margin"
                                    unit=""
                                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                    dx={-10}
                                />
                                <ZAxis type="number" dataKey="z" range={[100, 800]} name="Members" />

                                <Tooltip
                                    cursor={{ strokeDasharray: '3 3' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl backdrop-blur-md border border-slate-700/50 min-w-[180px]">
                                                    <p className="font-bold text-sm mb-1">{data.name}</p>
                                                    <div className="space-y-1 text-xs text-slate-300">
                                                        <div className="flex justify-between">
                                                            <span>Projected RSCA:</span>
                                                            <span className="font-mono text-white">{data.rsca.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Target Limit:</span>
                                                            <span className="font-mono text-white">{data.target.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between border-t border-white/10 pt-1 mt-1">
                                                            <span>Margin:</span>
                                                            <span className={`font-mono font-bold ${data.y < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                                {data.y > 0 ? '+' : ''}{data.y.toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <div className="mt-2 text-[10px] text-slate-500 text-right italic">
                                                            Click to Open Cycle
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />

                                {/* The Base Waterline (Zero Margin) */}
                                <ReferenceLine y={0} stroke="#6366f1" strokeDasharray="3 3" strokeOpacity={0.4} />

                                <Scatter name="Groups" data={data} onClick={(p) => {
                                    if (p?.payload?.id) {
                                        // Navigate to Specific Summary Group (Cycle)
                                        selectCycle(p.payload.id, p.payload.compKey);
                                        setStrategyViewMode('workspace');
                                        setActiveTab('competitive_groups');
                                    }
                                }}>
                                    {data.map((entry, index) => {
                                        let fill = '#10b981'; // Green
                                        if (entry.y < 0) fill = '#ef4444'; // Red
                                        else if (entry.y < 0.05) fill = '#f59e0b'; // Amber

                                        return <Cell key={`cell-${index}`} fill={fill} stroke="white" strokeWidth={2} className="hover:opacity-80 cursor-pointer transition-opacity outline-none focus:outline-none" />;
                                    })}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
