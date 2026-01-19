import { useMemo } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';
import { AlertCircle, Gauge, TrendingUp } from 'lucide-react';
import { checkQuota, createSummaryGroupContext } from '@/features/strategy/logic/validation';

export function ActionItemsWidget() {
    const summaryGroups = useSummaryGroups();
    const { selectCycle, setStrategyViewMode, setActiveTab } = useNavfitStore();

    const actionItems = useMemo(() => {
        const items: {
            id: string;
            targetId: string;
            compKey: string;
            type: 'Unranked' | 'Adverse' | 'Overdue' | 'Quota' | 'AirGap';
            message: string;
            severity: 'high' | 'medium' | 'low';
        }[] = [];

        summaryGroups.forEach(group => {
            const groupName = group.competitiveGroupKey || group.name;

            // 1. Unranked Members
            const unrankedCount = group.reports.filter(r => !r.promotionRecommendation).length;
            if (unrankedCount > 0) {
                items.push({
                    id: `unranked-${group.id}`,
                    targetId: group.id,
                    compKey: group.competitiveGroupKey,
                    type: 'Unranked',
                    message: `${unrankedCount} Unranked Members in ${groupName}`,
                    severity: 'high'
                });
            }

            // 2. Overdue Cycles
            const now = new Date();
            const endDate = new Date(group.periodEndDate);
            if (endDate < now && !['Submitted', 'Final'].includes(group.status || '')) {
                items.push({
                    id: `overdue-${group.id}`,
                    targetId: group.id,
                    compKey: group.competitiveGroupKey,
                    type: 'Overdue',
                    message: `Cycle Overdue: ${group.name}`,
                    severity: 'medium'
                });
            }

            // 3. Quota Utilization (Opportunities)
            // Only relevant for active drafting
            if (['Draft', 'Planning', 'Review', 'Drafting'].includes(group.status || '')) {
                const epCount = group.reports.filter(r => r.promotionRecommendation === 'EP').length;
                const mpCount = group.reports.filter(r => r.promotionRecommendation === 'MP').length;

                const context = createSummaryGroupContext(group);
                const { epLimit, combinedLimit } = checkQuota(context, 0, 0); // Get limits (pass 0 used to just get limits returned)

                // Check Over-Limit (High Severity)
                if (epCount > epLimit) {
                    items.push({
                        id: `quota-over-ep-${group.id}`,
                        targetId: group.id,
                        compKey: group.competitiveGroupKey,
                        type: 'Quota',
                        message: `Over EP Limit: ${epCount}/${epLimit} assigned in ${groupName}`,
                        severity: 'high'
                    });
                } else if ((epCount + mpCount) > combinedLimit) {
                    items.push({
                        id: `quota-over-combined-${group.id}`,
                        targetId: group.id,
                        compKey: group.competitiveGroupKey,
                        type: 'Quota',
                        message: `Over Combined Limit: ${(epCount + mpCount)}/${combinedLimit} assigned`,
                        severity: 'high'
                    });
                }
                // Check Under-Limit (Opportunity / Low Severity)
                else {
                    const epUnused = epLimit - epCount;
                    if (epUnused > 0 && group.reports.length >= 3) { // Only suggest if group is sizeable
                        items.push({
                            id: `quota-unused-ep-${group.id}`,
                            targetId: group.id,
                            compKey: group.competitiveGroupKey,
                            type: 'Quota',
                            message: `${epUnused} EP Quota${epUnused > 1 ? 's' : ''} Available in ${groupName}`,
                            severity: 'medium' // Opportunity is medium importance
                        });
                    }
                }

                // 4. Air Gap Detection
                // Find top report
                const reports = [...group.reports].sort((a, b) => b.traitAverage - a.traitAverage);
                if (reports.length > 0) {
                    const topReport = reports[0];
                    if (topReport.promotionRecommendation === 'EP' && topReport.traitAverage < 4.80) {
                        // Significant Air Gap (Leaving room below 5.0)
                        // Custom threshold 4.80 implies "You really should be pushing 5.0 for #1 EP"
                        items.push({
                            id: `airgap-${group.id}`,
                            targetId: group.id,
                            compKey: group.competitiveGroupKey,
                            type: 'AirGap',
                            message: `Large Air Gap: #1 EP is only ${topReport.traitAverage.toFixed(2)}`,
                            severity: 'low'
                        });
                    }
                }
            }
        });

        // Sort by severity
        const strength = { high: 3, medium: 2, low: 1 };
        return items.sort((a, b) => strength[b.severity] - strength[a.severity]);
    }, [summaryGroups]);

    const handleAction = (item: typeof actionItems[0]) => {
        selectCycle(item.targetId, item.compKey);
        setStrategyViewMode('workspace');
        setActiveTab('competitive_groups');
    };

    if (actionItems.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[160px]">
                <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                    <AlertCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <h3 className="text-sm font-semibold text-slate-700">All Clear</h3>
                <p className="text-xs text-slate-400 mt-1">No critical action items detected.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-0 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    Action Items
                </h3>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{actionItems.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {actionItems.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => handleAction(item)}
                        className="px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors flex items-start gap-3 group cursor-pointer"
                    >
                        <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${item.severity === 'high' ? 'bg-red-500 animate-pulse' :
                            item.severity === 'medium' ? 'bg-amber-400' : 'bg-blue-400'
                            }`} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors truncate">
                                {item.message}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">
                                    {item.type}
                                </span>
                                {item.type === 'Quota' && <Gauge className="w-3 h-3 text-slate-300" />}
                                {item.type === 'AirGap' && <TrendingUp className="w-3 h-3 text-slate-300" />}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
