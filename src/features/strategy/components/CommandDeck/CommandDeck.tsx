import { useNavfitStore } from '@/store/useNavfitStore';
import { PageShell, PageContent } from '@/components/layout/PageShell';
import { RscaScatterPlot } from './RscaScatterPlot';
import { CommandFeed } from './CommandFeed';
import { motion } from 'framer-motion';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';

import { isActiveCycle } from '@/features/strategy/logic/cycleStatus';
import { TacticalCycleGrid } from './TacticalCycleGrid';

export function CommandDeck() {
    const { currentUser } = useNavfitStore();
    const summaryGroups = useSummaryGroups();

    // Quick Stats
    const activeCycles = summaryGroups.filter(isActiveCycle).length;
    const totalMembers = summaryGroups.reduce((acc, g) => acc + (g.reports?.length || 0), 0);

    const firstName = currentUser?.name?.split(' ').pop() || 'Skipper';

    return (
        <PageShell className="bg-slate-50/50">
            <PageContent>
                <div className="h-full w-full overflow-y-auto p-4 custom-scrollbar">
                    <div className="w-full space-y-4">

                        {/* Header Section */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2"
                        >
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                                    Command Deck
                                </h1>
                                <p className="text-slate-500 mt-1 text-lg">
                                    Welcome back, {currentUser?.rank || 'Skipper'} {firstName}.
                                </p>
                            </div>

                            {/* HUD Stats */}
                            <div className="flex gap-4">
                                <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Cycles</div>
                                    <div className="text-2xl font-bold text-slate-800">{activeCycles}</div>
                                </div>
                                <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Members</div>
                                    <div className="text-2xl font-bold text-slate-800">{totalMembers}</div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Bento Grid */}
                        <div className="grid grid-cols-12 gap-4 min-h-[500px]">

                            {/* Primary Visual: Trajectory Engine */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="col-span-12 lg:col-span-8 h-[500px] lg:h-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6"
                            >
                                <RscaScatterPlot />
                            </motion.div>

                            {/* Secondary: Command Feed */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="col-span-12 lg:col-span-4 h-[500px] lg:h-auto"
                            >
                                <CommandFeed />
                            </motion.div>

                        </div>

                        {/* Tactical Grid (Footer) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <TacticalCycleGrid />
                        </motion.div>

                    </div>
                </div>
            </PageContent>
        </PageShell>
    );
}
