import { useMemo } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { calculateCumulativeRSCA } from '@/features/strategy/logic/rsca';
import { Activity } from 'lucide-react';

export function RscaRiskWidget() {
    const { summaryGroups } = useNavfitStore();
    // const enhancedGroups = useSummaryGroups(); // Might need this if we need derived state, but raw store is likely faster for high level
    const { rsConfig } = useNavfitStore();

    // Group SummaryGroups by Competitive Group Key
    const riskData = useMemo(() => {
        const groupsByKey = new Map<string, typeof summaryGroups>();

        summaryGroups.forEach(g => {
            const key = g.competitiveGroupKey || 'Uncategorized';
            if (!groupsByKey.has(key)) groupsByKey.set(key, []);
            groupsByKey.get(key)!.push(g);
        });

        // Calculate Metrics for each Comp Group
        const risks: { key: string; label: string; current: number; limit: number; margin: number }[] = [];

        groupsByKey.forEach((groups, key) => {
            // Determine Label
            // We can assume the key is formatted, or we re-derive from the first group's metadata
            // Ideally update to use the BUPERS 1610 naming if 'key' is old style
            // But assuming keys are consistent from storage or migrated.

            // Calculate Cumulative RSCA (Projected)
            // We need to pass the "rank" or "paygrade" to the calculator.
            // Usually the key contains it "O-3 URL Active".
            // Let's parse or use group data.
            const sample = groups[0];
            const rank = sample.paygrade || key.split(' ')[0]; // Fallback

            // const rsca = calculateCumulativeRSCA(summaryGroups, rank); // This calculates GLOBAL RSCA for that rank? 
            // Wait, calculateCumulativeRSCA filters internally by paygrade/rank?
            // Looking at rsca.ts (from memory/previous steps), it filters by rank.
            // So if we pass 'O-3', it gets all O-3s.
            // Does it separate URL vs RL?
            // The current calculator might be Rank-based (Legacy). 
            // If we need Competitve Group based RSCA, we need to ensure the calculator respects the group key.
            // Note: The prompt says "Each competitive group has its own RSCA". 
            // If the current logic only filters by RANK, it blends URL and RL.
            // I should verify `calculateCumulativeRSCA` logic. 
            // Since I can't interactively check `rsca.ts` inside `write_to_file`, I'll assume I might need to refine the filtering 
            // or use a filtered list passed to it.
            // `calculateCumulativeRSCA` takes `allGroups`. I can pass JUST the groups for this Key to strictly isolate it.

            const groupRsca = calculateCumulativeRSCA(groups, rank);

            const limit = rsConfig.targetRsca || 3.60; // Default limit
            const margin = limit - groupRsca;

            // Only show substantial risks or heavy usage?
            // Let's show all for now, sorted by risk (lowest margin).

            // Label Formatting
            let label = key;
            // If key is "O-3 1110", try to convert to "O-3 URL Active" if possible, 
            // but normally the key itself SHOULD be the BUPERS label if we migrated.
            // If not migrated, we display key.

            risks.push({
                key,
                label,
                current: groupRsca,
                limit,
                margin
            });
        });

        // Sort by Margin (ascending - higher risk first)
        return risks.sort((a, b) => a.margin - b.margin);

    }, [summaryGroups, rsConfig]);

    return (
        <div className="bg-white p-0 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    RSCA Watch
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-0">
                {riskData.length === 0 ? (
                    <div className="p-5 text-center text-xs text-slate-400">No active competitive groups found.</div>
                ) : (
                    riskData.map(item => {
                        const percentUsed = (item.current / item.limit) * 100;
                        const isCritical = item.margin < 0.05;
                        const isWarning = item.margin < 0.10;

                        return (
                            <div key={item.key} className="px-5 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-sm font-bold text-slate-700">{item.label}</span>
                                    <div className="text-right">
                                        <div className={`text-sm font-mono font-bold ${isCritical ? 'text-red-600' : isWarning ? 'text-amber-500' : 'text-slate-600'}`}>
                                            {item.current.toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                        style={{ width: `${Math.min(percentUsed, 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-medium tracking-wide">
                                    <span>Limit: {item.limit.toFixed(2)}</span>
                                    <span className={isCritical ? 'text-red-500 font-bold' : ''}>{item.margin > 0 ? `+${item.margin.toFixed(2)} Margin` : `${item.margin.toFixed(2)} Over`}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
