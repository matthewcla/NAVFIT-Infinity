import { useMemo, useState, useEffect } from 'react';
import type { SummaryGroup } from '@/types';

import { DistributionPanel } from './DistributionPanel';
import { ActiveCyclesList } from './ActiveCyclesList';
import { DashboardMetrics } from '@/features/dashboard/components/DashboardMetrics';

// Strategy Views
import { StrategyScattergram } from './StrategyScattergram';
import { ManningWaterfall } from './ManningWaterfall';
import { StrategyListView } from './StrategyListView';
// import { ReportEditor } from './ReportEditor';
import { MemberInspector } from './MemberInspector';

import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';

import { AddSummaryGroupModal } from '@/features/dashboard/components/AddSummaryGroupModal';

import {
    LayoutGrid,
    GanttChart,
    BarChart3,
    List
} from 'lucide-react';

import { PageContent } from '@/components/layout/PageShell';
import { ContextSidebar } from '@/components/layout/ContextSidebar';


type ViewTab = 'distribution' | 'timeline' | 'waterfall' | 'list';

export function CommandStrategyCenter() {
    const {
        selectCycle,
        selectedCycleId,
        selectedMemberId,
        cycleFilter,
        cycleSort,
        cycleListPhase,
        addSummaryGroup,
        selectMember,

        // Editor State (Legacy support for Timeline/Waterfall)
        setEditingReport,
        selectReport,
        updateProjection,
        projections,
        roster
    } = useNavfitStore();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewTab, setViewTab] = useState<ViewTab>('distribution');

    // Flight Path Mode State (Local to Timeline view)
    const [flightPathMode, setFlightPathMode] = useState(false);

    const summaryGroups = useSummaryGroups();

    // Lifted State: Preview Projections for real-time slider updates
    const [previewProjections, setPreviewProjections] = useState<Record<string, number>>({});

    const handlePreviewMTA = (reportId: string, val: number) => {
        setPreviewProjections(prev => ({
            ...prev,
            [reportId]: val
        }));
    };

    // Clear preview when cycle changes
    // useEffect(() => setPreviewProjections({}), [selectedCycleId]); // Optional optimization

    // Auto-Select Logic: On mount, if no cycle is selected, pick the most urgent active one
    useEffect(() => {
        if (selectedCycleId) return; // Already selected
        if (!summaryGroups || summaryGroups.length === 0) return; // No data

        // Filter for active phases
        const activeStatuses = ['Drafting', 'Planning', 'Review', 'Submitted', 'Pending', 'Draft'];
        const candidates = summaryGroups.filter(g => activeStatuses.includes(g.status || 'Drafting'));

        // Sort by deadline (soonest first)
        candidates.sort((a, b) => new Date(a.periodEndDate).getTime() - new Date(b.periodEndDate).getTime());

        // Select the best candidate
        if (candidates.length > 0) {
            const best = candidates[0];
            selectCycle(best.id, best.competitiveGroupKey || 'Unknown');
        } else if (summaryGroups.length > 0) {
            // Fallback: Pick first available if no active ones found
            const fallback = summaryGroups[0];
            selectCycle(fallback.id, fallback.competitiveGroupKey || 'Unknown');
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

    // Derived: Selected Group as Array for Strategy Components
    const selectedGroupArray = useMemo(() => selectedGroup ? [selectedGroup] : [], [selectedGroup]);

    // Resolve Report for Editor (Legacy)
    // const activeReport = useMemo(() => {
    //     if (!selectedReportId || !isEditingReport) return null;
    //     for (const group of summaryGroups) {
    //         const found = group.reports.find(r => r.id === selectedReportId);
    //         if (found) return found;
    //     }
    //     return null;
    // }, [selectedReportId, isEditingReport, summaryGroups]);

    // Open Report Handler (Legacy)
    const handleOpenReport = (_memberId: string, _name: string, _rank?: string, reportId?: string) => {
        if (reportId) {
            selectReport(reportId);
            setEditingReport(true); // Ensure editor opens
        }
    };


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

    // Inspector Navigation Helpers
    const handleIterateMember = (direction: 'next' | 'prev') => {
        if (!selectedMemberId || !selectedGroup) return;

        // Improve: Use the ranked/sorted list from the current view logic if possible.
        // For now, fallback to the group's report list order.
        const reportList = selectedGroup.reports;
        const currentIndex = reportList.findIndex(r => r.memberId === selectedMemberId);
        if (currentIndex === -1) return;

        let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        // Bound check
        if (newIndex < 0) newIndex = 0; // or wrap? reportList.length - 1
        if (newIndex >= reportList.length) newIndex = reportList.length - 1; // or wrap? 0

        const newReport = reportList[newIndex];
        if (newReport) {
            selectMember(newReport.memberId);
        }
    };


    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Command Strategy Center Header */}
            <div className={`border-b px-6 py-3 flex items-center justify-between shrink-0 transition-colors duration-300 ${cycleListPhase === 'Archive' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-bold text-slate-800 tracking-tight">Strategy Center</h1>
                    <div className="h-6 w-px bg-slate-200" />

                    {/* View Tabs - Only visible if group selected */}
                    {selectedCycleId && (
                        <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200">
                            <button
                                onClick={() => setViewTab('distribution')}
                                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewTab === 'distribution' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <LayoutGrid className="w-4 h-4 mr-2" />
                                Distribution
                            </button>
                            <button
                                onClick={() => setViewTab('timeline')}
                                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewTab === 'timeline' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <GanttChart className="w-4 h-4 mr-2" />
                                Timeline
                            </button>
                            <button
                                onClick={() => setViewTab('waterfall')}
                                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewTab === 'waterfall' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <BarChart3 className="w-4 h-4 mr-2" />
                                Waterfall
                            </button>
                            <button
                                onClick={() => setViewTab('list')}
                                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewTab === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <List className="w-4 h-4 mr-2" />
                                List
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area - Split Panel */}
            <PageContent>
                {/* Left Panel: Active Cycles Stream */}
                <ContextSidebar
                    isCollapsed={!!selectedMemberId}
                    onExpand={() => selectMember(null)}
                >
                    <ActiveCyclesList
                        groups={Array.from(groupedCycles.values()).flat()}
                        onSelect={handleGroupSelect}
                        selectedGroupId={selectedCycleId}
                        onAddClick={() => setIsModalOpen(true)}
                    />
                </ContextSidebar>

                {/* Right Panel: Context & Details */}
                <div className="flex-1 overflow-hidden relative bg-slate-50/50 flex">

                    {selectedCycleId && selectedGroup ? (
                        <div className={`flex-1 flex flex-col h-full min-w-0 animate-in fade-in duration-300 ${selectedMemberId ? 'mr-0' : ''}`}>
                            {/* View Rendering Switch */}
                            {viewTab === 'distribution' && (
                                <DistributionPanel
                                    group={selectedGroup}
                                    previewProjections={previewProjections}
                                />
                            )}

                            {viewTab === 'timeline' && (
                                <div className="flex-1 min-h-0 relative p-4 flex flex-col overflow-hidden">
                                    {/* Timeline Controls */}
                                    <div className="flex justify-end mb-4">
                                        <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                                            <button
                                                onClick={() => setFlightPathMode(false)}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${!flightPathMode ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                                            >
                                                Standard
                                            </button>
                                            <button
                                                onClick={() => setFlightPathMode(true)}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${flightPathMode ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                                            >
                                                Flight Path
                                            </button>
                                        </div>
                                    </div>

                                    <StrategyScattergram
                                        summaryGroups={selectedGroupArray}
                                        roster={roster}
                                        onOpenReport={handleOpenReport}
                                        onUpdateReport={(reportId, value) => updateProjection(selectedCycleId, reportId, value)}
                                        flightPathMode={flightPathMode}
                                        height={600}
                                    />
                                </div>
                            )}

                            {viewTab === 'waterfall' && (
                                <div className="flex-1 min-h-0 relative p-4 flex flex-col overflow-hidden">
                                    <ManningWaterfall
                                        summaryGroups={selectedGroupArray}
                                        roster={roster}
                                        onOpenReport={handleOpenReport}
                                        onReportUpdate={(reportId, value) => updateProjection(selectedCycleId, reportId, value)}
                                        projections={projections}
                                    />
                                </div>
                            )}

                            {viewTab === 'list' && (
                                <div className="flex-1 min-h-0 flex flex-col bg-white">
                                    <StrategyListView summaryGroups={selectedGroupArray} />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full w-full animate-in fade-in duration-500">
                            <DashboardMetrics />
                        </div>
                    )}


                    {/* Unified Member Inspector (Replaces Legacy ReportEditor) */}
                    {selectedMemberId && (
                        <div className="h-full z-30 shadow-2xl relative animate-in slide-in-from-right duration-300">
                            <MemberInspector
                                memberId={selectedMemberId}
                                onClose={() => selectMember(null)}
                                onNavigateNext={() => handleIterateMember('next')}
                                onNavigatePrev={() => handleIterateMember('prev')}
                                onPreviewMTA={(val) => {
                                    // Find report ID for selected member
                                    if (selectedGroup) {
                                        const r = selectedGroup.reports.find(rep => rep.memberId === selectedMemberId);
                                        if (r) handlePreviewMTA(r.id, val);
                                    }
                                }}
                            />
                        </div>
                    )}

                </div>
            </PageContent>

            <AddSummaryGroupModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                competitiveGroups={allCompetitiveGroups.length > 0 ? allCompetitiveGroups : ['O-1', 'O-2', 'O-3', 'O-4', 'O-5', 'O-6', 'E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6', 'E-7', 'E-8', 'E-9']}
                onCreate={handleCreateGroups}
            />

        </div >
    );
}
