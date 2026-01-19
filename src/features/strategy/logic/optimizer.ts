import type { SummaryGroup } from '@/types';

/**
 * Interface for a point on the optimization trajectory
 */
export interface TrajectoryPoint {
    date: number;         // Timestamp
    rsca: number;         // The cumulative RSCA at this point
    target: number;       // The target limit
    margin: number;       // Limit - RSCA
    groupName: string;    // Name of the group causing this data point
    groupId: string;      // ID for navigation
    compKey: string;      // Competitive key
    isProjected: boolean; // True if this is a future/optimized point
    optimalMta: number;   // The suggested MTA for this cycle
    memberCount: number;
}

/**
 * Calculates the Optimized Trajectory.
 * 
 * Algorithm: "Water Level / Greedy Fill"
 * 1. Establish the "Baseline" (Current RSCA from finalized reports).
 * 2. Sort all groups chronologically.
 * 3. Walk through time. 
 *    - If group is Final/Submitted: Use actual data. Update running RSCA.
 *    - If group is Future (Draft/Planning): Calculate the MAX possible MTA 
 *      that keeps Cumulative RSCA <= Target Limit.
 * 
 * @param roster - Full roster (needed for member counts/details if we get granular)
 * @param summaryGroups - All groups for this Competitive Category
 * @param targetRsca - The ceiling (e.g. 3.60)
 */
export const calculateOptimizedTrajectory = (
    summaryGroups: SummaryGroup[],
    targetRsca: number = 4.20
): TrajectoryPoint[] => {

    // 1. Sort Groups by End Date
    const sortedGroups = [...summaryGroups].sort((a, b) =>
        new Date(a.periodEndDate).getTime() - new Date(b.periodEndDate).getTime()
    );

    const trajectory: TrajectoryPoint[] = [];

    // Running Totals
    let accumulatedScore = 0;
    let accumulatedCount = 0;

    // Helper to snap score to 2 decimals
    const round2 = (num: number) => Math.round(num * 100) / 100;

    for (const group of sortedGroups) {
        const status = group.status || 'Draft';
        const isFinal = ['Final', 'Submitted', 'Review'].includes(status);
        const date = new Date(group.periodEndDate).getTime();

        // Count reports in this group (rough estimate if Draft, exact if Final)
        // For Draft, we assume all attached members get a report.
        const reportCount = group.reports.length;

        if (reportCount === 0) continue; // Skip empty groups

        let groupTotalScore = 0;
        let optimalMta = 0;

        if (isFinal) {
            // --- HISTORICAL DATA ---
            // Just sum it up
            group.reports.forEach(r => {
                if (r.traitAverage > 0) {
                    groupTotalScore += r.traitAverage;
                }
            });
            optimalMta = round2(groupTotalScore / reportCount);

            // Update Running Totals
            accumulatedScore += groupTotalScore;
            accumulatedCount += reportCount;

        } else {
            // --- OPTIMIZATION ENGINE ---
            // We want to find X (average MTA for this group) such that:
            // (CurrentSum + (X * Count)) / (CurrentCount + Count) <= Target

            // Formula:
            // (S + X*N) / (C + N) = T
            // S + X*N = T * (C + N)
            // X*N = T*(C+N) - S
            // X = (T*(C+N) - S) / N

            const nextTotalCount = accumulatedCount + reportCount;
            const maxAllowedGlobalScore = targetRsca * nextTotalCount;
            const maxAllowedGroupTotalScore = maxAllowedGlobalScore - accumulatedScore;

            // Calculate Maximum Average for this group
            let calculatedMta = maxAllowedGroupTotalScore / reportCount;

            // Cap at 5.0 (Physics Limit)
            if (calculatedMta > 5.0) calculatedMta = 5.0;

            // Floor at 0.0 (Physics Limit) - though ideally we don't plan for 0.
            // Let's Floor at a "Minimum Credible Score" like 3.0 if logic allows, 
            // but if we are already busted, this might go overflow negative.
            // If calculatedMta < 0, it means we are ALREADY over budget and even a 0.0 won't save us.
            // Ideally we show the breakdown.

            optimalMta = round2(calculatedMta);
            groupTotalScore = optimalMta * reportCount;

            // Update Running Totals (Simulating that we executed this plan)
            accumulatedScore += groupTotalScore;
            accumulatedCount += nextTotalCount;
        }

        // Calculate the Resulting Cumulative RSCA at this waypoint
        const currentCumulative = accumulatedCount > 0 ? round2(accumulatedScore / accumulatedCount) : 0;

        trajectory.push({
            date: date,
            rsca: currentCumulative,
            target: targetRsca,
            margin: round2(targetRsca - currentCumulative),
            groupName: group.name || group.competitiveGroupKey,
            groupId: group.id,
            compKey: group.competitiveGroupKey,
            isProjected: !isFinal,
            optimalMta: optimalMta,
            memberCount: reportCount
        });
    }

    return trajectory;
};

/**
 * Analyzes a calculated trajectory to determine its risk profile.
 */
export const analyzeGroupRisk = (trajectory: TrajectoryPoint[]) => {
    if (trajectory.length === 0) {
        return {
            minMargin: 0,
            currentRsca: 0,
            projectedRsca: 0,
            isCritical: false,
            lastPoint: null
        };
    }

    // Sort by date to be sure
    const sorted = [...trajectory].sort((a, b) => a.date - b.date);
    const lastPoint = sorted[sorted.length - 1];

    // Find the minimum margin across the entire future trajectory (Low Point)
    const margins = sorted.map(p => p.margin);
    const minMargin = Math.min(...margins);

    // Critical if any point dips below 0 (or close to it)
    const isCritical = minMargin < 0;

    return {
        minMargin,
        currentRsca: lastPoint.rsca, // This might be projected if we are in future
        projectedRsca: lastPoint.rsca,
        target: lastPoint.target,
        isCritical,
        lastPoint
    };
};
