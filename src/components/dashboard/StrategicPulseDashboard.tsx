// import { Calendar, Plus } from 'lucide-react'; 
// import { CURRENT_YEAR } from '../../lib/constants';
import { ManningWaterfall } from './ManningWaterfall';
import { RscaHealthScoreboard } from './RscaHealthScoreboard';
// import { OpportunityRadarWidget } from './OpportunityRadarWidget';

import { ActivitySyncBar } from './ActivitySyncBar';

export const StrategicPulseDashboard = () => {
    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <header className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-8 shadow-sm flex-shrink-0 z-10">
                {/* Replaced Title with Scoreboard */}
                <div className="flex-1 overflow-hidden flex items-center">
                    <RscaHealthScoreboard />
                </div>
                <div className="flex items-center space-x-4">
                    {/* Controls removed as requested */}
                </div>
            </header>

            <div className="flex-1 overflow-hidden p-4 flex flex-col">
                {/* Main Row: Manning Waterfall */}
                <div className="flex-1 w-full min-h-0">
                    <ManningWaterfall />
                </div>
            </div>

            {/* Bottom Tier: Activity & Sync */}
            <ActivitySyncBar />
        </div>
    );
};
