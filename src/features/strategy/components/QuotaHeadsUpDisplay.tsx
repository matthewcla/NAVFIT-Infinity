import { useMemo } from 'react';
import type { SummaryGroup } from '@/types';
import { computeEpMax, computeMpMax, computeEpMpCombinedMax } from '@/domain/policy/quotas';
import { Paygrade, RankCategory } from '@/domain/policy/types';

interface QuotaHeadsUpDisplayProps {
    group: SummaryGroup;
}

export function QuotaHeadsUpDisplay({ group }: QuotaHeadsUpDisplayProps) {
    const quotaData = useMemo(() => {
        const reports = group.reports;
        const total = reports.length;
        const epUsed = reports.filter(r => r.promotionRecommendation === 'EP').length;
        const mpUsed = reports.filter(r => r.promotionRecommendation === 'MP').length;
        const combinedUsed = epUsed + mpUsed;

        // Construct context for quota calculation
        // Need to map UI types to Domain types
        const paygrade = (group.paygrade?.replace('-', '') || 'O1') as Paygrade; // Fallback?
        const isLDO = (group.designator || '').startsWith('6'); // Simple heuristic matching validation.ts

        // Context object
        const context = {
            size: total,
            paygrade,
            rankCategory: paygrade.startsWith('W') ? RankCategory.WARRANT : paygrade.startsWith('E') ? RankCategory.ENLISTED : RankCategory.OFFICER,
            isLDO,
            isCWO: (group.designator || '').startsWith('7') || (group.designator || '').startsWith('8')
        };

        const epMax = computeEpMax(total, context);
        const mpMax = computeMpMax(total, context, epUsed);
        const combinedMax = computeEpMpCombinedMax(total, context);

        return {
            epUsed,
            epMax,
            mpUsed,
            mpMax,
            combinedUsed,
            combinedMax
        };
    }, [group]);

    const { epUsed, epMax, mpUsed, mpMax, combinedUsed, combinedMax } = quotaData;

    // Helper to determine status color
    const getStatusColor = (used: number, max: number, type: 'EP' | 'MP' | 'Combined') => {
        if (used > max) return 'text-red-600 bg-red-50 border-red-200';
        if (used === max) return type === 'EP' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-yellow-700 bg-yellow-50 border-yellow-200';
        return 'text-slate-600 bg-slate-50 border-slate-200';
    };

    const renderMetric = (label: string, used: number, max: number, type: 'EP' | 'MP' | 'Combined') => (
        <div className="flex flex-col items-center gap-1 min-w-[60px]">
            <span className={`text-xl font-bold leading-none ${used > max ? 'text-red-600' : 'text-slate-700'}`}>
                {used}<span className="text-slate-400 text-sm font-normal">/{max}</span>
            </span>
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold border uppercase tracking-wider shadow-sm ${getStatusColor(used, max, type)}`}>
                {label}
            </div>
        </div>
    );

    return (
        <div className="flex items-center justify-around h-full px-4 bg-white/95 backdrop-blur-sm transition-all duration-300">
            {renderMetric('EP', epUsed, epMax, 'EP')}
            {renderMetric('MP', mpUsed, mpMax, 'MP')}

            {/* Divider */}
            <div className="h-8 w-px bg-slate-200" />

            {renderMetric('EP + MP', combinedUsed, combinedMax, 'Combined')}
        </div>
    );
}
