import { useMemo, useState, useEffect } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';
import { calculateOptimizedTrajectory, analyzeGroupRisk } from '@/features/strategy/logic/optimizer';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from 'recharts';
import { format } from 'date-fns';

export function RscaScatterPlot() {
    const summaryGroups = useSummaryGroups();
    const { rsConfig, selectCycle, setStrategyViewMode, setActiveTab } = useNavfitStore();

    const targetLimit = rsConfig.targetRsca || 4.20;
    const lowerTarget = 3.80;

    // 1. Group Data by Competitive Key & Analyze Risk
    const { allTrajectories, riskAnalysis, sortedKeys, defaultSelectedKey } = useMemo(() => {
        const groupsByKey = new Map<string, typeof summaryGroups>();

        summaryGroups.forEach(g => {
            const key = g.competitiveGroupKey || 'Uncategorized';
            const status = g.status || 'Draft';
            // Include all relevant statuses
            if (['Draft', 'Drafting', 'Planning', 'Review', 'Submitted', 'Final', 'Planned', 'Pending'].includes(status)) {
                if (!groupsByKey.has(key)) groupsByKey.set(key, []);
                groupsByKey.get(key)!.push(g);
            }
        });

        const trajectories: Record<string, ReturnType<typeof calculateOptimizedTrajectory>> = {};
        const riskAnalysis: Record<string, ReturnType<typeof analyzeGroupRisk>> = {};

        groupsByKey.forEach((groups, key) => {
            const traj = calculateOptimizedTrajectory(groups, targetLimit);
            trajectories[key] = traj;
            riskAnalysis[key] = analyzeGroupRisk(traj);
        });

        // Sort Keys by Risk (Lowest Margin to 4.2 first)
        const keys = Object.keys(riskAnalysis).sort((a, b) => {
            return riskAnalysis[a].minMargin - riskAnalysis[b].minMargin;
        });

        return {
            allTrajectories: trajectories,
            riskAnalysis,
            sortedKeys: keys,
            defaultSelectedKey: keys[0] // Worst-First
        };
    }, [summaryGroups, targetLimit]);

    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    // Auto-select the "Worst" group on load or when keys change
    useEffect(() => {
        if (defaultSelectedKey && !selectedKey) {
            setSelectedKey(defaultSelectedKey);
        }
    }, [defaultSelectedKey, selectedKey]);

    // Derived Data for Render
    const activeKey = selectedKey || defaultSelectedKey;
    const data = activeKey ? allTrajectories[activeKey] : [];

    // Safety check just in case data is empty
    if (!data || data.length === 0) {
        return <div className="p-4 text-xs text-slate-400">No trajectory data available.</div>;
    }

    // Calculate Y-Axis Domain dynamically
    const minVal = Math.min(...data.map(d => d.rsca), lowerTarget) - 0.10;
    const maxVal = Math.max(...data.map(d => d.rsca), targetLimit) + 0.10;

    // Define Gradient Offsets for "Green Zone" vs "Red Zone" fill
    // We want Green (Safe) whenever < 4.20. (Technically 3.8-4.2 is Optimal, <3.8 is just "Low" but safe from bust)
    // Actually, user wants to keep BETWEEN 3.8 and 4.2.
    // So > 4.2 is RED using Gradient?
    // Let's keep it simple: > 4.2 is RED, <= 4.2 is GREEN (Visualizing the "Ceiling" risk)
    const gradientOffset = () => {
        if (maxVal <= minVal) return 0;
        return (targetLimit - minVal) / (maxVal - minVal);
    };

    const off = gradientOffset();

    return (
        <div className="w-full h-full min-h-[300px] flex gap-2">
            <style>{`
                .recharts-wrapper { outline: none !important; }
                .recharts-surface:focus { outline: none !important; }
            `}</style>

            {/* MAIN CHART AREA */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex justify-between items-center mb-4 px-2">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            Strategy Engine
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-widest border border-indigo-200">
                                {activeKey}
                            </span>
                        </h3>
                        <p className="text-xs text-slate-500">Projected Cumulative RSCA vs. Target Band ({lowerTarget.toFixed(2)} - {targetLimit.toFixed(2)})</p>
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-emerald-500/20 border border-emerald-500 rounded-sm"></div>
                            Safe Altitude
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-red-500/20 border border-red-500 rounded-sm"></div>
                            Risk Zone
                        </div>
                    </div>
                </div>

                <div className="flex-1 w-full min-h-0 bg-slate-50/50 rounded-2xl border border-slate-200 shadow-inner relative overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                        >
                            <defs>
                                <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset={off} stopColor="#ef4444" stopOpacity={0.15} /> {/* Red Above */}
                                    <stop offset={off} stopColor="#10b981" stopOpacity={0.15} /> {/* Green Below */}
                                </linearGradient>
                                <linearGradient id="lineColor" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset={off} stopColor="#ef4444" stopOpacity={1} />
                                    <stop offset={off} stopColor="#10b981" stopOpacity={1} />
                                </linearGradient>
                            </defs>

                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.5} />

                            <XAxis
                                dataKey="date"
                                type="number"
                                domain={['dataMin', 'dataMax']}
                                tickFormatter={(unixTime) => format(new Date(unixTime), 'MMM yy')}
                                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                                minTickGap={30}
                            />
                            <YAxis
                                domain={[minVal, maxVal]} // Zoomed in to "Altitude"
                                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                                width={40}
                                tickFormatter={(val) => val.toFixed(2)}
                            />

                            {/* The Crash Line (Upper Limit) */}
                            <ReferenceLine y={targetLimit} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.6} label={{ position: 'right', value: 'NB', fill: '#ef4444', fontSize: 10 }} />

                            {/* The Floor Line (Lower Limit) */}
                            <ReferenceLine y={lowerTarget} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.4} label={{ position: 'right', value: 'Min', fill: '#10b981', fontSize: 10 }} />


                            <Tooltip
                                cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                content={({ active, payload }: any) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        const isRisk = d.rsca > targetLimit; // Only flag upper limit burst as "RISK"
                                        return (
                                            <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl backdrop-blur-md border border-slate-700/50 min-w-[200px]">
                                                <div className="flex justify-between items-start mb-2 pb-2 border-b border-white/10">
                                                    <span className="font-bold text-sm">{format(new Date(d.date), 'MMM yyyy')}</span>
                                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${d.isProjected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-700 text-slate-300'}`}>
                                                        {d.isProjected ? 'Optimized' : 'Actual'}
                                                    </span>
                                                </div>

                                                <div className="space-y-1.5 text-xs">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-400">Target Band</span>
                                                        <span className="font-mono text-white opacity-60">{lowerTarget.toFixed(2)} - {targetLimit.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-slate-300">Cumulative RSCA</span>
                                                        <span className={`font-mono font-bold ${isRisk ? 'text-red-400' : 'text-emerald-400'}`}>
                                                            {d.rsca.toFixed(2)}
                                                        </span>
                                                    </div>

                                                    {d.isProjected && (
                                                        <div className="mt-2 pt-2 border-t border-white/10">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-indigo-300">Optimal Group Interval</span>
                                                                <span className="font-mono font-bold text-indigo-300">{d.optimalMta.toFixed(2)}</span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 mt-0.5 text-right">
                                                                Max allowance for {d.memberCount} members
                                                            </p>
                                                        </div>
                                                    )}

                                                    <div className="mt-2 text-[10px] text-slate-500 italic text-center pt-1">
                                                        {d.groupName}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />

                            <Area
                                type="monotone"
                                dataKey="rsca"
                                stroke="url(#lineColor)"
                                fill="url(#splitColor)"
                                strokeWidth={3}
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }}
                                dot={({ cx, cy, payload }: any) => {
                                    // Custom Dot to show Actual vs Projected nodes
                                    if (!payload.isProjected) {
                                        return <circle cx={cx} cy={cy} r={3} fill="#cbd5e1" stroke="none" />;
                                    }
                                    // Small dot for projected
                                    return <circle cx={cx} cy={cy} r={3} fill="#6366f1" stroke="none" />;
                                }}
                                onClick={(data: any) => {
                                    // Recharts click handler passes the data point
                                    const p = data?.payload; // Check data object structure
                                    if (p && p.groupId) {
                                        selectCycle(p.groupId, p.compKey);
                                        setStrategyViewMode('workspace');
                                        setActiveTab('competitive_groups');
                                    }
                                }}
                                className="cursor-pointer"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* SIDEBAR TRIAGE LIST */}
            <div className="w-48 flex flex-col h-full min-h-0 pl-2 border-l border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1 flex-none">
                    Risk Triage
                </div>
                <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    {sortedKeys.map(key => {
                        const risk = riskAnalysis[key];
                        if (!risk || !risk.lastPoint) return null;

                        // Margin against the UPPER LIMIT (4.20)
                        const margin = risk.minMargin;
                        const isRisk = risk.isCritical; // Uses 4.20
                        const isActive = activeKey === key;

                        return (
                            <button
                                key={key}
                                onClick={() => setSelectedKey(key)}
                                className={`
                                    group relative w-full text-left p-2 rounded-lg border transition-all shrink-0
                                    ${isActive
                                        ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500/20'
                                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                                    }
                                `}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-xs font-bold ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>
                                        {key.split(' ')[0]} {/* Rank */}
                                    </span>
                                    <div className={`w-2 h-2 rounded-full ${isRisk ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] text-slate-400 truncate max-w-[60px]">
                                        {key.split(' ').slice(1).join(' ')}
                                    </span>
                                    <span className={`font-mono text-xs font-bold ${margin < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                        {margin > 0 ? '+' : ''}{margin.toFixed(2)}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
