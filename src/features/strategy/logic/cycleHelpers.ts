import type { SummaryGroup } from '@/types';
import { getCompetitiveGroupStats } from '@/features/strategy/logic/rsca';

/**
 * Calculates the RSCA impact of adding/modifying a summary group.
 * @param group The summary group to calculate impact for
 * @param summaryGroups All summary groups to compare against
 */
export const calculateImpact = (group: SummaryGroup, summaryGroups: SummaryGroup[]) => {
    const rank = group.paygrade || (group.competitiveGroupKey ? group.competitiveGroupKey.split(' ')[0] : null);
    if (!rank) return 0.00;

    // Baseline: All *other* groups for this rank
    const stats = getCompetitiveGroupStats(summaryGroups, rank, group.id);
    const baselineAvg = stats.average;

    // This Group Stats
    let groupTotal = 0;
    let groupCount = 0;
    group.reports.forEach(r => {
        const mta = r.traitAverage || 0;
        if (mta > 0) {
            groupTotal += mta;
            groupCount++;
        }
    });

    if (groupCount === 0) return 0.00;

    // Projected Cumulative if this group is added
    const newTotal = stats.totalScore + groupTotal;
    const newCount = stats.count + groupCount;

    // If baseline is 0 (first group), the impact is effectively the distance from "neutral" or 0,
    // but typically we show 0 impact if it defines the average or just show deviation from 3.0?
    // Let's stick to 0.00 if it's the only group.
    if (stats.count === 0) return 0.00;

    const newAvg = newTotal / newCount;
    return newAvg - baselineAvg;
};

/**
 * Determines the report type based on the group name string.
 * @param name Name of the summary group
 */
export const getReportType = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('periodic')) return 'Periodic';
    if (n.includes('detachment of rs') || n.includes('det. of rs') || n.includes('dors')) return 'RS Det.';
    if (n.includes('detachment of individual') || n.includes('doi')) return 'Ind Det.';
    if (n.includes('special')) return 'Special';
    if (n.includes('detachment')) return 'Ind Det.'; // Default detachment 
    return 'Periodic'; // Default
};
