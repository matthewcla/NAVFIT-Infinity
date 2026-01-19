import { useNavfitStore } from '@/store/useNavfitStore';
import { PageShell, PageHeader, PageContent } from '@/components/layout/PageShell';
import { ActionItemsWidget } from './ActionItemsWidget';
import { RscaRiskWidget } from './RscaRiskWidget';
import { ActiveDeadlinesWidget } from './ActiveDeadlinesWidget';


export function CommandDeck() {
    const { currentUser } = useNavfitStore();

    return (
        <PageShell>
            <PageHeader title="Command Deck">
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500 hidden md:block">
                        Welcome back, {currentUser?.rank || 'Skipper'} {currentUser?.name?.split(' ').pop() || ''}
                    </span>
                </div>
            </PageHeader>

            <PageContent>
                <div className="h-full w-full overflow-y-auto p-6 custom-scrollbar">
                    {/* Main Grid */}
                    <div className="grid grid-cols-12 gap-6 min-h-0">

                        {/* Column 1: Action Items & Alerts (Width 4) */}
                        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                            {/* Critical Widget */}
                            <div className="flex-1 min-h-[300px]">
                                <ActionItemsWidget />
                            </div>
                        </div>

                        {/* Column 2: Active Deadlines (Width 4) */}
                        <div className="col-span-12 lg:col-span-4 flex flex-col h-full min-h-[400px]">
                            <ActiveDeadlinesWidget />
                        </div>

                        {/* Column 3: RSCA Watch (Width 4) */}
                        <div className="col-span-12 lg:col-span-4 flex flex-col h-full min-h-[400px]">
                            <RscaRiskWidget />
                        </div>

                    </div>
                </div>
            </PageContent>
        </PageShell>
    );
}
