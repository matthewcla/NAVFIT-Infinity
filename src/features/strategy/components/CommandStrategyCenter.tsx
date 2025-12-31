import { useMemo } from 'react';

import { CycleContextPanel } from './CycleContextPanel';
import { StrategyGroupCard } from './StrategyGroupCard';

import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';
import { Layout, Filter, ArrowUpDown } from 'lucide-react';

export function CommandStrategyCenter() {
    const {

        selectCycle,
        selectedCycleId,
        cycleFilter,
        cycleSort,
        setCycleFilter,
        setCycleSort,
    } = useNavfitStore();

    const summaryGroups = useSummaryGroups();

    // Retrieve the full selected group object
    const selectedGroup = useMemo(() => {
        return summaryGroups.find(g => g.id === selectedCycleId) || null;
    }, [summaryGroups, selectedCycleId]);





    // 2. Filter & Sort Logic for Left Panel
    const groupedCycles = useMemo(() => {
        // A. Filter
        const filtered = summaryGroups.filter(g => {
            if (cycleFilter === 'All') return true;
            const isEnlisted = g.paygrade?.startsWith('E');
            if (cycleFilter === 'Officer') return !isEnlisted;
            if (cycleFilter === 'Enlisted') return isEnlisted;
            return true;
        });

        // B. Sort
        filtered.sort((a, b) => {
            if (cycleSort === 'DueDate') {
                return new Date(a.periodEndDate).getTime() - new Date(b.periodEndDate).getTime();
            }
            if (cycleSort === 'Status') {
                return (a.status || '').localeCompare(b.status || '');
            }
            return 0;
        });

        // C. Group by Competitive Group Key
        const groups = new Map<string, typeof summaryGroups>();
        filtered.forEach(g => {
            const key = g.competitiveGroupKey || 'Uncategorized';
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(g);
        });

        return groups;
    }, [summaryGroups, cycleFilter, cycleSort]);

    const sortedGroupKeys = Array.from(groupedCycles.keys()).sort();

    // Handlers
    const handleGroupSelect = (group: typeof summaryGroups[0]) => {
        selectCycle(group.id, group.competitiveGroupKey || 'Unknown');
    };



    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Command Strategy Center Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Command Strategy Center</h1>
                    <p className="text-sm text-slate-500">Select a Competitive Group to view strategy.</p>
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
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-800">Active Cycles</h2>
                            <div className="flex gap-1">
                                <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                    {summaryGroups.length}
                                </span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 p-1 bg-slate-100/50 rounded-lg border border-slate-200">
                                {(['All', 'Officer', 'Enlisted'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setCycleFilter(f as any)}
                                        className={`flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all ${cycleFilter === f
                                            ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
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
                                <p className="text-sm">No active cycles found for this filter.</p>
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
                                                if (endDate < now) status = 'Overdue';

                                                return (
                                                    <StrategyGroupCard
                                                        key={group.id}
                                                        title={group.name}
                                                        date={group.periodEndDate}
                                                        memberCount={group.reports.length}
                                                        status={status}
                                                        rscaImpact={0} // Placeholder
                                                        promotionStatus={group.promotionStatus}
                                                        isSelected={selectedCycleId === group.id}
                                                        onClick={() => handleGroupSelect(group)}
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
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 border border-slate-200 shadow-sm">
                                <Layout className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-600 mb-1">No Cycle Selected</h3>
                            <p className="text-sm max-w-xs text-center text-slate-500">
                                Select an active cycle from the list on the left to view its strategy context and details.
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
