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
                <div className="h-full w-full flex flex-col p-4 overflow-hidden">
                    {/* Header Section */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex-none flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4"
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

                    {/* Main Content Area - Flex Column */}
                    <div className="flex-1 min-h-0 flex flex-col gap-4">

                        {/* Bento Grid - Takes available space */}
                        <div className="flex-1 min-h-0 grid grid-cols-12 gap-4">

                            {/* Primary Visual: Trajectory Engine */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="col-span-12 lg:col-span-9 h-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 overflow-hidden"
                            >
                                <RscaScatterPlot />
                            </motion.div>

                            {/* Secondary: Command Feed */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="col-span-12 lg:col-span-3 h-full"
                            >
                                <CommandFeed />
                            </motion.div>

                        </div>

                        {/* Tactical Grid (Footer) - Fixed Height / Auto */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="flex-none"
                        >
                            <TacticalCycleGrid />
                        </motion.div>
                    </div>
                </div>
            </PageContent>
        </PageShell>
    );
}
