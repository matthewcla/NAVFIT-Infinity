import { useMemo } from 'react';
import { RscaHeadsUpDisplay } from './RscaHeadsUpDisplay';
import { ActiveCyclesList } from './ActiveCyclesList';
import { CycleContextPanel } from './CycleContextPanel';

import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';

interface CommandStrategyCenterProps {
    onNavigateToRanking: (groupId: string) => void;
}

export function CommandStrategyCenter({ onNavigateToRanking }: CommandStrategyCenterProps) {
    const {
        rsConfig,
        selectCycle,
        selectedCycleId,

    } = useNavfitStore();

    const summaryGroups = useSummaryGroups();

    // Retrieve the full selected group object using the selector or store helper
    // Since we don't have the selector hook-ified cleanly in the store export, we can replicate or just find it.
    // selectActiveCycle requires the store state, easier to just find it here efficiently.
    const selectedGroup = useMemo(() => {
        return summaryGroups.find(g => g.id === selectedCycleId) || null;
    }, [summaryGroups, selectedCycleId]);


    // 1. Current RSCA
    const currentRsca = rsConfig.targetRsca || 4.00; // Default to 4.00 if not set

    // 2. Projected RSCA Calculation
    const totalReportsHistory = rsConfig.totalReports || 100;

    // Calculate Global Projected RSCA
    const { projectedRsca } = useMemo(() => {
        let totalScore = currentRsca * totalReportsHistory;
        let totalCount = totalReportsHistory;

        summaryGroups.forEach(group => {
            group.reports.forEach(r => {
                if (r.traitAverage) {
                    totalScore += r.traitAverage;
                    totalCount += 1;
                }
            });
        });

        return {
            projectedRsca: totalCount > 0 ? totalScore / totalCount : currentRsca
        };
    }, [currentRsca, totalReportsHistory, summaryGroups]);


    // 3. Filter & Group Logic
    const { officerGroups, enlistedGroups } = useMemo(() => {
        const today = new Date();
        const ninetyDaysFromNow = new Date();
        ninetyDaysFromNow.setDate(today.getDate() + 90);

        // Filter: Overdue or Due within 90 days (active cycles)
        const relevantGroups = summaryGroups.filter(() => {
            // Include all for now to ensure visibility during dev, or strictly apply date filter
            // const d = new Date(g.periodEndDate);
            // return d <= ninetyDaysFromNow; 
            return true;
        });

        // Sort by periodEndDate asc
        relevantGroups.sort((a, b) => new Date(a.periodEndDate).getTime() - new Date(b.periodEndDate).getTime());

        const officer: typeof summaryGroups = [];
        const enlisted: typeof summaryGroups = [];

        relevantGroups.forEach(g => {
            // Determine type
            // Officer: O-1 to O-10, W-1 to W-5
            // Enlisted: E-1 to E-9
            const isEnlisted = g.paygrade?.startsWith('E');
            if (isEnlisted) {
                enlisted.push(g);
            } else {
                officer.push(g);
            }
        });

        return { officerGroups: officer, enlistedGroups: enlisted };
    }, [summaryGroups]);

    // Handle Selection from List
    const handleGroupSelect = (group: typeof summaryGroups[0]) => {
        // Use the store action
        selectCycle(group.id, group.competitiveGroupKey || 'Unknown');
    };

    const handleOpenWorkspace = () => {
        if (selectedCycleId) {
            onNavigateToRanking(selectedCycleId);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* 1. Sticky HUD */}
            <RscaHeadsUpDisplay
                currentRsca={currentRsca}
                projectedRsca={projectedRsca}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">

                {/* Center Column: Active Cycles */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    <div className="max-w-6xl mx-auto space-y-8">

                        {/* Summary / Welcome Block */}
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">Command Strategy Center</h1>
                                <p className="text-slate-500 mt-1">Manage evaluation cycles, monitor RSCA health, and identify strategic opportunities.</p>
                            </div>
                        </div>

                        {/* Active Cycles List */}
                        <ActiveCyclesList
                            officerGroups={officerGroups}
                            enlistedGroups={enlistedGroups}
                            onSelect={handleGroupSelect}
                            selectedGroupId={selectedCycleId}
                        />

                    </div>
                </div>

                {/* Right Sidebar: Context Panel */}
                <div className={`w-80 xl:w-96 bg-white border-l border-slate-200 overflow-hidden transition-all duration-300 ${selectedGroup ? 'translate-x-0' : 'translate-x-full hidden xl:block xl:translate-x-0 opacity-50'}`}>
                    <CycleContextPanel
                        group={selectedGroup}
                        onOpenWorkspace={handleOpenWorkspace}
                    />
                </div>
            </div>
        </div>
    );
}
