import { useMemo, useState } from 'react';
import type { SummaryGroup } from '@/types';

import { CycleContextPanel } from './CycleContextPanel';
import { ActiveCyclesList } from './ActiveCyclesList';



import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';

import { AddSummaryGroupModal } from '@/features/dashboard/components/AddSummaryGroupModal';
import { ReportEditorModal } from './ReportEditorModal';
import { useEffect } from 'react';


export function MissionControl() {
    const {
        selectCycle,
        selectedCycleId,
        selectedMemberId,
        cycleFilter,
        cycleSort,
        cycleListPhase,
        addSummaryGroup,
        selectMember
    } = useNavfitStore();

    const [isModalOpen, setIsModalOpen] = useState(false);



    const summaryGroups = useSummaryGroups();

    // Auto-select top priority active group on mount if none selected
    useEffect(() => {
        if (!selectedCycleId && summaryGroups.length > 0) {
            // Filter for active groups
            const activeGroups = summaryGroups.filter(g =>
                !['Final', 'Archive', 'Complete', 'Accepted', 'Rejected'].includes(g.status || 'Drafting')
            );

            // Sort by due date (earliest first)
            activeGroups.sort((a, b) => new Date(a.periodEndDate).getTime() - new Date(b.periodEndDate).getTime());

            if (activeGroups.length > 0) {
                const topPriority = activeGroups[0];
                selectCycle(topPriority.id, topPriority.competitiveGroupKey || 'Unknown');
            }
        }
    }, [selectedCycleId, summaryGroups, selectCycle]);

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
            {/* Mission Control Header */}
            <div className={`border-b px-6 py-4 flex items-center justify-between shrink-0 transition-colors duration-300 ${cycleListPhase === 'Archive' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-3">

                    <p className={`text-sm transition-colors ${cycleListPhase === 'Archive' ? 'text-indigo-600/70' : 'text-slate-500'}`}>
                        {cycleListPhase === 'Archive' ? 'View historical and finalized fitness report cycles.' :
                            selectedMemberId ? 'Press ESC to close the Infinity Quick Editor.' :
                                selectedCycleId ? 'Select a report to open the Infinity Quick Editor' :
                                    'Summary Groups'}
                    </p>
                </div>

                {/* Sync Status - MOVED TO SIDEBAR */}
                {/* <div className="flex items-center space-x-4"> ... </div> */}
            </div>

            {/* Main Content Area - Split Panel */}
            <div className="flex-1 flex overflow-hidden">

                {/* Left Panel: Active Cycles Stream - Collapses when member detail sidebar is open */}
                <div
                    className={`border-r border-slate-200 flex flex-col shrink-0 z-infinity-sidebar relative transition-all duration-300 ease-in-out overflow-hidden ${selectedMemberId
                        ? 'w-6 bg-slate-100 hover:bg-slate-200 cursor-pointer border-r-4 border-r-transparent hover:border-r-indigo-400'
                        : 'w-sidebar-standard bg-slate-50 opacity-100'
                        }`}
                    onClick={() => {
                        if (selectedMemberId) selectMember(null);
                    }}
                    title={selectedMemberId ? "Click to Expand list" : undefined}
                >

                    {selectedMemberId ? (
                        <div className="h-full flex flex-col items-center pt-8 gap-4 opacity-0 hover:opacity-100 transition-opacity duration-200 delay-100">
                            <div className="w-1 h-12 bg-slate-300 rounded-full" />
                        </div>
                    ) : (
                        /* Scrollable Stream & FAB managed intrinsically */
                        <div className="flex-1 overflow-hidden animate-in fade-in duration-300">
                            <ActiveCyclesList
                                groups={Array.from(groupedCycles.values()).flat()}
                                onSelect={handleGroupSelect}
                                selectedGroupId={selectedCycleId}
                                onAddClick={() => setIsModalOpen(true)}
                            />
                        </div>
                    )}

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
                        <div className="h-full w-full flex items-center justify-center text-slate-400">
                            <div className="flex flex-col items-center">
                                <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></span>
                                Loading Summary Group...
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
