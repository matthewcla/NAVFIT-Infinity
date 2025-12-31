import { ArrowRight, TrendingDown, TrendingUp, Minus, Activity } from 'lucide-react';

interface RscaHeadsUpDisplayProps {
    currentRsca: number;
    projectedRsca: number;
    rankLabel?: string;
}

export function RscaHeadsUpDisplay({ currentRsca, projectedRsca, rankLabel }: RscaHeadsUpDisplayProps) {
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

    const zoneCurrent = getHealthColor(currentRsca);
    const zoneProjected = getHealthColor(projectedRsca);
    const bgCurrent = currentRsca > 4.10 ? 'bg-red-50' : currentRsca > 3.80 ? 'bg-amber-50' : 'bg-emerald-50';

    return (
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 p-4 shadow-sm transition-all duration-300">
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
                            {rankLabel || 'Target RSCA'}
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
                            Proj. RSCA
                        </div>
                        <div className="flex items-baseline gap-3">
                            <span className={`text-3xl font-bold ${zoneProjected}`}>{projectedRsca.toFixed(2)}</span>

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
                </div>

                {/* Health Bar Visualization */}
                <div className="flex-1 w-full md:max-w-md hidden md:block">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500">Group Health Zone</span>
                    </div>
                    {/* Visual Bar */}
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/60">
                        {/* Safe Zone (0 - 3.80) */}
                        <div className="absolute left-0 top-0 bottom-0 bg-emerald-500/20 border-r border-white/50 w-[76%] z-10" title="Safe Region"></div>
                        {/* Warning Zone (3.80 - 4.10) */}
                        <div className="absolute left-[76%] top-0 bottom-0 bg-amber-500/20 border-r border-white/50 w-[6%] z-10" title="Caution Region"></div>
                        {/* Danger Zone (> 4.10) */}
                        <div className="absolute left-[82%] top-0 bottom-0 bg-red-500/20 w-[18%] z-10" title="Danger Region"></div>

                        {/* Marker - Target */}
                        <div
                            className="absolute top-0 bottom-0 w-1 bg-slate-400/50 z-10"
                            style={{ left: `${(currentRsca / 5.00) * 100}%` }}
                            title="Target RSCA"
                        ></div>

                        {/* Marker - Actual */}
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
            </div>
        </div>
    );
}
