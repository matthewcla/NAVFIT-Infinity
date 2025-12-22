import { Calendar, Plus } from 'lucide-react';
import { CURRENT_YEAR } from '../../lib/constants';
import { ManningWaterfall } from './ManningWaterfall';
import { RscaHealthWidget } from './RscaHealthWidget';
import { OpportunityRadarWidget } from './OpportunityRadarWidget';
import { ActivitySyncBar } from './ActivitySyncBar';

export const StrategicPulseDashboard = () => {
    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <header className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-8 shadow-sm flex-shrink-0">
                <h2 className="text-xl font-bold text-slate-800">Command Strategic Pulse</h2>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        <Calendar size={14} />
                        <span>Year: {CURRENT_YEAR}</span>
                    </div>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center">
                        <Plus size={16} className="mr-2" />
                        New Report
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {/* Top Row: Strategy Widgets */}
                <div className="grid grid-cols-12 gap-6 mb-8">
                    <div className="col-span-6">
                        <RscaHealthWidget />
                    </div>
                    <div className="col-span-6">
                        <OpportunityRadarWidget />
                    </div>
                </div>

                {/* Main Row: Manning Waterfall */}
                <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-12">
                        <div className="h-[600px] w-full">
                            <ManningWaterfall />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Tier: Activity & Sync */}
            <ActivitySyncBar />
        </div>
    );
};
