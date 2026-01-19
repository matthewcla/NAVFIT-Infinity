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

/**
 * Distributes a target Group Average MTA across a list of members based on their Rank.
 * Assumes reports are already sorted by Rank (Index 0 = Rank 1).
 * 
 * Algorithm: "Stepped Slope"
 * 1. Determine Quota Buckets (EPs, MPs).
 * 2. Assign Base Values: EP = Avg + Step, MP = Avg, P = Avg - Step.
 * 3. Calculate current Average of Base Values.
 * 4. Shift all values by (TargetAvg - CurrentAvg) to align with Target.
 * 5. Apply linear smoothing within buckets to differentiate Ranks (Rank 1 > Rank 2).
 * 6. Clamp to 5.0 / 2.0.
 */
export const distributeMtaByRank = (reports: any[], targetAvg: number): number[] => {
    const N = reports.length;
    if (N === 0) return [];
    if (N === 1) return [Math.min(5.0, Math.max(2.0, targetAvg))];

    // Configuration
    const EP_BOOST = 0.40; // EPs are significantly higher
    const MP_BOOST = 0.10; // MPs are slightly higher
    const RANK_DECAY = 0.02; // Score drops by 0.02 per rank position

    // 1. Assign Initial Raw Scores based on Rec + Rank Decay
    // We start with the TargetAvg as a baseline for everyone, then apply modifiers
    let rawScores = reports.map((r, i) => {
        let score = targetAvg;

        // Rec Modifier
        if (r.promotionRecommendation === 'EP' || r.promotionRecommendation === 'Early Promote') score += EP_BOOST;
        else if (r.promotionRecommendation === 'MP' || r.promotionRecommendation === 'Must Promote') score += MP_BOOST;

        // Rank Decay (Relative to center)
        // Center index is (N-1)/2. 
        // i=0 (Rank 1) should be Highest. i=N-1 (Rank N) Lowest.
        // We just subtract i * Decay? No, let's center it.
        // score += ( (N-1)/2 - i ) * RANK_DECAY;

        // Actually, simple decay from top is safer for monotonicity
        // But we need to shift later. So just linear decay is fine.
        score -= (i * RANK_DECAY);

        return score;
    });

    // 2. Adjust to match Target Average
    const currentSum = rawScores.reduce((a, b) => a + b, 0);
    const currentAvg = currentSum / N;
    const shift = targetAvg - currentAvg;

    let adjustedScores = rawScores.map(s => s + shift);

    // 3. Clamp and Distribute Excess (Iterative)
    // If any score > 5.0, cap it and distribute the excess to others to maintain Average?
    // Actually, "Water Level" logic usually means if you cap the top, the average DROPS, unless you boost the bottom.
    // But boosting the bottom reduces the "Spread".
    // For Strategy, we want to hit the Target Average implies "Spending the Budget".
    // If Rank 1 is capped at 5.0, we have "extra points" we couldn't give him. 
    // We should give them to Rank 2, 3 etc. downwards? Or just general shift?
    // Let's do a simple Clamp for now, acknowledging that Average might dip below Target if we hit ceiling.
    // (It is better to be safe/legal than to force the average by breaking 5.0)

    adjustedScores = adjustedScores.map(s => Math.min(5.0, Math.max(2.0, s)));

    return adjustedScores.map(s => Math.round(s * 100) / 100);
};
