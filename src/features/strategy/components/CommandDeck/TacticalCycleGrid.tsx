import { useMemo } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';
import { motion } from 'framer-motion';
import { ArrowRight, FileText, Users, Calendar } from 'lucide-react';
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
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
                <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Active Missions</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {activeCycles.map((group, index) => {
                    // Progress Logic
                    const totalReports = group.reports.length;
                    // Using promotionRecommendation as a proxy for "Has content" / "Done" in this mock data context if status isn't reliable
                    // Or better, let's just use a mock progress based on reports with non-zero traits
                    const progressCount = group.reports.filter(r => r.traitAverage > 0).length;
                    const percent = totalReports > 0 ? (progressCount / totalReports) * 100 : 0;

                    const endDate = new Date(group.periodEndDate);
                    const isOverdue = endDate < new Date();

                    return (
                        <motion.button
                            key={group.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handleOpen(group)}
                            className="flex flex-col text-left bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-indigo-300 transition-all group relative overflow-hidden"
                        >
                            {/* Accent Line */}
                            <div className={twMerge("absolute top-0 left-0 right-0 h-1",
                                isOverdue ? "bg-red-500" : "bg-indigo-500"
                            )} />

                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">
                                        {group.competitiveGroupKey || group.name}
                                    </h4>
                                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                                        <Calendar className="w-3 h-3" />
                                        <span className={isOverdue ? "text-red-500 font-bold" : ""}>
                                            {endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                                <span className={twMerge("px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                    group.status === 'Review' ? "bg-amber-50 text-amber-600 border-amber-200" :
                                        "bg-slate-50 text-slate-500 border-slate-200"
                                )}>
                                    {group.status}
                                </span>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <div className="bg-slate-50 rounded-lg p-2">
                                    <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                                        <Users className="w-3 h-3" /> Members
                                    </div>
                                    <div className="text-lg font-bold text-slate-700">{totalReports}</div>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-2">
                                    <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                                        <FileText className="w-3 h-3" /> Drafted
                                    </div>
                                    <div className="text-lg font-bold text-slate-700">{progressCount}</div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-auto">
                                <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
                                    <span>Progress</span>
                                    <span>{Math.round(percent)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={twMerge("h-full rounded-full transition-all duration-500",
                                            isOverdue ? "bg-red-500" : "bg-indigo-500"
                                        )}
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                            </div>

                            {/* Hover Action */}
                            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                                <ArrowRight className="w-5 h-5 text-indigo-500" />
                            </div>
                        </motion.button>
                    );
                })}

                {/* "Create New" Placeholder Card */}
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col items-center justify-center text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 p-4 hover:bg-slate-100 hover:border-slate-400 transition-all text-slate-400 hover:text-slate-600 h-full min-h-[160px]"
                >
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-2 shadow-sm">
                        <ArrowRight className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold">Start New Cycle</span>
                </motion.button>

            </div>
        </div>
    );
}
