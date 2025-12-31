import { useMemo } from 'react';
import { RscaHeadsUpDisplay } from './RscaHeadsUpDisplay';
import { StrategyGroupCard } from './StrategyGroupCard'; // Direct use
import { Radar, ExternalLink, Users, Shield } from 'lucide-react'; // Added icons if needed
// Removed OpportunityRadarWidget and ActiveCyclesList

import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';

interface CommandStrategyCenterProps {
    onNavigateToRanking: (groupId: string) => void;
}

export function CommandStrategyCenter({ onNavigateToRanking }: CommandStrategyCenterProps) {
    const { rsConfig, setSelectedCompetitiveGroupKey } = useNavfitStore();
    const summaryGroups = useSummaryGroups();

    // 1. Current RSCA
    const currentRsca = rsConfig.targetRsca || 4.00;

    // 2. Projected RSCA Calculation
    const totalReportsHistory = rsConfig.totalReports || 100;

    // Calculate Global Projected RSCA
    const { projectedRsca } = useMemo(() => {
        let totalScore = currentRsca * totalReportsHistory;
        let totalCount = totalReportsHistory;

        summaryGroups.forEach(group => {
            group.reports.forEach(r => {
                if (r.traitAverage) {
                    totalScore += r.traitAverage;
                    totalCount += 1;
                }
            });
        });

        return {
            projectedRsca: totalCount > 0 ? totalScore / totalCount : currentRsca
        };
    }, [currentRsca, totalReportsHistory, summaryGroups]);


    // 3. Filter & Group Logic
    const { officerGroups, enlistedGroups } = useMemo(() => {
        const today = new Date();
        const ninetyDaysFromNow = new Date();
        ninetyDaysFromNow.setDate(today.getDate() + 90);

        // Filter: Overdue or Due within 90 days
        const relevantGroups = summaryGroups.filter(g => {
            const d = new Date(g.periodEndDate);
            // Overdue: d < today
            // Upcoming soon: d <= ninetyDaysFromNow
            // Combined: d <= ninetyDaysFromNow. 
            // NOTE: "Overdue" implies it hasn't been finalized yet? 
            // The prompt said "Overdue (Date < Today) OR Due in the next 90 days".
            // So basically anything before 90 days from now.
            return d <= ninetyDaysFromNow;
        });

        // Sort by periodEndDate asc
        relevantGroups.sort((a, b) => new Date(a.periodEndDate).getTime() - new Date(b.periodEndDate).getTime());

        const officer: typeof summaryGroups = [];
        const enlisted: typeof summaryGroups = [];

        relevantGroups.forEach(g => {
            // Determine type
            // Default to Officer unless paygrade starts with 'E'
            const isEnlisted = g.paygrade?.startsWith('E');
            if (isEnlisted) {
                enlisted.push(g);
            } else {
                officer.push(g);
            }
        });

        return { officerGroups: officer, enlistedGroups: enlisted };
    }, [summaryGroups]);

    // Helper to render a list of cards
    const renderGroupList = (groups: typeof summaryGroups, title: string) => {
        if (groups.length === 0) {
            return (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                    <p>No active {title.toLowerCase()} cycles.</p>
                </div>
            )
        }

        // Group by competitiveGroupKey
        const groupedMap: Record<string, typeof summaryGroups> = {};

        groups.forEach(g => {
            const key = g.competitiveGroupKey || 'Other';
            if (!groupedMap[key]) {
                groupedMap[key] = [];
            }
            groupedMap[key].push(g);
        });

        // Ensure we sort the keys to keep order consistent (Logic: Put groups with soonest deadlines first)
        const sortedKeys = Object.keys(groupedMap).sort((keyA, keyB) => {
            const groupA = groupedMap[keyA];
            const groupB = groupedMap[keyB];

            // Find earliest date in group A
            const fastestA = Math.min(...groupA.map(g => new Date(g.periodEndDate).getTime()));
            const fastestB = Math.min(...groupB.map(g => new Date(g.periodEndDate).getTime()));

            return fastestA - fastestB;
        });

        return (
            <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                    {title === 'Officer' ? <Shield className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                    {title} Cycles
                </h3>

                {sortedKeys.map(compKey => {
                    const subGroups = groupedMap[compKey];
                    // Clean up key for display: "O-3 1110" is good. "Other" is fallback.
                    const displayTitle = compKey === 'Other' ? 'Miscellaneous' : compKey;

                    return (
                        <div key={compKey} className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                                {displayTitle}
                            </h4>
                            <div className="grid grid-cols-1 gap-4">
                                {subGroups.map(group => {
                                    // Status Logic (replicated from ActiveCyclesList logic for consistency)
                                    const today = new Date();
                                    const groupDate = new Date(group.periodEndDate);
                                    let status: 'Upcoming' | 'Active' | 'Overdue' | 'Complete' = 'Upcoming';

                                    if (group.status) {
                                        if (group.status === 'Draft' || group.status === 'Projected') status = 'Upcoming';
                                        else if (group.status === 'Submitted' || group.status === 'Final') status = 'Complete';
                                        else status = 'Active';
                                    }

                                    // Override based on date if generic
                                    if (status === 'Upcoming' && Math.abs(groupDate.getTime() - today.getTime()) < 30 * 24 * 60 * 60 * 1000) status = 'Active';
                                    if (groupDate < today && status !== 'Complete') status = 'Overdue';

                                    // Calculate Impact
                                    const groupSize = group.reports.length;
                                    const groupSum = group.reports.reduce((s, r) => s + (r.traitAverage || 0), 0);
                                    const groupAvg = groupSize > 0 ? groupSum / groupSize : 0;
                                    const impact = groupSize > 0
                                        ? (groupAvg - currentRsca) * (groupSize / (totalReportsHistory + groupSize))
                                        : 0;

                                    // Calculate Air Gap
                                    const maxEPs = Math.floor(groupSize * 0.20) || (groupSize > 0 ? 1 : 0);
                                    const assignedEPs = group.reports.filter(r => r.promotionRecommendation === 'EP').length;
                                    const airGap = Math.max(0, maxEPs - assignedEPs);

                                    return (
                                        <StrategyGroupCard
                                            key={group.id}
                                            title={group.name}
                                            date={group.periodEndDate}
                                            memberCount={group.reports.length}
                                            status={status}
                                            rscaImpact={impact}
                                            airGaps={airGap}
                                            promotionStatus={group.promotionStatus}
                                            onClick={() => {
                                                setSelectedCompetitiveGroupKey(group.id);
                                                onNavigateToRanking(group.id);
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };


    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* 1. Sticky HUD */}
            <div className="sticky top-0 z-20">
                <RscaHeadsUpDisplay
                    summaryGroups={summaryGroups}
                    defaultCurrentRsca={currentRsca}
                    defaultProjectedRsca={projectedRsca}
                    defaultAlerts={projectedRsca > 4.20 ? [{ id: 'alert-1', type: 'warning', message: 'Projected RSCA exceeds limit' }] : []}
                />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">

                {/* Center Column: Active Cycles */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-6xl mx-auto space-y-8">

                        {/* Summary / Welcome Block */}
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">Command Strategy Center</h1>
                                <p className="text-slate-500 mt-1">Manage valuation cycles, monitor RSCA health, and identify strategic opportunities.</p>
                            </div>
                            {/* Potential Action Button could go here */}
                        </div>

                        {/* Split View */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left Col: Officer */}
                            {renderGroupList(officerGroups, 'Officer')}

                            {/* Right Col: Enlisted */}
                            {renderGroupList(enlistedGroups, 'Enlisted')}
                        </div>

                    </div>
                </div>

                {/* Right Sidebar: Strategic Insights (Modified) */}
                <div className="w-80 bg-white border-l border-slate-200 overflow-y-auto hidden xl:block">
                    <div className="p-6 space-y-8">

                        {/* Insight Header */}
                        <div className="flex items-center gap-2 text-indigo-700 font-bold uppercase tracking-wider text-xs mb-4">
                            <Radar className="w-4 h-4" />
                            Strategic Insights
                        </div>

                        <div className="text-sm text-slate-500 italic">
                            Select a cycle to view detailed analysis and air gap opportunities.
                        </div>

                        {/* Quick Links / Actions */}
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                            <h3 className="text-sm font-bold text-slate-800 mb-3">Quick Actions</h3>
                            <ul className="space-y-2 text-sm">
                                <li>
                                    <button className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors w-full text-left">
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>Export RSCA History</span>
                                    </button>
                                </li>
                                <li>
                                    <button className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors w-full text-left">
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>Manage Reporting Senior</span>
                                    </button>
                                </li>
                            </ul>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
