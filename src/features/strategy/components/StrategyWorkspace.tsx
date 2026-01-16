import { useNavfitStore } from '@/store/useNavfitStore';
import { CommandStrategyCenter } from './CommandStrategyCenter';
import { CompetitiveGroupPlanner } from './CompetitiveGroupPlanner';
import { ArrowLeft, Briefcase, ChevronRight, Users } from 'lucide-react';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';
import { useMemo } from 'react';

export function StrategyWorkspace() {
    const { strategyViewMode, setStrategyViewMode, selectCycle, selectedCycleId, activeCompetitiveGroup } = useNavfitStore();
    const summaryGroups = useSummaryGroups();

    // Derived state for breadcrumb
    const activeGroup = useMemo(() => {
        return summaryGroups.find(g => g.id === selectedCycleId);
    }, [summaryGroups, selectedCycleId]);

    const handleBackToPlanner = () => {
        setStrategyViewMode('landing');
        // Optional: clear selection?
        // selectCycle(null, null);
    };

    if (strategyViewMode === 'landing') {
        return <CompetitiveGroupPlanner />;
    }

    // Workspace Mode (CommandStrategyCenter)
    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Context Navigation Bar */}
            <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0 shadow-sm z-20">
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <button
                        onClick={handleBackToPlanner}
                        className="flex items-center hover:text-indigo-600 transition-colors font-medium"
                    >
                        <Users size={16} className="mr-1.5" />
                        Competitive Groups
                    </button>

                    {activeCompetitiveGroup && (
                        <>
                            <ChevronRight size={14} className="text-slate-400" />
                            <span className="font-medium text-slate-800">{activeCompetitiveGroup}</span>
                        </>
                    )}

                    {activeGroup && (
                        <>
                            <ChevronRight size={14} className="text-slate-400" />
                            <div className="flex items-center px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100 font-medium">
                                <Briefcase size={14} className="mr-1.5" />
                                {activeGroup.name || 'Summary Group'}
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center space-x-3">
                     <button
                        onClick={handleBackToPlanner}
                        className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
                    >
                        <ArrowLeft size={14} className="mr-1.5" />
                        Back to Planner
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative">
                <CommandStrategyCenter />
            </div>
        </div>
    );
}
