// import { Calendar, Plus } from 'lucide-react'; 
// import { CURRENT_YEAR } from '@/lib/constants';
import { useState } from 'react';
import { GanttChart, List, ChevronLeft } from 'lucide-react';
import { ManningWaterfall } from './ManningWaterfall';
import { StrategyListView } from './StrategyListView';
import { StrategyScattergram } from './StrategyScattergram';

import { ActivitySyncBar } from './ActivitySyncBar';

import { ReportEditorModal } from './ReportEditorModal';
import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';
import { RscaHeadsUpDisplay } from './RscaHeadsUpDisplay';

interface StrategyWorkspaceProps {
    onBack?: () => void;
}

export function StrategyWorkspace({ onBack }: StrategyWorkspaceProps) {
    const [flightPathMode, setFlightPathMode] = useState(false);
    const {
        roster,
        projections,
        updateProjection,
        selectReport,
        viewMode,
        setViewMode
    } = useNavfitStore();

    const summaryGroups = useSummaryGroups();

    const handleOpenReport = (_memberId: string, _name: string, _rank?: string, reportId?: string) => {
        if (reportId) {
            selectReport(reportId);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <ReportEditorModal />

            {/* Header */}
            <header className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-8 shadow-sm flex-shrink-0 z-10">
                <div className="flex items-center space-x-4">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                            title="Back to Command Center"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Strategic Pulse</span>
                    <div className="h-6 w-px bg-slate-200"></div>
                </div>
                <div className="flex items-center space-x-4">
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
            </header>

            {/* Sticky HUD */}
            <div className="sticky top-0 z-20">
                <RscaHeadsUpDisplay summaryGroups={summaryGroups} />
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                {viewMode === 'timeline' ? (
                    <div className="flex-1 min-h-0 relative p-4 flex flex-col">
                        <div className="flex justify-end mb-2">
                            <div className="flex items-center space-x-2 bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                                <span className="text-xs font-semibold text-slate-500 px-2">Visualization</span>
                                <button
                                    onClick={() => setFlightPathMode(!flightPathMode)}
                                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${flightPathMode ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                                >
                                    Flight Path Mode
                                </button>
                            </div>
                        </div>

                        {flightPathMode ? (
                            <StrategyScattergram
                                summaryGroups={summaryGroups}
                                roster={roster}
                                onOpenReport={handleOpenReport}
                                onUpdateReport={updateProjection}
                                flightPathMode={true}
                                height={600}
                            />
                        ) : (
                            <ManningWaterfall
                                summaryGroups={summaryGroups}
                                roster={roster}
                                onOpenReport={handleOpenReport}
                                onReportUpdate={updateProjection}
                                projections={projections}
                            />
                        )}
                    </div>
                ) : (
                    <StrategyListView summaryGroups={summaryGroups} />
                )}
            </div>

            {/* Bottom Tier: Activity & Sync */}
            <ActivitySyncBar />
        </div>
    );
};

