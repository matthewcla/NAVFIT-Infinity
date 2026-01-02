import { ArrowRight, TrendingDown, TrendingUp, Minus, Activity } from 'lucide-react';

interface RscaHeadsUpDisplayProps {
    currentRsca: number;
    projectedRsca: number;
    eotRsca?: number; // New EOT Metric
    rankLabel?: string;
    showSuffix?: boolean;
}

export function RscaHeadsUpDisplay({
    currentRsca,
    projectedRsca,
    eotRsca,
    rankLabel,
    showSuffix = true
}: RscaHeadsUpDisplayProps) {
    const delta = projectedRsca - currentRsca;
    const isPositive = delta > 0;
    const isNeutral = delta === 0;

    // Health Zones Logic
    // < 3.60 = Green (Safe)
    // 3.60 - 4.10 = Yellow (Caution)
    // > 4.10 = Red (Danger/Limit)
    const getHealthColor = (val: number) => {
        if (val > 4.10) return 'text-red-600';
        if (val > 3.80) return 'text-amber-500';
        return 'text-emerald-600';
    };

    // EOT Specific Color Logic
    const getEotColor = (val?: number) => {
        if (!val) return 'text-slate-400';
        if (val >= 4.20) return 'text-red-600';
        if (val >= 4.10) return 'text-amber-500';
        return 'text-emerald-600';
    };

    const zoneCurrent = getHealthColor(currentRsca);
    const zoneProjected = getHealthColor(projectedRsca);
    const zoneEot = getEotColor(eotRsca);

    // Background tint based on current health
    const bgCurrent = currentRsca > 4.10 ? 'bg-red-50' : currentRsca > 3.80 ? 'bg-amber-50' : 'bg-emerald-50';

    return (
        <div className="bg-white/95 backdrop-blur-sm p-4 transition-all duration-300">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">

                {/* Main Stats Block */}
                <div className="flex items-center gap-8 flex-1">
                    {/* Icon Block */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${bgCurrent}`}>
                        <Activity className={`w-6 h-6 ${zoneCurrent}`} />
                    </div>

                    {/* Left Stat: Benchmark / Target */}
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                {rankLabel || 'Target RSCA'}
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-3xl font-bold ${zoneCurrent}`}>{currentRsca.toFixed(2)}</span>
                            {showSuffix && <span className="text-sm font-medium text-slate-400">/ 5.00</span>}
                        </div>
                    </div>

                    {/* Arrow Divider */}
                    <div className="text-slate-300">
                        <ArrowRight className="w-5 h-5" />
                    </div>

                    {/* Middle Stat: Actual / Projected */}
                    <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                            Proj. RSCA
                        </div>
                        <div className="flex items-baseline gap-3">
                            <span className={`text-3xl font-bold ${zoneProjected}`}>{projectedRsca.toFixed(2)}</span>
                            {showSuffix && <span className="text-sm font-medium text-slate-400">/ 5.00</span>}

                            {/* Delta Indicator */}
                            {!isNeutral && (
                                <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-sm font-medium ${isPositive ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                    {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                    <span>{Math.abs(delta).toFixed(2)}</span>
                                </div>
                            )}
                            {isNeutral && (
                                <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-sm font-medium bg-slate-100 text-slate-600">
                                    <Minus className="w-3.5 h-3.5" />
                                    <span>0.00</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* EOT RSCA Metric (New) */}
                    {eotRsca !== undefined && (
                        <>
                            {/* Arrow Divider */}
                            <div className="text-slate-300">
                                <ArrowRight className="w-5 h-5" />
                            </div>

                            <div>
                                <div className="flex items-center gap-1.5 mb-0.5" title="Estimated RSCA at end of tour based on projected progression.">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        EOT RSCA
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-3xl font-bold ${zoneEot}`}>{eotRsca.toFixed(2)}</span>
                                    {showSuffix && <span className="text-sm font-medium text-slate-400">/ 5.00</span>}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
