
import type { SummaryGroup } from '@/types';
import { optimizeGroup, type OptimizerConfig } from './rankOptimization';

/**
 * Propagates rank ordering to all future planned groups for a specific competitive group key.
 * 
 * @param plannedGroups List of ALL planned groups (sorted by date)
 * @param competitiveGroupKey The key to target (e.g. "O-3 URL Active")
 * @param globalRankOrder List of member IDs in prioritized rank order
 * @param config Optimization configuration (RSCA target, etc)
 * 
 * @returns Updated list of planned groups (new object references)
 */
export function propagateRankToFutureCycles(
    plannedGroups: SummaryGroup[],
    competitiveGroupKey: string,
    globalRankOrder: string[],
    config: OptimizerConfig
): SummaryGroup[] {

    // Filter to only groups matching the key and that are "Planned" (or Draft if we decide to auto-optimize active drafts)
    // For now, strictly "Planned" status groups + "Draft"?
    // The requirement is "End of Tour" planning, so we likely want to touch everything that hasn't been finalized.
    // Let's target status !== 'Final' && !== 'Submitted'.

    const targetGroups = plannedGroups.filter(g =>
        g.competitiveGroupKey === competitiveGroupKey &&
        g.status !== 'Final' &&
        g.status !== 'Submitted'
    );

    if (targetGroups.length === 0) return plannedGroups;

    // We only modify the target groups, others pass through
    const resultGroups = plannedGroups.map(group => {
        if (!targetGroups.find(t => t.id === group.id)) {
            return group;
        }

        // Apply Logic:
        // 1. Filter globalRankOrder to only include members present in THIS group.
        //    (Preserves relative order of the subset)

        const groupMemberIds = new Set(group.reports.map(r => r.memberId));
        const localRankOrder = globalRankOrder.filter(id => groupMemberIds.has(id));

        // Note: If a member is in the group but NOT in the global rank order (uncategorized?), 
        // they land at the bottom via optimizeGroup's sort logic.

        // 2. Run Optimization
        // Update the group's internal rankOrder persistence as well
        const optimizedReports = optimizeGroup(group, localRankOrder, config);

        return {
            ...group,
            reports: optimizedReports,
            rankOrder: localRankOrder, // Persist the snapshot
            metricConfig: {
                targetRsca: config.targetRsca,
                rscaMargin: config.rscaMargin
            }
        };
    });

    return resultGroups;
}
