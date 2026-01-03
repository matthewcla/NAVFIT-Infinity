import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { checkQuota } from '@/features/strategy/logic/validation';
import { clsx } from 'clsx';

interface QuotaHeadsUpDisplayProps {
    distribution: { EP: number; MP: number;[key: string]: number };
    totalReports: number;
}

export function QuotaHeadsUpDisplay({ distribution, totalReports }: QuotaHeadsUpDisplayProps) {

    // Calculate limits and validation state
    const validation = useMemo(() => {
        return checkQuota(totalReports, distribution.EP, distribution.MP);
    }, [totalReports, distribution.EP, distribution.MP]);

    const { epLimit, combinedLimit } = validation;

    const epUsed = distribution.EP || 0;
    const mpUsed = distribution.MP || 0;
    const combinedUsed = epUsed + mpUsed;



    // EP Status
    const epOver = epUsed > epLimit;
    const epFull = epUsed === epLimit;

    // Combined Status
    const combinedOver = combinedUsed > combinedLimit;
    const combinedFull = combinedUsed === combinedLimit;

    // MP Status (Indirectly controlled by Combined, but visualized for completeness)
    // There isn't a strict "MP Limit" alone, but MP contributes to Combined.
    // We display MP usage, but validation is mostly on Combined.

    return (
        <div className="flex items-center gap-2 h-full px-2">

            {/* EP Quota */}
            <div className="group relative flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border min-w-[80px] transition-colors hover:bg-white hover:shadow-md cursor-help"
                title={`Early Promote: ${epUsed} assigned of ${epLimit} allowed (20% rule)`}
            >
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">EP Limit</div>
                <div className={clsx(
                    "text-lg font-black leading-none font-mono",
                    epOver ? "text-red-600" : (epFull ? "text-emerald-600" : "text-slate-700")
                )}>
                    {epUsed}<span className="text-slate-300 text-sm font-normal mx-0.5">/</span>{epLimit}
                </div>
                {epOver && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />}
            </div>

            {/* MP Usage (Visual only, part of combined) */}
            <div className="group relative flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-slate-100 bg-slate-50/50 min-w-[70px]">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">MP Used</div>
                <div className="text-lg font-bold leading-none text-slate-600 font-mono">
                    {mpUsed}
                </div>
            </div>

            {/* Combined Quota */}
            <div className="group relative flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border min-w-[90px] transition-colors hover:bg-white hover:shadow-md cursor-help"
                title={`Combined (EP + MP): ${combinedUsed} assigned of ${combinedLimit} allowed (60% rule)`}
            >
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Combined</div>
                <div className={clsx(
                    "text-lg font-black leading-none font-mono",
                    combinedOver ? "text-red-600" : (combinedFull ? "text-indigo-600" : "text-slate-700")
                )}>
                    {combinedUsed}<span className="text-slate-300 text-sm font-normal mx-0.5">/</span>{combinedLimit}
                </div>
                {combinedOver && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />}
            </div>

            {/* Rule Info Icon (Hover Trigger) */}
            <div className="ml-1 text-slate-300 hover:text-indigo-500 transition-colors cursor-help" title="Quotas are calculated based on the total number of summary group reports. EP cannot exceed 20%. Combined EP & MP cannot exceed 60%.">
                <Info className="w-4 h-4" />
            </div>

        </div>
    );
}
