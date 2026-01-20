import { useMemo, useState } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';
import { AlertCircle, Calendar, ChevronRight, Gauge, Layers, TrendingUp, CheckCircle2 } from 'lucide-react';
import { checkQuota, createSummaryGroupContext } from '@/features/strategy/logic/validation';
import { motion, AnimatePresence } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

export function CommandFeed() {
    const summaryGroups = useSummaryGroups();
    const { selectCycle, setStrategyViewMode, setActiveTab } = useNavfitStore();
    const [filter, setFilter] = useState<'all' | 'critical' | 'deadlines'>('all');

    const feedItems = useMemo(() => {
        const items: {
            id: string;
            targetId: string;
            compKey: string;
            type: 'Unranked' | 'Adverse' | 'Overdue' | 'Quota' | 'AirGap' | 'Deadline';
            message: string;
            subtext?: string;
            severity: 'high' | 'medium' | 'low';
            date?: Date;
        }[] = [];

        summaryGroups.forEach(group => {
            const groupName = group.competitiveGroupKey || group.name;
            const endDate = new Date(group.periodEndDate);

            // --- ACTION ITEMS LOGIC ---

            // 1. Unranked Members
            const unrankedCount = group.reports.filter(r => !r.promotionRecommendation).length;
            if (unrankedCount > 0) {
                items.push({
                    id: `unranked-${group.id}`,
                    targetId: group.id,
                    compKey: group.competitiveGroupKey,
                    type: 'Unranked',
                    message: `${unrankedCount} Unranked Members`,
                    subtext: groupName,
                    severity: 'high',
                    date: endDate
                });
            }

            // 2. Overdue Cycles
            const now = new Date();
            if (endDate < now && !['Submitted', 'Final'].includes(group.status || '')) {
                items.push({
                    id: `overdue-${group.id}`,
                    targetId: group.id,
                    compKey: group.competitiveGroupKey,
                    type: 'Overdue',
                    message: `Cycle Overdue`,
                    subtext: `${groupName} • Due ${endDate.toLocaleDateString()}`,
                    severity: 'medium',
                    date: endDate
                });
            }

            // 3. Quota Utilization
            if (['Draft', 'Planning', 'Review', 'Drafting'].includes(group.status || '')) {
                const epCount = group.reports.filter(r => r.promotionRecommendation === 'EP').length;
                const mpCount = group.reports.filter(r => r.promotionRecommendation === 'MP').length;
                const context = createSummaryGroupContext(group);
                const { epLimit, combinedLimit } = checkQuota(context, 0, 0);

                if (epCount > epLimit) {
                    items.push({
                        id: `quota-over-${group.id}`,
                        targetId: group.id,
                        compKey: group.competitiveGroupKey,
                        type: 'Quota',
                        message: `Over EP Limit (${epCount}/${epLimit})`,
                        subtext: groupName,
                        severity: 'high',
                        date: endDate
                    });
                } else if ((epCount + mpCount) > combinedLimit) {
                    items.push({
                        id: `quota-over-combined-${group.id}`,
                        targetId: group.id,
                        compKey: group.competitiveGroupKey,
                        type: 'Quota',
                        message: `Over Combined Limit`,
                        subtext: groupName,
                        severity: 'high',
                        date: endDate
                    });
                }

                // 4. Air Gap
                const reports = [...group.reports].sort((a, b) => b.traitAverage - a.traitAverage);
                if (reports.length > 0) {
                    const topReport = reports[0];
                    if (topReport.promotionRecommendation === 'EP' && topReport.traitAverage < 4.80) {
                        items.push({
                            id: `airgap-${group.id}`,
                            targetId: group.id,
                            compKey: group.competitiveGroupKey,
                            type: 'AirGap',
                            message: `Air Gap Detected`,
                            subtext: `#1 EP is only ${topReport.traitAverage.toFixed(2)}`,
                            severity: 'low',
                            date: endDate
                        });
                    }
                }
            }

            // --- DEADLINES LOGIC ---
            // Only future deadlines for active cycles
            if (endDate >= now && ['Drafting', 'Planning', 'Review', 'Draft'].includes(group.status || 'Drafting')) {
                const daysUntil = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                items.push({
                    id: `deadline-${group.id}`,
                    targetId: group.id,
                    compKey: group.competitiveGroupKey,
                    type: 'Deadline',
                    message: `${daysUntil} Days Remaining`,
                    subtext: `${groupName} closes ${endDate.toLocaleDateString()}`,
                    severity: daysUntil < 7 ? 'medium' : 'low',
                    date: endDate
                });
            }
        });

        // Sort: High Severity first, then by Date
        const strength = { high: 3, medium: 2, low: 1 };
        return items.sort((a, b) => {
            const diffScore = strength[b.severity] - strength[a.severity];
            if (diffScore !== 0) return diffScore;
            return (a.date?.getTime() || 0) - (b.date?.getTime() || 0);
        });

    }, [summaryGroups]);

    const filteredItems = useMemo(() => {
        if (filter === 'critical') return feedItems.filter(i => i.severity === 'high');
        if (filter === 'deadlines') return feedItems.filter(i => i.type === 'Deadline');
        return feedItems;
    }, [feedItems, filter]);

    const handleAction = (item: typeof feedItems[0]) => {
        selectCycle(item.targetId, item.compKey);
        setStrategyViewMode('workspace');
        setActiveTab('competitive_groups');
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-700">Command Feed</h3>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => setFilter('all')}
                        className={twMerge("px-2 py-1 text-[10px] font-medium rounded-md transition-colors", filter === 'all' ? "bg-slate-200 text-slate-700" : "text-slate-400 hover:bg-slate-100")}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('critical')}
                        className={twMerge("px-2 py-1 text-[10px] font-medium rounded-md transition-colors", filter === 'critical' ? "bg-red-100 text-red-700" : "text-slate-400 hover:bg-slate-100")}
                    >
                        Critical
                    </button>
                    <button
                        onClick={() => setFilter('deadlines')}
                        className={twMerge("px-2 py-1 text-[10px] font-medium rounded-md transition-colors", filter === 'deadlines' ? "bg-indigo-100 text-indigo-700" : "text-slate-400 hover:bg-slate-100")}
                    >
                        Deadlines
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                <AnimatePresence initial={false}>
                    {filteredItems.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-10 text-center"
                        >
                            <CheckCircle2 className="w-8 h-8 text-emerald-100 mb-2" />
                            <p className="text-xs text-slate-400">All systems nominal.</p>
                        </motion.div>
                    ) : (
                        filteredItems.map((item) => (
                            <motion.button
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                onClick={() => handleAction(item)}
                                className={twMerge(
                                    "w-full text-left p-3 rounded-lg border flex items-start gap-3 transition-all hover:shadow-md group relative overflow-hidden",
                                    item.severity === 'high' ? "bg-red-50/50 border-red-100/50 hover:border-red-200" :
                                        item.type === 'Deadline' ? "bg-white border-slate-100 hover:border-indigo-200" :
                                            "bg-white border-slate-100 hover:border-slate-300"
                                )}
                            >
                                {/* Left Stripe for High Sev */}
                                {item.severity === 'high' && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-400" />
                                )}

                                {/* Icon */}
                                <div className={twMerge("mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                    item.severity === 'high' ? "bg-red-100 text-red-600" :
                                        item.type === 'Deadline' ? "bg-indigo-50 text-indigo-500" :
                                            "bg-slate-100 text-slate-500"
                                )}>
                                    {item.type === 'Deadline' ? <Calendar className="w-4 h-4" /> :
                                        item.type === 'Quota' ? <Gauge className="w-4 h-4" /> :
                                            item.type === 'AirGap' ? <TrendingUp className="w-4 h-4" /> :
                                                <AlertCircle className="w-4 h-4" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h4 className={twMerge("text-sm font-semibold truncate",
                                        item.severity === 'high' ? "text-slate-800" : "text-slate-700"
                                    )}>
                                        {item.message}
                                    </h4>
                                    <p className="text-xs text-slate-500 truncate mt-0.5">
                                        {item.subtext}
                                    </p>
                                </div>

                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors mt-2" />
                            </motion.button>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
