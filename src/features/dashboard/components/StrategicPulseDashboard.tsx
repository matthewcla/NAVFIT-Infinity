// import { Calendar, Plus } from 'lucide-react'; 
// import { CURRENT_YEAR } from '@/lib/constants';
import { ManningWaterfall } from './ManningWaterfall';
// import { RscaHealthScoreboard } from './RscaHealthScoreboard';
// import { OpportunityRadarWidget } from './OpportunityRadarWidget';

import { ActivitySyncBar } from './ActivitySyncBar';

import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from '@/features/dashboard/hooks/useSummaryGroups';

export function StrategicPulseDashboard() {
    const {
        roster,
        projections,
        updateProjection,
        setPendingReportRequest,
        setActiveTab
    } = useNavfitStore();

    const summaryGroups = useSummaryGroups();

    const handleOpenReport = (memberId: string, name: string, rank?: string, reportId?: string) => {
        setPendingReportRequest({ memberId, name, rank, reportId });
        setActiveTab('reports');
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <header className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-8 shadow-sm flex-shrink-0 z-10">
                <div className="flex items-center space-x-4">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Strategic Pulse</span>
                    <div className="h-6 w-px bg-slate-200"></div>
                </div>
                <div className="flex items-center space-x-4">
                    {/* Controls removed as requested */}
                </div>
            </header>

            <div className="flex-1 overflow-hidden p-4 flex flex-col">
                {/* Manning Waterfall Section */}
                <div className="flex-1 min-h-0 relative">
                    <ManningWaterfall
                        summaryGroups={summaryGroups}
                        roster={roster}
                        onOpenReport={handleOpenReport}
                        onReportUpdate={updateProjection}
                        projections={projections}
                    />
                </div>
            </div>

            {/* Bottom Tier: Activity & Sync */}
            <ActivitySyncBar />
        </div>
    );
};

