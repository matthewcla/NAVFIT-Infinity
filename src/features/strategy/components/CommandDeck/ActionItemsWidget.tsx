import { useMemo } from 'react';
// import { useNavfitStore } from '@/store/useNavfitStore'; // Not used if we switch to specific hook? Wait, let's see.
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';
import { AlertCircle } from 'lucide-react';

export function ActionItemsWidget() {
    const summaryGroups = useSummaryGroups();

    const actionItems = useMemo(() => {
        const items: { id: string; type: 'Unranked' | 'Adverse' | 'Overdue'; message: string; severity: 'high' | 'medium'; }[] = [];

        summaryGroups.forEach(group => {
            // Check for unranked members (no rank order or promotion recommendation)
            // Actually, unranked usually means promotionRecommendation is missing or NOB not handled?
            // "3 Unranked Members" usually refers to members in a summary group who haven't been assigned a recommendation yet.
            const unrankedCount = group.reports.filter(r => !r.promotionRecommendation).length;
            if (unrankedCount > 0) {
                items.push({
                    id: `unranked-${group.id}`,
                    type: 'Unranked',
                    message: `${unrankedCount} Unranked Members in ${group.paygrade || 'Unknown'} ${group.competitiveGroupKey || 'Group'}`,
                    severity: 'high'
                });
            }

            // Check for Adverse Reports (Draft Status)
            // const adverseCount = group.reports.filter(r => r.promotionRecommendation === 'NOB' && r.traitAverage < 2.0).length;
            // Or maybe looking for "Adverse" flag if we had one.
            // Let's stick to the prompt examples: "Adverse Report Draft detected"
            // We don't have an explicit adverse flag in Report type yet, so I'll skip logic-heavy detecion for now or check traits.
            // If any report has comments containing "Adverse", maybe?
            // For now, let's look for Overdue.
            const now = new Date();
            const endDate = new Date(group.periodEndDate);
            if (endDate < now && group.status !== 'Submitted' && group.status !== 'Final') {
                items.push({
                    id: `overdue-${group.id}`,
                    type: 'Overdue',
                    message: `Cycle Overdue: ${group.name}`,
                    severity: 'medium'
                });
            }
        });

        return items;
    }, [summaryGroups]);

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
            <div className="flex-1 overflow-y-auto p-0">
                {actionItems.map((item) => (
                    <div key={item.id} className="px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors flex items-start gap-3 group cursor-pointer">
                        <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${item.severity === 'high' ? 'bg-red-500' : 'bg-amber-400 animate-pulse'}`} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors truncate">
                                {item.message}
                            </p>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide mt-0.5">
                                {item.type}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
