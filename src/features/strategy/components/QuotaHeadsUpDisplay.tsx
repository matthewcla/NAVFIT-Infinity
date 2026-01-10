import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { checkQuota } from '@/features/strategy/logic/validation';
import { clsx } from 'clsx';
import type { SummaryGroupContext } from '@/domain/policy/types';

interface QuotaHeadsUpDisplayProps {
    distribution: { EP: number; MP: number;[key: string]: number };
    totalReports: number;
    context: SummaryGroupContext;
}

export function QuotaHeadsUpDisplay({ distribution, totalReports, context }: QuotaHeadsUpDisplayProps) {

    // Calculate limits and validation state
    const validation = useMemo(() => {
        // Ensure context size matches totalReports if not already synced, though context usually comes from group
        const effectiveContext = { ...context, size: totalReports };
        return checkQuota(effectiveContext, distribution.EP, distribution.MP);
    }, [totalReports, distribution.EP, distribution.MP, context]);

    const { epLimit, combinedLimit } = validation;

    const epUsed = distribution.EP || 0;
    const mpUsed = distribution.MP || 0;
    const combinedUsed = epUsed + mpUsed;

    // EP Status
    const epOver = epUsed > epLimit;

    // Combined Status
    const combinedOver = combinedUsed > combinedLimit;

    // MP Status (Indirectly controlled by Combined, but visualized for completeness)
    // There isn't a strict "MP Limit" alone, but MP contributes to Combined.
    // We display MP usage, but validation is mostly on Combined.

    // Dynamic Limits
    const dynamicMpLimit = Math.max(0, combinedLimit - epUsed);

    // Scoreboard Data
    const scoreboard = [
        { label: 'SP', count: `${distribution.SP || 0}`, color: 'bg-red-100 text-red-800 border-red-200' },
        { label: 'PR', count: `${distribution.PR || 0}`, color: 'bg-orange-100 text-orange-800 border-orange-200' },
        { label: 'P', count: `${distribution.P || 0}`, color: 'bg-slate-100 text-slate-700 border-slate-200' },
        {
            label: 'MP',
            count: `${distribution.MP || 0} / ${dynamicMpLimit}`,
            // MP Color Logic: Warning if combined over, else Amber style
            color: 'bg-amber-100 text-amber-800 border-amber-200'
        },
        {
            label: 'EP',
            count: `${distribution.EP || 0} / ${epLimit}`,
            // EP Color Logic: Red if over, Green if full, else Standard Emerald
            color: 'bg-emerald-100 text-emerald-800 border-emerald-200'
        },
    ];

    return (
        <div className="flex items-center justify-center gap-4 h-full px-6 relative">

            {/* Label */}
            <div className="absolute top-1 left-0 right-0 text-center text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Scoreboard
            </div>

            {/* Scoreboard */}
            <div className="flex items-center justify-between w-full gap-2 pt-8">
                {scoreboard.map((item) => (
                    <div key={item.label} className="flex flex-col items-center gap-2">
                        <span className={clsx("text-xl font-bold leading-none",
                            // Optional: Text color overrides for errors
                            (item.label === 'EP' && epOver) || (item.label === 'MP' && combinedOver) ? "text-red-700" : "text-slate-700"
                        )}>
                            {item.count}
                        </span>
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.color} shadow-sm min-w-[30px] text-center`}>
                            {item.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Rule Info Icon (Absolute Right or inline if preferred, keeping simple layout) */}
            <div className="absolute top-2 right-2 text-slate-300 hover:text-indigo-500 transition-colors cursor-help" title="Quotas are calculated based on group size and paygrade policy.">
                <Info className="w-4 h-4" />
            </div>

        </div>
    );
}
