import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { checkQuota } from '@/features/strategy/logic/validation';
import { clsx } from 'clsx';
import type { SummaryGroupContext } from '@/domain/policy/types';

interface QuotaHeadsUpDisplayProps {
    distribution: { EP: number; MP: number;[key: string]: number };
    totalReports: number;
    context: SummaryGroupContext;
    variant?: 'standard' | 'full-width' | 'minimal';
}

export function QuotaHeadsUpDisplay({ distribution, totalReports, context, variant = 'standard' }: QuotaHeadsUpDisplayProps) {

    // Calculate limits and validation state
    const validation = useMemo(() => {
        // Ensure context size matches totalReports if not already synced, though context usually comes from group
        const effectiveContext = { ...context, size: totalReports };
        return checkQuota(effectiveContext, distribution.EP, distribution.MP);
    }, [totalReports, distribution.EP, distribution.MP, context]);

    const { epLimit, combinedLimit } = validation;

    const epUsed = distribution.EP || 0;
    const mpUsed = distribution.MP || 0;
    // const combinedUsed = epUsed + mpUsed; // Unused in new logic directly, but useful for validation

    // Dynamic Limits
    const dynamicMpLimit = Math.max(0, combinedLimit - epUsed);



    // --- Helper for Efficiency Status Colors & Progress ---
    const getQuotaStatus = (used: number, limit: number) => {
        // Special case for unlimited or zero-limit edge cases?
        // If limit is 0, any usage is OVER.
        if (limit === 0) {
            if (used === 0) return { color: 'bg-slate-100 text-slate-400', barInfo: 'bg-slate-200', percent: 0, status: 'Empty' };
            return { color: 'bg-red-100 text-red-700 border-red-200', barInfo: 'bg-red-500', percent: 100, status: 'Over' };
        }

        const percent = Math.min(100, (used / limit) * 100);

        if (used > limit) {
            return {
                color: 'bg-red-100 text-red-700 border-red-200',
                barInfo: 'bg-red-500',
                percent: 100, // Visual cap
                status: 'Over'
            };
        }
        if (used === limit) {
            return {
                color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                barInfo: 'bg-emerald-500',
                percent: 100,
                status: 'Maximized'
            };
        }
        // Used < Limit -> Warning (Unused Quota)
        return {
            color: 'bg-amber-100 text-amber-800 border-amber-200',
            barInfo: 'bg-amber-500',
            percent: percent, // Show actual fill
            status: 'Under'
        };
    };

    const epStatus = getQuotaStatus(epUsed, epLimit);
    const mpStatus = getQuotaStatus(mpUsed, dynamicMpLimit);

    // --- Render Logic ---

    // MINIMAL VARIANT (Overlay Style)
    if (variant === 'minimal') {
        const ScoreItem = ({ label, used, limit, status }: { label: string, used: number, limit?: number, status?: any }) => (
            <div className="flex items-baseline gap-1.5 text-xs">
                <span className={clsx("font-bold tracking-wide",
                    status?.status === 'Over' ? "text-red-600" :
                        status?.status === 'Maximized' ? "text-emerald-600" : "text-slate-500"
                )}>
                    {label}
                </span>
                <span className="font-mono font-medium text-slate-700">
                    <span className={clsx(status?.status === 'Over' && "text-red-600 font-bold")}>{used}</span>
                    {limit !== undefined && <span className="text-slate-400">/{limit}</span>}
                </span>
            </div>
        );

        return (
            <div className="flex items-center gap-4 select-none">
                {/* EP */}
                <ScoreItem label="EP" used={epUsed} limit={epLimit} status={epStatus} />
                <div className="w-px h-3 bg-slate-200" />
                {/* MP */}
                <ScoreItem label="MP" used={mpUsed} limit={dynamicMpLimit} status={mpStatus} />
                <div className="w-px h-3 bg-slate-200" />
                {/* P */}
                <ScoreItem label="P" used={distribution.P || 0} />

                {/* Exceptions if present */}
                {(distribution.PR || 0) > 0 && (
                    <>
                        <div className="w-px h-3 bg-slate-200" />
                        <ScoreItem label="PR" used={distribution.PR} />
                    </>
                )}
                {(distribution.SP || 0) > 0 && (
                    <>
                        <div className="w-px h-3 bg-slate-200" />
                        <ScoreItem label="SP" used={distribution.SP} />
                    </>
                )}
            </div>
        );
    }

    // FULL WIDTH VARIANT (Footer Style)
    if (variant === 'full-width') {
        return (
            <div className="flex items-center h-full px-6 gap-8">
                {/* 1. Restricted Quotas (Progress Bars) */}
                <div className="flex-1 flex gap-6">
                    {/* EP Widget */}
                    <div className="flex-1 flex flex-col justify-center gap-1.5">
                        <div className="flex justify-between items-end text-xs">
                            <span className="font-bold text-slate-700">Early Promote (EP)</span>
                            <span className={clsx("font-mono font-bold", epStatus.color.split(' ')[1])}>
                                {epUsed} <span className="text-slate-400 font-normal">/ {epLimit}</span>
                            </span>
                        </div>
                        {/* Progress Bar Track */}
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
                            {/* Fill */}
                            <div
                                className={clsx("h-full transition-all duration-500 ease-out rounded-full", epStatus.barInfo)}
                                style={{ width: `${epStatus.percent}%` }}
                            />
                        </div>
                    </div>

                    {/* MP Widget */}
                    <div className="flex-1 flex flex-col justify-center gap-1.5">
                        <div className="flex justify-between items-end text-xs">
                            <span className="font-bold text-slate-700">Must Promote (MP)</span>
                            <span className={clsx("font-mono font-bold", mpStatus.color.split(' ')[1])}>
                                {mpUsed} <span className="text-slate-400 font-normal">/ {dynamicMpLimit}</span>
                            </span>
                        </div>
                        {/* Progress Bar Track */}
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
                            {/* Fill */}
                            <div
                                className={clsx("h-full transition-all duration-500 ease-out rounded-full", mpStatus.barInfo)}
                                style={{ width: `${mpStatus.percent}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-10 w-px bg-slate-200" />

                {/* 2. Unrestricted Counts (Badges) */}
                <div className="flex items-center gap-3">
                    {/* P */}
                    <div className="flex flex-col items-center">
                        <span className="text-xl font-bold text-slate-600 leading-none">{distribution.P || 0}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Promotable</span>
                    </div>
                    {/* Others (Grouped if needed, or simple list) */}
                    {(distribution.PR || 0) > 0 && (
                        <div className="flex flex-col items-center ml-2">
                            <span className="text-xl font-bold text-orange-600 leading-none">{distribution.PR}</span>
                            <span className="text-[10px] font-bold text-orange-400 uppercase">Progressing</span>
                        </div>
                    )}
                    {(distribution.SP || 0) > 0 && (
                        <div className="flex flex-col items-center ml-2">
                            <span className="text-xl font-bold text-red-600 leading-none">{distribution.SP}</span>
                            <span className="text-[10px] font-bold text-red-400 uppercase">Significant</span>
                        </div>
                    )}
                </div>

                {/* Info Icon */}
                <div className="ml-auto text-slate-300 hover:text-indigo-500 transition-colors cursor-help" title="Quotas are calculated based on group size and paygrade policy.">
                    <Info className="w-4 h-4" />
                </div>
            </div>
        );
    }

    // STANDARD VARIANT (Fallback / Original Card Style)
    // Simply wrapping the original logic for compatibility if needed, using the new shared 'status' logic could be an upgrade,
    // but sticking to the requested "Efficiency Gauge" mostly applies to the new layout.
    // Converting the Standard view to use similar coloring for consistency.

    const scoreboard = [
        { label: 'SP', count: `${distribution.SP || 0}`, color: 'bg-red-100 text-red-800 border-red-200' },
        { label: 'PR', count: `${distribution.PR || 0}`, color: 'bg-orange-100 text-orange-800 border-orange-200' },
        { label: 'P', count: `${distribution.P || 0}`, color: 'bg-slate-100 text-slate-700 border-slate-200' },
        {
            label: 'MP',
            count: `${distribution.MP || 0} / ${dynamicMpLimit}`,
            color: mpStatus.color
        },
        {
            label: 'EP',
            count: `${distribution.EP || 0} / ${epLimit}`,
            color: epStatus.color
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
                            // Text color overrides based on status provided by new logic colors
                            item.color.includes('text-red') ? "text-red-700" : "text-slate-700"
                        )}>
                            {item.count}
                        </span>
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.color} shadow-sm min-w-[30px] text-center`}>
                            {item.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Rule Info Icon */}
            <div className="absolute top-2 right-2 text-slate-300 hover:text-indigo-500 transition-colors cursor-help" title="Quotas are calculated based on group size and paygrade policy.">
                <Info className="w-4 h-4" />
            </div>

        </div>
    );
}
