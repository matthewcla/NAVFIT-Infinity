import { useState, useMemo } from 'react';
import { GanttChart, List, ChevronLeft } from 'lucide-react';
import { ManningWaterfall } from './ManningWaterfall';
import { StrategyListView } from './StrategyListView';
import { StrategyScattergram } from './StrategyScattergram';

import { ActivitySyncBar } from './ActivitySyncBar';

import { ReportEditor } from './ReportEditor'; // Import inline editor
import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';
import { RscaHeadsUpDisplay } from './RscaHeadsUpDisplay';
import { calculateCumulativeRSCA } from '@/features/strategy/logic/rsca';

export function StrategyWorkspace() {
    const [flightPathMode, setFlightPathMode] = useState(false);
    const {
        roster,
        projections,
        updateProjection,
        selectReport,

        viewMode,
        setViewMode,
        setStrategyViewMode,

        // Editor State
        isEditingReport,
        setEditingReport,
        selectedReportId
    } = useNavfitStore();

    const summaryGroups = useSummaryGroups();

    // Resolve Report for Editor
    const activeReport = useMemo(() => {
        if (!selectedReportId || !isEditingReport) return null;
        for (const group of summaryGroups) {
            const found = group.reports.find(r => r.id === selectedReportId);
            if (found) return found;
        }
        return null;
    }, [selectedReportId, isEditingReport, summaryGroups]);

    const handleOpenReport = (_memberId: string, _name: string, _rank?: string, reportId?: string) => {
        if (reportId) {
            selectReport(reportId);
            setEditingReport(true); // Ensure editor opens
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <header className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-8 shadow-sm flex-shrink-0 z-10 relative">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => setStrategyViewMode('landing')}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                        title="Back to Command Center"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Strategic Pulse</span>
                    <div className="h-6 w-px bg-slate-200"></div>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center gap-4">
                        {/* Visualization Controls (Only in Timeline) */}
                        {viewMode === 'timeline' && (
                            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-right-4">
                                <button
                                    onClick={() => setFlightPathMode(false)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${!flightPathMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Waterfall
                                </button>
                                <button
                                    onClick={() => setFlightPathMode(true)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${flightPathMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Flight Path
                                </button>
                            </div>
                        )}

                        <div className="h-6 w-px bg-slate-200"></div>

                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button
                                onClick={() => setViewMode('timeline')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'timeline' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                title="Timeline View"
                            >
                                <GanttChart className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                title="List View"
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content Area with Split View */}
            <div className="flex-1 overflow-hidden flex relative">

                {/* Main Visualization Pane */}
                <div className={`flex flex-col h-full transition-all duration-500 ease-in-out ${activeReport ? 'w-1/2 border-r border-slate-200' : 'w-full'}`}>

                    {/* Sticky HUD - Inside Main Pane */}
                    <div className="sticky top-0 z-20">
                        <RscaHeadsUpDisplay
                            currentRsca={(() => {
                                const selectedId = useNavfitStore.getState().selectedCycleId;
                                if (!selectedId) return 4.20;
                                const selectedGroup = summaryGroups.find(g => g.id === selectedId);
                                if (!selectedGroup) return 4.20;
                                const rank = selectedGroup.paygrade || selectedGroup.competitiveGroupKey.split(' ')[0];
                                return calculateCumulativeRSCA(summaryGroups, rank);
                            })()}
                            projectedRsca={(() => {
                                const selectedId = useNavfitStore.getState().selectedCycleId;
                                if (!selectedId) return 4.20;
                                const selectedGroup = summaryGroups.find(g => g.id === selectedId);
                                if (!selectedGroup) return 4.20;
                                const rank = selectedGroup.paygrade || selectedGroup.competitiveGroupKey.split(' ')[0];
                                return calculateCumulativeRSCA(summaryGroups, rank);
                            })()}
                        />
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col">
                        {viewMode === 'timeline' ? (
                            <div className="flex-1 min-h-0 relative p-4 flex flex-col">
                                <div className="mb-2"></div>
                                {flightPathMode ? (
                                    <StrategyScattergram
                                        summaryGroups={
                                            useNavfitStore.getState().selectedCycleId
                                                ? summaryGroups.filter(g => g.id === useNavfitStore.getState().selectedCycleId)
                                                : summaryGroups
                                        }
                                        roster={roster}
                                        onOpenReport={handleOpenReport}
                                        onUpdateReport={(reportId, value) => {
                                            const group = summaryGroups.find(g => g.reports.some(r => r.id === reportId));
                                            if (group) updateProjection(group.id, reportId, value);
                                        }}
                                        flightPathMode={true}
                                        height={600}
                                    />
                                ) : (
                                    <ManningWaterfall
                                        summaryGroups={
                                            useNavfitStore.getState().selectedCycleId
                                                ? summaryGroups.filter(g => g.id === useNavfitStore.getState().selectedCycleId)
                                                : summaryGroups
                                        }
                                        roster={roster}
                                        onOpenReport={handleOpenReport}
                                        onReportUpdate={(reportId, value) => {
                                            const group = summaryGroups.find(g => g.reports.some(r => r.id === reportId));
                                            if (group) updateProjection(group.id, reportId, value);
                                        }}
                                        projections={projections}
                                    />
                                )}
                            </div>
                        ) : (
                            <StrategyListView
                                summaryGroups={
                                    useNavfitStore.getState().selectedCycleId
                                        ? summaryGroups.filter(g => g.id === useNavfitStore.getState().selectedCycleId)
                                        : summaryGroups
                                }
                            />
                        )}
                    </div>

                    {/* Activity Bar - Inside Main Pane */}
                    <ActivitySyncBar />
                </div>

                {/* Contextual Editor Pane */}
                {activeReport && (
                    <div className="w-1/2 h-full bg-white flex flex-col animate-in slide-in-from-right duration-500 z-30 shadow-2xl relative">
                        <ReportEditor
                            report={activeReport}
                            onClose={() => setEditingReport(false)}
                            onBack={() => setEditingReport(false)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

