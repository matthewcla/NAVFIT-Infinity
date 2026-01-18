import { ArrowRight } from 'lucide-react';

interface RscaHeadsUpDisplayProps {
    currentRsca: number;
    projectedRsca: number;
    eotRsca?: number; // New EOT Metric
    // rankLabel (unused removed)
    showSuffix?: boolean;
    variant?: 'standard' | 'integrated';
}

export function RscaHeadsUpDisplay({
    currentRsca,
    projectedRsca,
    eotRsca,
    // rankLabel (unused removed)
    // showSuffix (unused)
    variant = 'standard'
}: RscaHeadsUpDisplayProps) {
    const delta = projectedRsca - currentRsca;
    const isPositive = delta > 0;

    // Health Zones Logic
    const getHealthColor = (val: number) => {
        if (val > 4.10) return 'text-red-600';
        if (val > 3.80) return 'text-amber-500';
        return 'text-emerald-600';
    };

    const deltaColor = isPositive ? 'text-red-600' : 'text-emerald-600';

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

    if (variant === 'integrated') {
        return (
            <div className="flex items-center gap-4">
                {/* Compact View: Projected is King */}
                <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">Projected RSCA</span>
                    <div className="flex items-baseline gap-1 leading-none">
                        <span className={`text-2xl font-bold ${zoneProjected}`}>{projectedRsca.toFixed(2)}</span>
                        {Math.abs(delta) >= 0.01 && (
                            <span className={`text-xs font-bold ${deltaColor}`}>
                                {isPositive ? '+' : ''}{delta.toFixed(2)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-slate-200" />

                {/* Secondary Metrics */}
                <div className="flex gap-4">
                    <div className="flex flex-col items-start">
                        <span className="text-[9px] uppercase font-bold text-slate-400 leading-none mb-1">Current</span>
                        <span className={`text-sm font-bold ${zoneCurrent}`}>{currentRsca.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-[9px] uppercase font-bold text-slate-400 leading-none mb-1">EOT</span>
                        <span className={`text-sm font-bold ${eotRsca ? zoneEot : 'text-slate-300'}`}>
                            {eotRsca ? eotRsca.toFixed(2) : '--.--'}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // Standard Layout (Preserved for backwards compatibility if needed elsewhere, though mainly replaced in this view)
    return (
        <div className="bg-white/95 backdrop-blur-sm p-3 h-full transition-all duration-300 flex items-center relative">
            {/* Title Overlay */}
            <div className="absolute top-1 left-0 right-0 text-center text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                RSCA Benchmark
            </div>

            <div className="flex items-center w-full gap-2 pt-8">


                {/* Stats Grid - Flex Distribution */}
                <div className="flex flex-1 items-center justify-between px-2">

                    {/* 1. Left Stat: Current */}
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                            Current
                        </span>
                        <div className="flex items-baseline leading-none">
                            <span className={`text-2xl font-bold ${zoneCurrent}`}>{currentRsca.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Arrow 1 */}
                    <div className="flex items-center justify-center text-slate-300">
                        <ArrowRight className="w-4 h-4" />
                    </div>

                    {/* 2. Middle Stat: Projected */}
                    <div className="flex flex-col items-center relative">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                            Projected
                        </span>
                        <div className="flex items-baseline relative leading-none">
                            <span className={`text-2xl font-bold ${zoneProjected}`}>{projectedRsca.toFixed(2)}</span>
                            {/* Subscript Delta */}
                            {Math.abs(delta) >= 0.01 && (
                                <sub className={`absolute -right-8 bottom-0.5 text-[10px] font-bold ${deltaColor} flex items-center`}>
                                    {isPositive ? '+' : ''}{delta.toFixed(2)}
                                </sub>
                            )}
                        </div>
                    </div>

                    {/* Arrow 2 */}
                    <div className="flex items-center justify-center text-slate-300">
                        <ArrowRight className="w-4 h-4" />
                    </div>

                    {/* 3. Right Stat: EOT */}
                    {eotRsca !== undefined ? (
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                                End of Tour
                            </span>
                            <div className="flex items-baseline leading-none">
                                <span className={`text-2xl font-bold ${zoneEot}`}>{eotRsca.toFixed(2)}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center opacity-30">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                                End of Tour
                            </span>
                            <span className="text-xl font-bold text-slate-300">--.--</span>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
