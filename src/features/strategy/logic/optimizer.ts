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
    isEot?: boolean;      // True if this is the End of Tour calculation
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
    // Helper to snap score to 2 decimals
    const round2 = (num: number) => Math.round(num * 100) / 100;

    for (let i = 0; i < sortedGroups.length; i++) {
        const group = sortedGroups[i];
        const status = group.status || 'Draft';
        // Treat "Planned" as "Projected" for optimization purposes
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
                // Fix: Include NOB in count? No, NOB doesn't affect RSCA.
                if (r.traitAverage > 0 && !r.notObservedReport && r.promotionRecommendation !== 'NOB') {
                    groupTotalScore += r.traitAverage;
                }
            });
            // Recalculate count for valid reports only? 
            // RSCA = Sum(Traits) / Sum(ValidReports).
            const validReports = group.reports.filter(r => r.traitAverage > 0 && !r.notObservedReport && r.promotionRecommendation !== 'NOB').length;

            if (validReports > 0) {
                optimalMta = round2(groupTotalScore / validReports);
                accumulatedScore += groupTotalScore;
                accumulatedCount += validReports;
            } else {
                optimalMta = 0;
            }

        } else {
            // --- OPTIMIZATION ENGINE ---
            // We want to find X (average MTA for this group) such that:
            // (CurrentSum + (X * Count)) / (CurrentCount + Count) <= Target

            // Only optimize for valid reports (non-NOB)
            // Ideally we predict how many will be valid. For now assume entire group size.
            const validCount = reportCount;

            // Formula:
            // (S + X*N) / (C + N) = T
            // S + X*N = T * (C + N)
            // X*N = T*(C+N) - S
            // X = (T*(C+N) - S) / N

            const nextTotalCount = accumulatedCount + validCount;
            const maxAllowedGlobalScore = targetRsca * nextTotalCount;
            const maxAllowedGroupTotalScore = maxAllowedGlobalScore - accumulatedScore;

            // Calculate Maximum Average for this group
            let calculatedMta = maxAllowedGroupTotalScore / validCount;

            // Cap at 5.0 (Physics Limit)
            if (calculatedMta > 5.0) calculatedMta = 5.0;

            // Fix "The Starvation": Clamp to 0.00 to prevent negative MTA (though practically ~2.0 is floor)
            calculatedMta = Math.max(0.00, calculatedMta);

            optimalMta = round2(calculatedMta);
            groupTotalScore = optimalMta * validCount;

            // Update Running Totals (Simulating that we executed this plan)
            accumulatedScore += groupTotalScore;
            accumulatedCount += validCount;
        }

        // Calculate the Resulting Cumulative RSCA at this waypoint
        const currentCumulative = accumulatedCount > 0 ? round2(accumulatedScore / accumulatedCount) : 0;
        const isEot = i === sortedGroups.length - 1;

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
            memberCount: reportCount,
            // @ts-ignore - Adding dynamic property for now, should update interface
            isEot: isEot
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

    // Helper to snap score to 2 decimals
    const round2 = (num: number) => Math.round(num * 100) / 100;

    if (N === 1) {
        // Validation check for single member
        const r = reports[0];
        if (r.isLocked) return [round2(r.traitAverage)];

        // Fix 3: Validation Gaps (Promotable limit)
        // If Promotable or has 2.0 trait grade (simulated by 'limit' logic or rec check), cap at 2.0
        // Assuming strict interpretation of "MTA > 2.0 to a member with a 'Promotable' limit"
        const isPromotable = r.promotionRecommendation === 'Promotable' || r.promotionRecommendation === 'Progressing' || r.promotionRecommendation === 'Significant Problems';
        const maxVal = isPromotable ? 2.0 : 5.0;

        return [round2(Math.min(maxVal, Math.max(2.0, targetAvg)))];
    }

    // Configuration
    const EP_BOOST = 0.40; // EPs are significantly higher
    const MP_BOOST = 0.10; // MPs are slightly higher
    const RANK_DECAY = 0.02; // Score drops by 0.02 per rank position

    // Fix 2: "The Mutiny" - Separate Locked (Fixed Mass) from Unlocked (Liquid)
    const lockedIndices = new Set<number>();
    let lockedMass = 0;
    let unlockedCount = 0;

    reports.forEach((r, i) => {
        if (r.isLocked) {
            lockedIndices.add(i);
            lockedMass += r.traitAverage; // Use existing value
        } else {
            unlockedCount++;
        }
    });

    // If everyone is locked, just return their values
    if (unlockedCount === 0) {
        return reports.map(r => round2(r.traitAverage));
    }

    // Calculate Remaining Budget for Unlocked members
    // Total Target Mass = TargetAvg * N
    const totalTargetMass = targetAvg * N;
    const remainingMass = totalTargetMass - lockedMass;

    // Calculate Target Average for Unlocked members
    // If remainingMass < 0 (Locked members already exceeded budget),
    // we technically have 0 budget for others. But physics demands at least 2.0 (or 0.0 for NOB).
    // The previous "Starvation" fix handles the global average, but here we distribute specifically.
    // If budget is blown by locks, unlocked members get squeezed.
    const unlockedTargetAvg = remainingMass / unlockedCount;

    // 1. Assign Initial Raw Scores based on Rec + Rank Decay (Only for Unlocked)
    let rawScores = reports.map((r, i) => {
        if (lockedIndices.has(i)) return r.traitAverage; // Placeholders, won't change

        let score = unlockedTargetAvg; // Start from their specific target

        // Rec Modifier
        if (r.promotionRecommendation === 'EP' || r.promotionRecommendation === 'Early Promote') score += EP_BOOST;
        else if (r.promotionRecommendation === 'MP' || r.promotionRecommendation === 'Must Promote') score += MP_BOOST;

        // Rank Decay (Relative to center of UNLOCKED group? Or Global Rank?)
        // Using Global Rank `i` ensures Rank 1 is always > Rank 2 even if Rank 1 is unlocked.
        // However, if we shift, we shift everyone.
        score -= (i * RANK_DECAY);

        return score;
    });

    // 2. Adjust Unlocked Scores to match Unlocked Target Average
    // Filter out locked scores to calculate shift
    let currentUnlockedSum = 0;
    let unlockedIndices: number[] = [];
    rawScores.forEach((s, i) => {
        if (!lockedIndices.has(i)) {
            currentUnlockedSum += s;
            unlockedIndices.push(i);
        }
    });

    const currentUnlockedAvg = currentUnlockedSum / unlockedCount;
    const shift = unlockedTargetAvg - currentUnlockedAvg;

    let adjustedScores = rawScores.map((s, i) => {
        if (lockedIndices.has(i)) return s; // Keep locked value
        return s + shift;
    });

    // 3. Clamp and Validation (Fix 3)
    adjustedScores = adjustedScores.map((s, i) => {
        if (lockedIndices.has(i)) return round2(s);

        const r = reports[i];

        // Fix 3: Validation Gaps
        // Ensure Promotable Limit (MTA <= 2.0)
        let maxCap = 5.0;
        if (r.promotionRecommendation === 'Promotable' || r.promotionRecommendation === 'Progressing' || r.promotionRecommendation === 'Significant Problems') {
            maxCap = 2.0;
        }

        let val = Math.min(maxCap, Math.max(2.0, s));
        return round2(val);
    });

    return adjustedScores;
};
