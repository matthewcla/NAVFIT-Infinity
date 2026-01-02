import { useMemo, useState } from 'react';
import type { SummaryGroup } from '@/types';

import { CycleContextPanel } from './CycleContextPanel';
import { ActiveCyclesList } from './ActiveCyclesList';


import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';
import { Filter, ArrowUpDown, Plus } from 'lucide-react';
import { AddSummaryGroupModal } from '@/features/dashboard/components/AddSummaryGroupModal';
import { TrashDropZone } from '@/features/dashboard/components/TrashDropZone';
import { ConfirmationModal } from '@/features/dashboard/components/ConfirmationModal';

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
        addSummaryGroup,
        deleteSummaryGroup,
        deleteReport,
        draggingItemType,
        isRankMode
    } = useNavfitStore();

    const [isModalOpen, setIsModalOpen] = useState(false);

    // Deletion Modal State
    const [deletionModalState, setDeletionModalState] = useState<{
        isOpen: boolean;
        type: 'GROUP' | 'REPORT';
        id: string; // Group ID for groups
        reportId?: string; // Only for reports
        groupId?: string; // Only for reports
        title: string;
        description: string;
    } | null>(null);

    const handleConfirmDelete = () => {
        if (!deletionModalState) return;

        if (deletionModalState.type === 'GROUP') {
            deleteSummaryGroup(deletionModalState.id);
        } else if (deletionModalState.type === 'REPORT' && deletionModalState.groupId && deletionModalState.reportId) {
            deleteReport(deletionModalState.groupId, deletionModalState.reportId);
        }
        setDeletionModalState(null);
    };

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
                            cycleListPhase === 'Projected' ? 'Strategic Projections' :
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
                <div className="w-[420px] bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 z-10 relative">

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
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
                        <ActiveCyclesList
                            groups={Array.from(groupedCycles.values()).flat()}
                            onSelect={handleGroupSelect}
                            selectedGroupId={selectedCycleId}
                        />
                    </div>

                    {/* Floating Action Button */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-end px-4 pointer-events-none sticky-button-container">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="group bg-indigo-600 text-white shadow-lg rounded-full h-12 w-12 hover:w-48 transition-all duration-300 ease-in-out overflow-hidden flex items-center pointer-events-auto"
                        >
                            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                                <Plus className="w-6 h-6" />
                            </div>
                            <span className="whitespace-nowrap font-bold pr-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                                Summary Group
                            </span>
                        </button>
                    </div>

                    <AddSummaryGroupModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        competitiveGroups={allCompetitiveGroups.length > 0 ? allCompetitiveGroups : ['O-1', 'O-2', 'O-3', 'O-4', 'O-5', 'O-6', 'E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6', 'E-7', 'E-8', 'E-9']}
                        onCreate={handleCreateGroups}
                    />
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

                    {/* Trash Zone */}
                    {!isRankMode && (draggingItemType === 'summary_group' || draggingItemType === 'member_report') && (
                        <TrashDropZone
                            acceptTypes={['summary_group', 'member_report']}
                            onDrop={(data) => {
                                if (typeof data === 'string') {
                                    // Assume Summary Group ID
                                    setDeletionModalState({
                                        isOpen: true,
                                        type: 'GROUP',
                                        id: data,
                                        title: 'Delete Summary Group?',
                                        description: 'Are you sure you want to delete this Summary Group? This action cannot be undone.'
                                    });
                                } else if (data && data.type === 'member_report') {
                                    setDeletionModalState({
                                        isOpen: true,
                                        type: 'REPORT',
                                        id: data.reportId,
                                        groupId: data.groupId,
                                        reportId: data.reportId,
                                        title: 'Remove Member?',
                                        description: 'Are you sure you want to remove this member report from the group?'
                                    });
                                }
                            }}
                            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-12 h-12 bg-white/80 backdrop-blur shadow-lg border-2 border-slate-200 rounded-full hover:scale-110 hover:border-red-400 hover:bg-red-50 transition-all flex items-center justify-center"
                        />
                    )}

                    {/* Confirmation Modal */}
                    {deletionModalState && (
                        <ConfirmationModal
                            isOpen={deletionModalState.isOpen}
                            onClose={() => setDeletionModalState(null)}
                            onConfirm={handleConfirmDelete}
                            title={deletionModalState.title}
                            description={deletionModalState.description}
                            confirmText="Delete"
                            variant="danger"
                        />
                    )}
                </div>

            </div>
        </div>
    );
}
