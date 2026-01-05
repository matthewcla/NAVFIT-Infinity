import { Activity } from 'lucide-react';

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
    // showSuffix (unused)
}: RscaHeadsUpDisplayProps) {
    const delta = projectedRsca - currentRsca;
    const isPositive = delta > 0;

    // Health Zones Logic
    const getHealthColor = (val: number) => {
        if (val > 4.10) return 'text-red-600';
        if (val > 3.80) return 'text-amber-500';
        return 'text-emerald-600';
    };

    // Delta Color Logic - distinct from Health. 
    // Positive delta (increasing score) is generally "good" for the individual in many contexts, 
    // but in RSCA management, keeping average low might be the goal? 
    // Actually, usually higher trait average is "better" for the sailor, but might be "riskier" for the RSCA.
    // Let's stick to standard: Green = Up/Positive, Red = Down/Negative (or vice versa if directed). 
    // User asked for "Impact" color coded.
    // If RSCA goes UP, that inflates the average. 
    // Standard UI convention: Green = Improvement (Higher Score), Red = Decline. 
    // However, for "Risk", Higher is bad. 
    // Let's assume Green = + (Up), Red = - (Down) for now unless Context implies otherwise.
    // Actually, checking previous code:
    // isPositive ? 'bg-red-100 text-red-700' (Up is Red?)
    // Ah, previous code: `isPositive ? ... : ...`
    // Let's check previous snippet: 
    // `{isPositive ? <TrendingUp ... /> : ...}` and class was `isPositive ? 'bg-red-100 text-red-700' : 'bg-emerald-100...'`
    // So YES, going UP is RED (Bad/Risk increase). Going DOWN is GREEN (Good/Risk decrease).
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

    // Background tint based on current health
    const bgCurrent = currentRsca > 4.10 ? 'bg-red-50' : currentRsca > 3.80 ? 'bg-amber-50' : 'bg-emerald-50';

    return (
        <div className="bg-white/95 backdrop-blur-sm p-3 h-full transition-all duration-300 flex items-center">
            <div className="flex items-center w-full gap-2">

                {/* Icon Block */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300 ${bgCurrent} mr-2`}>
                    <Activity className={`w-5 h-5 ${zoneCurrent}`} />
                </div>

                {/* Stats Grid - Even Distribution */}
                <div className="grid grid-cols-3 gap-4 flex-1 items-center text-center">

                    {/* 1. Left Stat: Current */}
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                            {rankLabel || 'Curr. RSCA'}
                        </span>
                        <div className="flex items-baseline leading-none">
                            <span className={`text-2xl font-bold ${zoneCurrent}`}>{currentRsca.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Arrow Divider (Visual only, maybe minimal or removed to save space/cleanliness) 
                        User asked to "evenly distribute". Arrows might clutter if space is tight.
                        Let's put small arrows between cols? 
                         actually grid gap handles spacing. 
                         Let's try just the stats per user request "evenly distribute ... values". 
                    */}

                    {/* 2. Middle Stat: Projected */}
                    <div className="flex flex-col items-center relative">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                            Proj. RSCA
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

                    {/* 3. Right Stat: EOT */}
                    {eotRsca !== undefined ? (
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                                EOT RSCA
                            </span>
                            <div className="flex items-baseline leading-none">
                                <span className={`text-2xl font-bold ${zoneEot}`}>{eotRsca.toFixed(2)}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center opacity-30">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                                EOT RSCA
                            </span>
                            <span className="text-xl font-bold text-slate-300">--.--</span>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
