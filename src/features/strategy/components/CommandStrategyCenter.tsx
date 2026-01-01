import { useMemo } from 'react';

import { CycleContextPanel } from './CycleContextPanel';
import { StrategyGroupCard } from './StrategyGroupCard';


import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';
import { Filter, ArrowUpDown } from 'lucide-react';

export function CommandStrategyCenter() {
    const {

        selectCycle,
        selectedCycleId,
        cycleFilter,
        cycleSort,
        setCycleFilter,
        setCycleSort,
        cycleListPhase,
        setCycleListPhase,
    } = useNavfitStore();

    const summaryGroups = useSummaryGroups();

    // Retrieve the full selected group object
    const selectedGroup = useMemo(() => {
        return summaryGroups.find(g => g.id === selectedCycleId) || null;
    }, [summaryGroups, selectedCycleId]);





    // 2. Filter & Sort Logic for Left Panel
    const groupedCycles = useMemo(() => {
        // A. Filter by Phase (Active, Archive, Projected)
        const phaseFiltered = summaryGroups.filter(g => {
            const status = g.status || 'Drafting'; // Default to Drafting if missing

            const activeStatuses = ['Drafting', 'Planning', 'Review', 'Submitted', 'Pending', 'Draft'];
            const archiveStatuses = ['Final', 'Complete', 'Accepted', 'Rejected'];
            const projectedStatuses = ['Projected', 'Planned'];

            if (cycleListPhase === 'Archive') return archiveStatuses.includes(status);
            if (cycleListPhase === 'Projected') return projectedStatuses.includes(status);
            return activeStatuses.includes(status);
        });

        // B. Filter by Type (Officer/Enlisted)
        const typeFiltered = phaseFiltered.filter(g => {
            if (cycleFilter === 'All') return true;
            const isEnlisted = g.paygrade?.startsWith('E');
            if (cycleFilter === 'Officer') return !isEnlisted;
            if (cycleFilter === 'Enlisted') return isEnlisted;
            return true;
        });

        // C. Sort
        typeFiltered.sort((a, b) => {
            if (cycleSort === 'DueDate') {
                return new Date(a.periodEndDate).getTime() - new Date(b.periodEndDate).getTime();
            }
            if (cycleSort === 'Status') {
                return (a.status || '').localeCompare(b.status || '');
            }
            return 0;
        });

        // D. Group by Competitive Group Key
        const groups = new Map<string, typeof summaryGroups>();
        typeFiltered.forEach(g => {
            const key = g.competitiveGroupKey || 'Uncategorized';
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(g);
        });

        return groups;
    }, [summaryGroups, cycleFilter, cycleSort, cycleListPhase]);

    const sortedGroupKeys = Array.from(groupedCycles.keys()).sort();

    // Handlers
    const handleGroupSelect = (group: typeof summaryGroups[0]) => {
        selectCycle(group.id, group.competitiveGroupKey || 'Unknown');
    };



    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Command Strategy Center Header */}
            <div className={`border-b px-6 py-4 flex items-center justify-between shrink-0 transition-colors duration-300 ${cycleListPhase === 'Archive' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                <div>
                    <h1 className={`text-xl font-bold transition-colors ${cycleListPhase === 'Archive' ? 'text-indigo-900' : 'text-slate-900'}`}>
                        {cycleListPhase === 'Archive' ? 'Cycle Archives' : 'Command Strategy Center'}
                    </h1>
                    <p className={`text-sm transition-colors ${cycleListPhase === 'Archive' ? 'text-indigo-600/70' : 'text-slate-500'}`}>
                        {cycleListPhase === 'Archive' ? 'View historical and finalized fitness report cycles.' : 'Select a Competitive Group to view strategy.'}
                    </p>
                </div>

                {/* Placeholder for future filters */}
                <div className="w-16"></div>
            </div>

            {/* Main Content Area - Split Panel */}
            <div className="flex-1 flex overflow-hidden">

                {/* Left Panel: Active Cycles Stream */}
                <div className="w-[420px] bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 z-10">

                    {/* Panel Header */}
                    <div className="px-6 py-4 border-b border-slate-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                        <div className="flex items-center justify-start mb-4">
                            {/* Phase Toggle */}
                            <div className="flex items-center gap-1 bg-slate-200/50 p-0.5 rounded-lg border border-slate-200 shadow-sm">
                                {(['Archive', 'Active', 'Projected'] as const).map((phase) => (
                                    <button
                                        key={phase}
                                        onClick={() => setCycleListPhase(phase)}
                                        className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${cycleListPhase === phase
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        {phase}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-1 bg-slate-200/50 p-0.5 rounded-lg border border-slate-200 shadow-sm">
                                {(['All', 'Officer', 'Enlisted'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setCycleFilter(f as any)}
                                        className={`flex-1 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${cycleFilter === f
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                                <div className="flex items-center gap-1.5">
                                    <ArrowUpDown className="w-3 h-3" />
                                    <span>Sort by</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCycleSort('DueDate')}
                                        className={`hover:text-indigo-600 transition-colors ${cycleSort === 'DueDate' ? 'text-indigo-600 font-bold' : ''}`}
                                    >
                                        Due Date
                                    </button>
                                    <span>•</span>
                                    <button
                                        onClick={() => setCycleSort('Status')}
                                        className={`hover:text-indigo-600 transition-colors ${cycleSort === 'Status' ? 'text-indigo-600 font-bold' : ''}`}
                                    >
                                        Status
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Stream */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
                        {sortedGroupKeys.length === 0 ? (
                            <div className="text-center py-12 px-4 text-slate-400">
                                <Filter className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No {cycleListPhase.toLowerCase()} cycles found for this filter.</p>
                            </div>
                        ) : (
                            sortedGroupKeys.map(key => {
                                const groups = groupedCycles.get(key) || [];
                                return (
                                    <div key={key} className="space-y-3">
                                        <div className="flex items-center gap-2 px-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                                {key}
                                            </span>
                                            <div className="h-px bg-slate-200 flex-1 ml-2"></div>
                                        </div>

                                        <div className="space-y-2.5">
                                            {groups.map(group => {
                                                // Calculate simple status (logic can be centralized later)
                                                const now = new Date();
                                                const endDate = new Date(group.periodEndDate);
                                                let status: 'Upcoming' | 'Active' | 'Overdue' | 'Complete' = 'Active';

                                                // Map data status to UI status
                                                if (['Submitted', 'Final', 'Complete'].includes(group.status || '')) {
                                                    status = 'Complete';
                                                } else if (endDate < now) {
                                                    status = 'Overdue';
                                                }

                                                // Calculate distribution
                                                const distribution: Record<string, number> = { SP: 0, PR: 0, P: 0, MP: 0, EP: 0 };
                                                group.reports.forEach(r => {
                                                    const rec = r.promotionRecommendation;
                                                    if (rec === 'SP') distribution.SP++;
                                                    else if (rec === 'Prog') distribution.PR++;
                                                    else if (rec === 'P') distribution.P++;
                                                    else if (rec === 'MP') distribution.MP++;
                                                    else if (rec === 'EP') distribution.EP++;
                                                });

                                                return (
                                                    <StrategyGroupCard
                                                        key={group.id}
                                                        title={group.name}
                                                        date={group.periodEndDate}
                                                        memberCount={group.reports.length}
                                                        status={status}
                                                        workflowStatus={group.status || 'Drafting'}
                                                        rscaImpact={0} // Placeholder
                                                        promotionStatus={group.promotionStatus}
                                                        isSelected={selectedCycleId === group.id}
                                                        onClick={() => handleGroupSelect(group)}
                                                        distribution={distribution}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Panel: Context & Details */}
                <div className="flex-1 overflow-hidden relative bg-slate-50/50">
                    {/* Background Pattern/Texture could go here */}

                    {selectedCycleId && selectedGroup ? (
                        <div className="h-full w-full animate-in fade-in slide-in-from-right-4 duration-300">
                            <CycleContextPanel
                                group={selectedGroup}
                            />
                        </div>
                    ) : (
                        <div className="flex h-full items-center justify-center p-8 text-center text-slate-400">
                            <div>
                                <Filter className="mx-auto mb-4 h-12 w-12 opacity-20" />
                                <h3 className="text-lg font-medium text-slate-600">Select a Summary Group</h3>
                                <p className="mt-2 text-sm">
                                    Choose a group from the list on the left to view its strategy and metrics.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
