import { useMemo, useState } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { MtaTrendChart } from './MtaTrendChart';
import { CycleCardGrid } from './CycleCardGrid';
import { Layers, Plus } from 'lucide-react';

interface CompetitiveGroupStageProps {
    groupKey: string;
    onSelectCycle: (cycleId: string) => void;
}

export function CompetitiveGroupStage({ groupKey, onSelectCycle }: CompetitiveGroupStageProps) {
    const { summaryGroups } = useNavfitStore();
    const [cycleFilter, setCycleFilter] = useState<'All' | 'Active' | 'Planned' | 'Archive'>('Active');

    // 1. Data Prep based on Group Key
    const groupData = useMemo(() => {
        const relevant = summaryGroups.filter(g => (g.competitiveGroupKey || 'Uncategorized') === groupKey);

        // Sort by date descending (Newest first)
        return relevant.sort((a, b) => new Date(b.periodEndDate).getTime() - new Date(a.periodEndDate).getTime());
    }, [summaryGroups, groupKey]);

    // 2. Trend Data (Chronological)
    const trendData = useMemo(() => {
        // Trend chart needs oldest to newest
        return [...groupData].reverse();
    }, [groupData]);

    // 3. Filtered Cycles for Grid
    const filteredCycles = useMemo(() => {
        return groupData.filter(g => {
            const status = g.status || 'Draft';
            const isActive = ['Drafting', 'Review', 'Submitted', 'Pending', 'Draft'].includes(status);
            const isArchive = ['Final', 'Complete', 'Accepted', 'Rejected'].includes(status);
            const isPlanned = status === 'Planned';

            if (cycleFilter === 'Active') return isActive;
            if (cycleFilter === 'Planned') return isPlanned;
            if (cycleFilter === 'Archive') return isArchive;
            return true;
        });
    }, [groupData, cycleFilter]);

    const handleCycleSelect = (cycleId: string) => {
        onSelectCycle(cycleId);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
            {/* Header / Toolbar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{groupKey}</h1>
                    <p className="text-sm text-slate-500 font-medium">Competitive Group Strategy</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 transition-all">
                        <Plus className="w-4 h-4" />
                        <span>New Cycle</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Zone 1: The Horizon (Trend) */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-md">
                            <Layers className="w-4 h-4" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800">Performance Horizon</h3>
                    </div>
                    <div className="h-[280px]">
                        <MtaTrendChart groups={trendData} />
                    </div>
                </div>

                {/* Zone 2: The Action (Cycle Grid) */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-slate-800">Cycles</h3>

                        {/* Filter Tabs */}
                        <div className="flex p-1 bg-slate-200/50 rounded-lg">
                            {(['Active', 'Planned', 'Archive', 'All'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setCycleFilter(f)}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${cycleFilter === f
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    <CycleCardGrid
                        cycles={filteredCycles}
                        onSelect={handleCycleSelect}
                    />
                </div>
            </div>
        </div>
    );
}
