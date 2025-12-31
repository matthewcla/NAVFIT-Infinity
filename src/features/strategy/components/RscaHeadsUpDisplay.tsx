import { TrendingUp, TrendingDown, Minus, ArrowRight, Activity } from 'lucide-react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { useMemo } from 'react';
import type { SummaryGroup } from '@/types';
import { calculateCumulativeRSCA } from '../logic/rsca'; // Import type

interface RscaAlert {
    id: string;
    type: 'critical' | 'warning' | 'info';
    message: string;
}

interface RscaHeadsUpDisplayProps {
    summaryGroups: SummaryGroup[]; // Required prop to avoid circular dependency
    // Props can still be passed as overrides or fallbacks
    defaultCurrentRsca?: number;
    defaultProjectedRsca?: number;
    defaultAlerts?: RscaAlert[];
}

export function RscaHeadsUpDisplay({ summaryGroups, defaultCurrentRsca, defaultProjectedRsca, defaultAlerts = [] }: RscaHeadsUpDisplayProps) {
    const { selectedCompetitiveGroupKey, rsConfig } = useNavfitStore();
    // Removed internal useSummaryGroups call to prevent potential cycles


    // Determine Context
    const selectedGroup = useMemo(() => {
        if (!selectedCompetitiveGroupKey) return null;
        return summaryGroups.find(g => g.id === selectedCompetitiveGroupKey);
    }, [selectedCompetitiveGroupKey, summaryGroups]);

    // Calculate Stats based on Context
    const { currentRsca, projectedRsca, displayName, isContextActive } = useMemo(() => {
        // Base: Global Config
        const globalTarget = rsConfig.targetRsca || 4.20; // Default if not set

        if (selectedGroup) {
            // Group Specific Calculation
            // We want the Cumulative RSCA for the Rank (Paygrade), not just this specific group (e.g. Frocked).
            // This ensures Frocked O-3 and Regular O-3 show the same "O-3 Cumulative" score.

            let displayValue = 0;
            let displayLabel = selectedGroup.name;

            if (selectedGroup.paygrade) {
                displayValue = calculateCumulativeRSCA(summaryGroups, selectedGroup.paygrade);
                displayLabel = `${selectedGroup.paygrade} Cumulative Average`;
            } else {
                // Fallback if paygrade is missing (shouldn't happen with new logic)
                const groupSum = selectedGroup.reports.reduce((sum, r) => sum + (r.traitAverage || 0), 0);
                const groupCount = selectedGroup.reports.length;
                displayValue = groupCount > 0 ? groupSum / groupCount : 0;
            }

            return {
                currentRsca: globalTarget, // The benchmark
                projectedRsca: displayValue, // The Rank-wide performance against benchmark
                displayName: displayLabel,
                isContextActive: true
            };
        }

        return {
            currentRsca: defaultCurrentRsca ?? globalTarget,
            projectedRsca: defaultProjectedRsca ?? globalTarget, // No delta
            displayName: "Command Overview",
            isContextActive: false
        };
    }, [selectedGroup, rsConfig, defaultCurrentRsca, defaultProjectedRsca]);


    const delta = projectedRsca - currentRsca;
    const isPositive = delta > 0;
    const isNeutral = delta === 0;

    // Health Zones logic (generic for now)
    // < 3.60 = Green (Safe)
    // 3.60 - 4.10 = Yellow (Caution)
    // > 4.10 = Red (Danger/Limit)
    const getHealthColor = (val: number) => {
        if (val > 4.10) return 'text-red-600';
        if (val > 3.80) return 'text-amber-500';
        return 'text-emerald-600';
    };

    const getHealthBg = (val: number) => {
        if (val > 4.10) return 'bg-red-50';
        if (val > 3.80) return 'bg-amber-50';
        return 'bg-emerald-50';
    };

    const zoneCurrent = getHealthColor(currentRsca);
    const zoneProjected = getHealthColor(projectedRsca);
    const bgCurrent = getHealthBg(currentRsca);

    // Alerts
    const alerts = selectedGroup
        ? (projectedRsca > 4.20 ? [{ id: 'g-limit', type: 'warning', message: 'Group exceeds RSCA Target' }] as RscaAlert[] : [])
        : defaultAlerts;

    return (
        <div className="bg-white border-b border-slate-200 p-4 shadow-sm transition-all duration-300">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">

                {/* Main Stats Block */}
                <div className="flex items-center gap-8 flex-1">
                    {/* Icon Block */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${bgCurrent}`}>
                        <Activity className={`w-6 h-6 ${zoneCurrent}`} />
                    </div>

                    {/* Left Stat: Benchmark / Target */}
                    <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                            {isContextActive ? 'Target RSCA' : 'Command RSCA'}
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-3xl font-bold ${zoneCurrent}`}>{currentRsca.toFixed(2)}</span>
                            <span className="text-sm font-medium text-slate-400">/ 5.00</span>
                        </div>
                    </div>

                    {/* Arrow Divider */}
                    <div className="text-slate-300">
                        <ArrowRight className="w-5 h-5" />
                    </div>

                    {/* Right Stat: Actual / Projected */}
                    <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                            {isContextActive ? 'Group Average' : 'Proj. RSCA'}
                        </div>
                        <div className="flex items-baseline gap-3">
                            <span className={`text-3xl font-bold ${zoneProjected}`}>{projectedRsca.toFixed(2)}</span>

                            {/* Delta Indicator */}
                            {(isContextActive || !isNeutral) && (
                                <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-sm font-medium ${isPositive ? 'bg-red-100 text-red-700' :
                                    isNeutral ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                    {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> :
                                        isNeutral ? <Minus className="w-3.5 h-3.5" /> :
                                            <TrendingDown className="w-3.5 h-3.5" />}
                                    <span>{Math.abs(delta).toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Context Label */}
                    <div className="hidden lg:block pl-6 border-l border-slate-200 ml-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Context</div>
                        <div className={`text-sm font-semibold ${isContextActive ? 'text-indigo-600' : 'text-slate-600'}`}>
                            {displayName}
                        </div>
                    </div>

                </div>

                {/* Health Bar / Alerts Block - HIDDEN if No Context per User Request */}
                {isContextActive && (
                    <div className="flex-1 w-full md:max-w-md animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-slate-500">Group Health Zone</span>
                            {alerts.length > 0 && (
                                <span className="text-xs font-bold text-red-600 flex items-center gap-1 animate-pulse">
                                    ! {alerts.length} Critical Alert{alerts.length > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        {/* Visual Bar */}
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/60">
                            {/* Safe Zone (0 - 3.80) */}
                            <div className="absolute left-0 top-0 bottom-0 bg-emerald-500/20 border-r border-white/50 w-[76%] z-10" title="Safe Region"></div>
                            {/* Warning Zone (3.80 - 4.10) */}
                            <div className="absolute left-[76%] top-0 bottom-0 bg-amber-500/20 border-r border-white/50 w-[6%] z-10" title="Caution Region"></div>
                            {/* Danger Zone (> 4.10) */}
                            <div className="absolute left-[82%] top-0 bottom-0 bg-red-500/20 w-[18%] z-10" title="Danger Region"></div>

                            {/* Marker - Target/Global */}
                            <div
                                className="absolute top-0 bottom-0 w-1 bg-slate-400/50 z-10"
                                style={{ left: `${(currentRsca / 5.00) * 100}%` }}
                                title="Target RSCA"
                            ></div>

                            {/* Marker - Actual/Group */}
                            <div
                                className="absolute top-0 bottom-0 w-1.5 bg-indigo-600 z-20 shadow-[0_0_4px_rgba(79,70,229,0.4)] transition-all duration-500"
                                style={{ left: `${(projectedRsca / 5.00) * 100}%` }}
                                title="Group Average"
                            ></div>
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-mono">
                            <span>3.00</span>
                            <span>3.60</span>
                            <span>4.10</span>
                            <span>5.00</span>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
