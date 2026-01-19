import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';
import { Calendar, ChevronRight } from 'lucide-react';

export function ActiveDeadlinesWidget() {
    const { selectCycle, setStrategyViewMode } = useNavfitStore();
    const summaryGroups = useSummaryGroups(); // Uses rich data

    // Filter Active Only
    const activeCycles = summaryGroups
        .filter(g => {
            const status = g.status || 'Drafting';
            return ['Drafting', 'Planning', 'Review', 'Draft'].includes(status);
        })
        .sort((a, b) => new Date(a.periodEndDate).getTime() - new Date(b.periodEndDate).getTime());


    const handleOpen = (group: typeof summaryGroups[0]) => {
        // Direct jump to workspace
        selectCycle(group.id, group.competitiveGroupKey || 'Unknown');
        setStrategyViewMode('workspace');
    };

    return (
        <div className="bg-white p-0 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    Active Deadlines
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
                {activeCycles.length === 0 ? (
                    <div className="p-5 text-center text-xs text-slate-400">No active cycles. Good job, Skipper.</div>
                ) : (
                    activeCycles.map(group => {
                        const date = new Date(group.periodEndDate);
                        const isOverdue = date < new Date();

                        return (
                            <button
                                key={group.id}
                                onClick={() => handleOpen(group)}
                                className="w-full text-left px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-indigo-50/50 transition-colors group flex items-center justify-between"
                            >
                                <div>
                                    <div className="text-sm font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">
                                        {group.name}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        {group.competitiveGroupKey} • <span className={isOverdue ? 'text-red-500 font-bold' : ''}>
                                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}

