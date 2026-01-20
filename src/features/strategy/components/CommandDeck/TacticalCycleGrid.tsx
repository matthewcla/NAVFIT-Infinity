import { useMemo } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar } from 'lucide-react';
import { isActiveCycle } from '@/features/strategy/logic/cycleStatus';
import { twMerge } from 'tailwind-merge';

export function TacticalCycleGrid() {
    const summaryGroups = useSummaryGroups();
    const { selectCycle, setStrategyViewMode, setActiveTab } = useNavfitStore();

    const activeCycles = useMemo(() => {
        return summaryGroups
            .filter(isActiveCycle)
            .sort((a, b) => new Date(a.periodEndDate).getTime() - new Date(b.periodEndDate).getTime());
    }, [summaryGroups]);

    const handleOpen = (group: typeof summaryGroups[0]) => {
        selectCycle(group.id, group.competitiveGroupKey);
        setStrategyViewMode('workspace');
        setActiveTab('competitive_groups');
    };

    if (activeCycles.length === 0) return null;

    return (
        <div className="flex flex-col h-[220px] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Sticky Header */}
            <div className="flex-none px-4 py-2 bg-slate-50/90 backdrop-blur-sm border-b border-slate-100 flex items-center gap-2 z-10">
                <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Active Groups</h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
                    {activeCycles.length}
                </span>
            </div>

            {/* Scrollable Grid Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {activeCycles.map((group, index) => {
                        // Progress Logic
                        const totalReports = group.reports.length;
                        const progressCount = group.reports.filter(r => r.traitAverage > 0).length;
                        const percent = totalReports > 0 ? (progressCount / totalReports) * 100 : 0;

                        const endDate = new Date(group.periodEndDate);
                        const isOverdue = endDate < new Date();

                        return (
                            <motion.button
                                key={group.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => handleOpen(group)}
                                className="flex flex-col text-left bg-white rounded-xl border border-slate-200 p-3 hover:shadow-md hover:border-indigo-300 transition-all group relative overflow-hidden"
                            >
                                {/* Accent Line */}
                                <div className={twMerge("absolute top-0 left-0 right-0 h-1",
                                    isOverdue ? "bg-red-500" : "bg-indigo-500"
                                )} />

                                <div className="flex justify-between items-start mb-2">
                                    <div className="min-w-0 flex-1 mr-2">
                                        <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors truncate">
                                            {group.competitiveGroupKey || group.name}
                                        </h4>
                                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                            <Calendar className="w-3 h-3" />
                                            <span className={isOverdue ? "text-red-500 font-bold" : ""}>
                                                {endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={twMerge("shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                        group.status === 'Review' ? "bg-amber-50 text-amber-600 border-amber-200" :
                                            "bg-slate-50 text-slate-500 border-slate-200"
                                    )}>
                                        {group.status}
                                    </span>
                                </div>

                                {/* Stats - Compact */}
                                <div className="flex gap-4 mb-3">
                                    <div className="text-[10px] text-slate-500">
                                        <span className="font-bold text-slate-700 block">{totalReports}</span>
                                        Members
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                        <span className="font-bold text-slate-700 block">{progressCount}</span>
                                        Drafted
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-auto">
                                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={twMerge("h-full rounded-full transition-all duration-500",
                                                isOverdue ? "bg-red-500" : "bg-indigo-500"
                                            )}
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })}

                    {/* "Create New" Placeholder Card */}
                    <motion.button
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="flex flex-col items-center justify-center text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 p-3 hover:bg-slate-100 hover:border-slate-400 transition-all text-slate-400 hover:text-slate-600 min-h-[100px]"
                    >
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-1 shadow-sm">
                            <ArrowRight className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold">Start New Cycle</span>
                    </motion.button>

                </div>
            </div>
        </div>
    );
}
