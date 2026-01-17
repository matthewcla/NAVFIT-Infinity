
import { useNavfitStore } from '@/store/useNavfitStore';
import { CommandStrategyCenter } from './CommandStrategyCenter';
import { CompetitiveGroupPlanner } from './CompetitiveGroupPlanner';
import { StrategyDashboard } from './StrategyDashboard';
import { ArrowLeft, Briefcase, ChevronRight, Home, Users } from 'lucide-react';
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

    // Smart Default Logic (Redirect to Dashboard if no explicit state)
    // We remove the auto-redirect logic that forced 'planner' or 'cycles'.
    // Instead, 'landing' is now the Dashboard.

    // Derived state for breadcrumb
    const activeGroup = useMemo(() => {
        return summaryGroups.find(g => g.id === selectedCycleId);
    }, [summaryGroups, selectedCycleId]);

    const handleBackToDashboard = () => {
        setStrategyViewMode('landing');
        selectCycle(null, null); // Clear drill down
    };

    // 1. Dashboard (Landing)
    if (strategyViewMode === 'landing') {
        return <StrategyDashboard />;
    }

    // 2. Competitive Group Planner (Master Plan)
    if (strategyViewMode === 'planner') {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                {/* Header with Back Button */}
                <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0 shadow-sm z-20">
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                        <button
                            onClick={handleBackToDashboard}
                            className="flex items-center hover:text-indigo-600 transition-colors font-medium"
                        >
                            <Home size={16} className="mr-1.5" />
                            Dashboard
                        </button>
                        <ChevronRight size={14} className="text-slate-400" />
                        <span className="font-medium text-slate-800">Competitive Group Planner</span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden relative">
                    <CompetitiveGroupPlanner />
                </div>
            </div>
        );
    }

    // 3. Command Strategy Center (Cycles / Drill Down)
    // Modes: 'cycles' (List View) or 'workspace' (Detail View - though CommandStrategyCenter handles both currently)
    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header / Navigation */}
            <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0 shadow-sm z-20">
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                     <button
                        onClick={handleBackToDashboard}
                        className="flex items-center hover:text-indigo-600 transition-colors font-medium"
                    >
                        <Home size={16} className="mr-1.5" />
                        Dashboard
                    </button>

                    {(strategyViewMode === 'cycles' || activeGroup) && (
                        <>
                            <ChevronRight size={14} className="text-slate-400" />
                            <span className="font-medium text-slate-800">Summary Groups</span>
                        </>
                    )}

                    {/* Breadcrumbs (Only when drilled down) */}
                    {activeGroup && (
                        <>
                            <ChevronRight size={14} className="text-slate-400" />
                            <div className="flex items-center px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100 font-medium">
                                <Briefcase size={14} className="mr-1.5" />
                                {activeGroup.name}
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center space-x-3">
                    {/* Back to List (if drilled down) */}
                    {selectedCycleId && (
                        <button
                            onClick={() => {
                                selectCycle(null, null);
                                // Ensure we stay in cycles mode but clear selection
                                setStrategyViewMode('cycles');
                            }}
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
