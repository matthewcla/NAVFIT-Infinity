
import { useNavfitStore } from '@/store/useNavfitStore';
import { CommandStrategyCenter } from './CommandStrategyCenter';
import { CompetitiveGroupPlanner } from './CompetitiveGroupPlanner';
import { ArrowLeft, Briefcase, ChevronRight, Users, Layout, Map } from 'lucide-react';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';
import { useMemo, useEffect } from 'react';

export function StrategyWorkspace() {
    const {
        strategyViewMode,
        setStrategyViewMode,
        selectCycle,
        selectedCycleId,
        activeCompetitiveGroup,
        competitiveGroupRankings
    } = useNavfitStore();

    const summaryGroups = useSummaryGroups();

    // Smart Default Logic
    useEffect(() => {
        // If we are mounting and no specific mode is set (or just default 'landing'),
        // check if we have rankings.
        // If rankings are empty, force 'master-plan' (Planner).
        // Otherwise, default to 'cycles' (Center).

        // Note: strategyViewMode default in store is 'landing'.
        // We redefine meanings: 'landing' -> 'cycles' (default view), 'planner' -> 'master-plan'.
        // Actually, let's stick to explicit names.

        const hasRankings = Object.keys(competitiveGroupRankings).length > 0;

        // Initial Check (if currently in default state)
        if (strategyViewMode === 'landing') {
             if (!hasRankings) {
                 setStrategyViewMode('planner');
             } else {
                 setStrategyViewMode('cycles');
             }
        }
    }, [competitiveGroupRankings, strategyViewMode, setStrategyViewMode]);

    // Derived state for breadcrumb
    const activeGroup = useMemo(() => {
        return summaryGroups.find(g => g.id === selectedCycleId);
    }, [summaryGroups, selectedCycleId]);

    const handleSwitchMode = (mode: 'cycles' | 'planner') => {
        setStrategyViewMode(mode);
        // Clear selection when switching top-level contexts?
        // Maybe keep it if drilling down, but switching *Modes* suggests a context shift.
        // User might want to go to Planner to check the master list for the *current* group.
        // Let's keep selection if it exists, Planner handles 'selectedGroupKey' internally (we might want to sync it).
    };

    const handleBackToCycles = () => {
        setStrategyViewMode('cycles');
        selectCycle(null, null); // Clear drill down when going "Back" to list
    };

    // 1. Competitive Group Planner (Master Plan)
    if (strategyViewMode === 'planner') {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                {/* Header / Tabs */}
                <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0 shadow-sm z-20">
                    <div className="flex items-center space-x-4">
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => handleSwitchMode('cycles')}
                                className={`flex items-center px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                    strategyViewMode === 'cycles'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Layout size={14} className="mr-1.5" />
                                Summary Groups
                            </button>
                            <button
                                onClick={() => handleSwitchMode('planner')}
                                className={`flex items-center px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                    strategyViewMode === 'planner'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Map size={14} className="mr-1.5" />
                                Competitive Group Plan
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden relative">
                    <CompetitiveGroupPlanner />
                </div>
            </div>
        );
    }

    // 2. Command Strategy Center (Cycles / Drill Down)
    // Mode is 'cycles' (or 'workspace' if drilled down - we can consolidate)
    // Let's treat 'cycles' as the list view and 'workspace' as the drilldown?
    // Current `CommandStrategyCenter` handles list + drilldown internally via `selectedCycleId`.
    // So if mode is 'cycles', we render CommandStrategyCenter.
    // If 'workspace' was set by drilldown, we render CommandStrategyCenter too (it handles the view state).

    // We update NavfitStore type to accept 'planner' | 'cycles' | 'workspace'

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header / Tabs */}
            <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0 shadow-sm z-20">
                <div className="flex items-center space-x-4">
                     {/* Tab Switcher - Always visible to allow jumping contexts */}
                     <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => handleSwitchMode('cycles')}
                            className={`flex items-center px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                ['cycles', 'workspace'].includes(strategyViewMode)
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Layout size={14} className="mr-1.5" />
                            Summary Groups
                        </button>
                        <button
                            onClick={() => handleSwitchMode('planner')}
                            className={`flex items-center px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                strategyViewMode === 'planner'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Map size={14} className="mr-1.5" />
                            Competitive Group Plan
                        </button>
                    </div>

                    {/* Breadcrumbs (Only when drilled down) */}
                    {activeGroup && (
                        <div className="flex items-center space-x-2 text-sm text-slate-600 pl-4 border-l border-slate-200">
                            <span className="font-medium text-slate-800">{activeGroup.competitiveGroupKey}</span>
                            <ChevronRight size={14} className="text-slate-400" />
                            <div className="flex items-center px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100 font-medium">
                                <Briefcase size={14} className="mr-1.5" />
                                {activeGroup.name}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-3">
                    {/* Back Button (Only when drilled down) */}
                    {selectedCycleId && (
                        <button
                            onClick={handleBackToCycles}
                            className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
                        >
                            <ArrowLeft size={14} className="mr-1.5" />
                            Back to List
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative">
                <CommandStrategyCenter />
            </div>
        </div>
    );
}
