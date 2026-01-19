import { useMemo, useState } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { RankStrategyMatrix } from './RankStrategyMatrix';
import { RscaScatterPlot } from './CommandDeck/RscaScatterPlot';
import { CycleCardGrid } from './CycleCardGrid';
import { Plus, ListOrdered } from 'lucide-react';

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

    // State for Hover Interaction (Bidirectional)
    const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);

    // Debug Log
    // useEffect(() => console.log('Stage Hovered:', hoveredGroupId), [hoveredGroupId]);

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

                {/* Zone 1: The Strategy Engine */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    {/* Header handled by RscaScatterPlot internally or we wrap? 
                        RscaScatterPlot has its own header. I will remove the wrapper header here to avoid duplication.
                        Actually, RscaScatterPlot has a "sidebar" layout. 
                        I will just render it full height.
                     */}
                    <div className="h-[320px]">
                        <RscaScatterPlot
                            fixedGroupKey={groupKey}
                            hideSidebar
                            hoveredGroupId={hoveredGroupId}
                            onPointHover={setHoveredGroupId}
                            onPointClick={handleCycleSelect}
                        />
                    </div>
                </div>

                {/* Zone 1.5: Rank Strategy Matrix */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 bg-fuchsia-50 text-fuchsia-700 rounded-md">
                            <ListOrdered className="w-4 h-4" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800">Rank Strategy Matrix</h3>
                    </div>
                    <RankStrategyMatrix
                        groupKey={groupKey}
                        hoveredGroupId={hoveredGroupId}
                        onGroupHover={setHoveredGroupId}
                        onGroupClick={handleCycleSelect}
                    />
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
                        hoveredCycleId={hoveredGroupId}
                        onCardHover={setHoveredGroupId}
                    />
                </div>
            </div>
        </div>
    );
}
