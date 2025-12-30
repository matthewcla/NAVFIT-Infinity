// import { Calendar, Plus } from 'lucide-react'; 
// import { CURRENT_YEAR } from '../../lib/constants';
import { ManningWaterfall } from './ManningWaterfall';
import { RscaHealthScoreboard } from './RscaHealthScoreboard';
// import { OpportunityRadarWidget } from './OpportunityRadarWidget';

import { ActivitySyncBar } from './ActivitySyncBar';

import type { SummaryGroup } from '../../types';
import type { RosterMember } from '../../types/roster';

interface StrategicPulseDashboardProps {
    summaryGroups?: SummaryGroup[];
    roster?: RosterMember[];
    onOpenReport?: (memberId: string, name: string, rank?: string, reportId?: string) => void;
    onReportUpdate?: (reportId: string, newAverage: number) => void;
    projections?: Record<string, number>;
}

export function StrategicPulseDashboard({ summaryGroups = [], roster = [], onOpenReport, onReportUpdate, projections }: StrategicPulseDashboardProps) {
    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <header className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-8 shadow-sm flex-shrink-0 z-10">
                {/* Replaced Title with Scoreboard */}
                <div className="flex-1 overflow-hidden flex items-center">
                    <RscaHealthScoreboard summaryGroups={summaryGroups} />
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
                        onOpenReport={onOpenReport}
                        onReportUpdate={onReportUpdate}
                        projections={projections}
                    />
                </div>
            </div>

            {/* Bottom Tier: Activity & Sync */}
            <ActivitySyncBar />
        </div>
    );
};
