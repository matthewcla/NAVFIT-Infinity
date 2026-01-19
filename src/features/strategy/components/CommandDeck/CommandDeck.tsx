import { useNavfitStore } from '@/store/useNavfitStore';
import { ActionItemsWidget } from './ActionItemsWidget';
import { RscaRiskWidget } from './RscaRiskWidget';
import { ActiveDeadlinesWidget } from './ActiveDeadlinesWidget';


export function CommandDeck() {
    const { currentUser } = useNavfitStore();

    return (
        <div className="h-full bg-slate-50 overflow-y-auto p-8 custom-scrollbar">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                    Command Deck
                </h1>
                <p className="text-slate-500 mt-1">
                    Welcome back, {currentUser?.rank || 'Skipper'} {currentUser?.name?.split(' ').pop() || ''}.
                    <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold uppercase rounded-md tracking-wider">
                        Strategy Active
                    </span>
                </p>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-12 gap-6 h-[calc(100%-120px)]">

                {/* Column 1: Action Items & Alerts (Width 4) */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                    {/* Critical Widget */}
                    <div className="flex-1 min-h-[300px]">
                        <ActionItemsWidget />
                    </div>

                </div>

                {/* Column 2: Active Deadlines (Width 4) */}
                <div className="col-span-12 lg:col-span-4 flex flex-col h-full">
                    <ActiveDeadlinesWidget />
                </div>

                {/* Column 3: RSCA Watch (Width 4) */}
                <div className="col-span-12 lg:col-span-4 flex flex-col h-full">
                    <RscaRiskWidget />
                </div>

            </div>
        </div>
    );
}
