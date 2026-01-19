import { useMemo } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';
import { calculateCumulativeRSCA, calculateEotRsca } from '@/features/strategy/logic/rsca';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';

export function RscaRiskWidget() {
    const summaryGroups = useSummaryGroups();
    const { rsConfig, roster, selectCycle, setStrategyViewMode } = useNavfitStore();

    // Group SummaryGroups by Competitive Group Key
    const riskData = useMemo(() => {
        const groupsByKey = new Map<string, typeof summaryGroups>();

        summaryGroups.forEach(g => {
            const key = g.competitiveGroupKey || 'Uncategorized';
            if (!groupsByKey.has(key)) groupsByKey.set(key, []);
            groupsByKey.get(key)!.push(g);
        });

        // Calculate Metrics for each Comp Group
        const risks: {
            key: string;
            label: string;
            current: number;
            projected: number;
            limit: number;
            currentMargin: number;
            projectedMargin: number;
        }[] = [];

        groupsByKey.forEach((groups, key) => {
            // Determine Label & Rank
            // key example: "O-3 1110" or "E-5 Active"
            const sample = groups[0];
            const rank = sample.paygrade || key.split(' ')[0]; // Fallback

            // 1. Current RSCA (Realized + Active Drafts)
            // specific filter logic handled inside calculateCumulativeRSCA if we pass all groups, 
            // but here we pass just relevant groups to be safe and efficient.
            const currentRsca = calculateCumulativeRSCA(groups, rank, ['Final', 'Submitted', 'Review', 'Planning', 'Drafting', 'Draft']);

            const limit = rsConfig.targetRsca || 3.60;
            const currentMargin = limit - currentRsca;

            // 2. Projected EOT RSCA
            // We need 'totalSigned' count for the EOT math. 
            // 'groups' includes drafts. We need to distinguish realized vs draft for the 'baseline'.
            // Actually, calculateEotRsca takes 'currentRsca' as the starting point. 
            // If 'currentRsca' includes Drafts, we are projecting from the END of the current cycle(s).

            // Calculate total reports involved in the 'currentRsca' figure
            let totalReports = 0;
            groups.forEach(g => {
                // Include reports from groups used in RSCA calc
                const status = g.status || 'Draft';
                if (['Final', 'Submitted', 'Review', 'Planning', 'Drafting', 'Draft'].includes(status)) {
                    // Count valid reports (>0 trait avg)
                    totalReports += g.reports.filter(r => r.traitAverage > 0).length;
                }
            });

            // Run EOT Simulation
            const { eotRsca } = calculateEotRsca(
                roster, // RosterMember[] satisfies ProjectableMember
                currentRsca,
                totalReports,
                rsConfig.changeOfCommandDate || new Date(new Date().getFullYear() + 2, 0, 1).toISOString(), // Default 2 years out if missing
                rank
            );

            const projectedMargin = limit - eotRsca;

            risks.push({
                key,
                label: key,
                current: currentRsca,
                projected: eotRsca,
                limit,
                currentMargin,
                projectedMargin
            });
        });

        // Sort by Projected Margin (ascending - highest future risk first)
        return risks.sort((a, b) => a.projectedMargin - b.projectedMargin);

    }, [summaryGroups, rsConfig, roster]);

    return (
        <div className="bg-white p-0 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    RSCA Watch
                </h3>
                <span className="text-[10px] font-medium text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                    End of Tour Projection
                </span>
            </div>
            <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {riskData.length === 0 ? (
                    <div className="p-5 text-center text-xs text-slate-400">No active competitive groups found.</div>
                ) : (
                    riskData.map(item => {
                        // Colors
                        const getStatusColor = (margin: number) => {
                            if (margin < 0) return 'text-red-600';
                            if (margin < 0.05) return 'text-amber-500';
                            return 'text-emerald-600';
                        };

                        const getBarColor = (margin: number) => {
                            if (margin < 0) return 'bg-red-500';
                            if (margin < 0.05) return 'bg-amber-400';
                            return 'bg-emerald-500';
                        };

                        const currentPercent = (item.current / item.limit) * 100;
                        const projectedPercent = (item.projected / item.limit) * 100;

                        // Trend
                        const trend = item.projected - item.current;
                        const isRising = trend > 0;

                        // Navigation Handler
                        const handleRowClick = () => {
                            // We don't have a specific cycle ID easily here because this is an AGGREGATE of multiple groups (potentially).
                            // However, usually "O-3 1110" active refers to a specific active summary group or at least the Competitive Group dashboard.
                            // For now, let's find the 'Active' or newest group in this bucket and jump to it.
                            // We scan the groups used to build this item. We need access to the map, but it's inside useMemo.
                            // Simpler: Search summaryGroups for a matching key and active status.
                            const activeGroup = summaryGroups.find(g =>
                                (g.competitiveGroupKey === item.key || (!g.competitiveGroupKey && item.key === 'Uncategorized')) &&
                                ['Draft', 'Drafting', 'Planning', 'Review', 'Submitted'].includes(g.status || '')
                            );

                            const { setActiveTab } = useNavfitStore.getState();

                            if (activeGroup) {
                                selectCycle(activeGroup.id, activeGroup.competitiveGroupKey);
                                setStrategyViewMode('workspace');
                                setActiveTab('competitive_groups');
                            } else {
                                // Fallback: just grab the most recent one even if closed
                                const recentGroup = summaryGroups.filter(g => g.competitiveGroupKey === item.key).sort((a, b) => new Date(b.periodEndDate).getTime() - new Date(a.periodEndDate).getTime())[0];
                                if (recentGroup) {
                                    selectCycle(recentGroup.id, recentGroup.competitiveGroupKey);
                                    setStrategyViewMode('workspace');
                                    setActiveTab('competitive_groups');
                                }
                            }
                        };

                        return (
                            <div
                                key={item.key}
                                onClick={handleRowClick}
                                className="px-5 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group cursor-pointer"
                            >
                                {/* Header */}
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{item.label}</div>
                                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">Target: {item.limit.toFixed(2)}</div>
                                    </div>

                                    <div className="text-right">
                                        <div className={`text-sm font-mono font-bold ${getStatusColor(item.projectedMargin)}`}>
                                            {item.projected.toFixed(2)}
                                        </div>
                                        <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                                            {isRising ? <TrendingUp className="w-3 h-3 text-amber-500" /> : <TrendingDown className="w-3 h-3 text-emerald-500" />}
                                            <span className={isRising ? 'text-amber-600' : 'text-emerald-600'}>
                                                {Math.abs(trend).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Bars */}
                                <div className="space-y-3">
                                    {/* Current */}
                                    <div className="relative">
                                        <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                                            <span>Current</span>
                                            <span>{item.current.toFixed(2)}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${getBarColor(item.currentMargin)}`}
                                                style={{ width: `${Math.min(currentPercent, 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Projected */}
                                    <div className="relative">
                                        <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                                            <span>Projected</span>
                                            <span className={item.projectedMargin < 0 ? 'text-red-600' : ''}>{item.projected.toFixed(2)}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${getBarColor(item.projectedMargin)} opacity-80 group-hover:opacity-100`}
                                                style={{ width: `${Math.min(projectedPercent, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
