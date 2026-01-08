import { useMemo, useState } from 'react';
import type { SummaryGroup } from '@/types';

import { CycleContextPanel } from './CycleContextPanel';
import { ActiveCyclesList } from './ActiveCyclesList';


import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';
import { Filter } from 'lucide-react';
import { AddSummaryGroupModal } from '@/features/dashboard/components/AddSummaryGroupModal';
import { ReportEditorModal } from './ReportEditorModal';


export function CommandStrategyCenter() {
    const {
        selectCycle,
        selectedCycleId,
        cycleFilter,
        cycleSort,
        cycleListPhase,
        setCycleListPhase,
        addSummaryGroup
    } = useNavfitStore();

    const [isModalOpen, setIsModalOpen] = useState(false);



    const summaryGroups = useSummaryGroups();

    const allCompetitiveGroups = useMemo(() => {
        const keys = new Set<string>();
        summaryGroups.forEach(g => {
            if (g.competitiveGroupKey) keys.add(g.competitiveGroupKey);
        });
        return Array.from(keys).sort();
    }, [summaryGroups]);

    const handleCreateGroups = (newGroups: SummaryGroup[]) => {
        newGroups.forEach(group => addSummaryGroup(group));
    };

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
            const projectedStatuses = ['Planned'];

            if (cycleListPhase === 'Archive') return archiveStatuses.includes(status);
            if (cycleListPhase === 'Planned') return projectedStatuses.includes(status);
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
                        {cycleListPhase === 'Archive' ? 'Command Strategy Archive' :
                            cycleListPhase === 'Planned' ? 'Strategic Projections' :
                                'Command Strategy Center'}
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
                <div className="w-sidebar-standard bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 z-infinity-sidebar relative">

                    {/* Panel Header - Restored */}
                    <div className="px-6 py-4 border-b border-slate-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10 space-y-4">

                        {/* Phase Toggles */}
                        <div className="flex p-1 bg-slate-100 rounded-lg">
                            {['Active', 'Planned', 'Archive'].map((phase) => (
                                <button
                                    key={phase}
                                    onClick={() => setCycleListPhase(phase as 'Active' | 'Planned' | 'Archive')}
                                    className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${cycleListPhase === phase
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {phase}
                                </button>
                            ))}
                        </div>

                        {/* Filters & Sort Row - Moved to ActiveCyclesList */}
                    </div>

                    {/* Scrollable Stream & FAB managed intrinsically */}
                    <div className="flex-1 overflow-hidden">
                        <ActiveCyclesList
                            groups={Array.from(groupedCycles.values()).flat()}
                            onSelect={handleGroupSelect}
                            selectedGroupId={selectedCycleId}
                            onAddClick={() => setIsModalOpen(true)}
                        />
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

                    {/* Trash Zone for Reports - KEPT as per original logic but strictly for member reports now */}

                </div>

            </div>

            <AddSummaryGroupModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                competitiveGroups={allCompetitiveGroups.length > 0 ? allCompetitiveGroups : ['O-1', 'O-2', 'O-3', 'O-4', 'O-5', 'O-6', 'E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6', 'E-7', 'E-8', 'E-9']}
                onCreate={handleCreateGroups}
            />
            <ReportEditorModal />
        </div>
    );
}
