import type { SummaryGroup } from '@/types';

/**
 * Configuration for dynamic RSCA targeting
 */
export interface TargetConfig {
    idealTarget: number;      // The sweet spot (typically 4.0)
    safeZoneMin: number;      // Lower bound of safe zone (typically 3.8)
    safeZoneMax: number;      // Upper bound of safe zone (typically 4.2)
    maxLimit: number;         // Hard ceiling (typically 4.4)
    minLimit: number;         // Critical floor (typically 3.6)
}

/**
 * Default target configuration
 */
export const DEFAULT_TARGET_CONFIG: TargetConfig = {
    idealTarget: 4.0,
    safeZoneMin: 3.8,
    safeZoneMax: 4.2,
    maxLimit: 4.4,
    minLimit: 3.6
};

/**
 * Interface for a point on the optimization trajectory
 */
export interface TrajectoryPoint {
    date: number;         // Timestamp
    rsca: number;         // The cumulative RSCA at this point
    target: number;       // The target limit (now dynamic)
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
 * Calculates a dynamic target RSCA based on current and historical trajectory.
 *
 * Strategy:
 * - If you're in the safe zone (3.8-4.2): Maintain at 4.0
 * - If you're below 3.6: Gradual climb toward 3.8-4.0
 * - If you're 3.6-3.8: Steady approach to 3.9-4.0
 * - If you're 4.2-4.4: Gentle pullback to 3.9-4.0
 * - If you're above 4.4: Correction back to 3.8
 *
 * @param currentRsca - The current cumulative RSCA
 * @param trend - The recent trend (positive = climbing, negative = falling)
 * @param config - Target configuration (optional, uses defaults)
 * @returns The optimal target RSCA for this point in time
 */
export const calculateDynamicTarget = (
    currentRsca: number,
    trend: number = 0,
    config: TargetConfig = DEFAULT_TARGET_CONFIG
): number => {
    const { idealTarget, safeZoneMin, safeZoneMax, maxLimit, minLimit } = config;

    // In the safe zone: maintain at ideal
    if (currentRsca >= safeZoneMin && currentRsca <= safeZoneMax) {
        return idealTarget;
    }

    // Critical low (< 3.6): Gradual climb to 3.8-4.0
    if (currentRsca < minLimit) {
        // Target the lower end of safe zone, but allow for gradual approach
        // If we're very low, don't try to jump too quickly
        const gap = minLimit - currentRsca;
        if (gap > 0.4) {
            // Very low: aim for gradual climb (target ~3.8)
            return safeZoneMin;
        } else {
            // Getting closer: aim for middle (target ~3.9)
            return (safeZoneMin + idealTarget) / 2;
        }
    }

    // Approaching from below (3.6-3.8): Steady approach to 3.9-4.0
    if (currentRsca < safeZoneMin) {
        return (safeZoneMin + idealTarget) / 2; // Target ~3.9
    }

    // Slightly high (4.2-4.4): Gentle pullback to 3.9-4.0
    if (currentRsca > safeZoneMax && currentRsca <= maxLimit) {
        // Consider trend: if falling, less aggressive pullback needed
        if (trend < 0) {
            return idealTarget; // Already correcting, maintain at 4.0
        }
        return (safeZoneMax + idealTarget) / 2; // Target ~3.9
    }

    // Critical high (> 4.4): Correction needed
    if (currentRsca > maxLimit) {
        // Stronger correction needed - target lower end of safe zone
        return safeZoneMin; // Target 3.8
    }

    // Default fallback (should not reach here)
    return idealTarget;
};

/**
 * Calculates the trend (rate of change) from recent trajectory points.
 *
 * @param recentPoints - Array of recent trajectory points (chronologically sorted)
 * @returns The trend value (positive = climbing, negative = falling)
 */
export const calculateTrend = (recentPoints: TrajectoryPoint[]): number => {
    if (recentPoints.length < 2) return 0;

    // Look at the last few points (up to 3) to determine trend
    const lookback = Math.min(3, recentPoints.length);
    const relevantPoints = recentPoints.slice(-lookback);

    // Simple linear trend: (last - first) / number of steps
    const firstRsca = relevantPoints[0].rsca;
    const lastRsca = relevantPoints[relevantPoints.length - 1].rsca;

    return lastRsca - firstRsca;
};

/**
 * Calculates an adaptive target RSCA that considers time remaining.
 *
 * Strategy:
 * - With 4+ reports remaining: Use gradual approach (normal dynamic target)
 * - With 2-3 reports remaining: Apply moderate urgency
 * - With 1 report remaining: Apply maximum urgency - last chance to correct
 *
 * The urgency factor makes targets more aggressive when:
 * - You're far from the ideal target AND
 * - You have limited time to correct
 *
 * @param currentRsca - The current cumulative RSCA
 * @param trend - The recent trend (positive = climbing, negative = falling)
 * @param reportsRemaining - Number of future reporting periods left
 * @param config - Target configuration (optional, uses defaults)
 * @returns The optimal target RSCA considering time pressure
 */
export const calculateAdaptiveTarget = (
    currentRsca: number,
    trend: number,
    reportsRemaining: number,
    config: TargetConfig = DEFAULT_TARGET_CONFIG
): number => {
    const baseTarget = calculateDynamicTarget(currentRsca, trend, config);
    const { idealTarget, safeZoneMin, safeZoneMax, maxLimit, minLimit } = config;

    // If we have plenty of time (4+ reports), use base target as-is
    if (reportsRemaining >= 4) {
        return baseTarget;
    }

    // If we're already in the safe zone, maintain gradual approach
    if (currentRsca >= safeZoneMin && currentRsca <= safeZoneMax) {
        return baseTarget;
    }

    // Calculate how far off-target we are
    const deviation = currentRsca - idealTarget;

    // Urgency increases as reports remaining decreases
    // reportsRemaining = 3: urgencyFactor = 0.33
    // reportsRemaining = 2: urgencyFactor = 0.67
    // reportsRemaining = 1: urgencyFactor = 1.00
    const urgencyFactor = Math.min(1.0, (4 - reportsRemaining) / 3);

    // Only apply urgency if deviation is significant (> 0.2)
    if (Math.abs(deviation) < 0.2) {
        return baseTarget; // Close enough, no need for urgency
    }

    if (deviation < 0) {
        // Below target - need to climb faster
        // Push target higher to encourage larger MTA
        const aggressiveBoost = Math.abs(deviation) * urgencyFactor * 0.3;
        const aggressiveTarget = baseTarget + aggressiveBoost;
        return Math.min(maxLimit, aggressiveTarget);
    } else {
        // Above target - need to descend faster
        // Pull target lower to encourage smaller MTA
        const aggressivePullback = deviation * urgencyFactor * 0.3;
        const aggressiveTarget = baseTarget - aggressivePullback;
        return Math.max(minLimit, aggressiveTarget);
    }
};

/**
 * Calculates the Optimized Trajectory.
 *
 * Algorithm: "Adaptive Water Level"
 * 1. Establish the "Baseline" (Current RSCA from finalized reports).
 * 2. Sort all groups chronologically.
 * 3. Walk through time.
 *    - If group is Final/Submitted: Use actual data. Update running RSCA.
 *    - If group is Future (Draft/Planning): Calculate the MAX possible MTA
 *      that keeps Cumulative RSCA <= Dynamic Target.
 *    - Target adapts based on where you are and where you're trending.
 *
 * @param summaryGroups - All groups for this Competitive Category
 * @param configOrTarget - Target configuration object OR a legacy numeric target (for backward compatibility)
 */
export const calculateOptimizedTrajectory = (
    summaryGroups: SummaryGroup[],
    configOrTarget?: TargetConfig | number
): TrajectoryPoint[] => {
    // Handle backward compatibility: if a number is passed, convert to config
    let config: TargetConfig;
    if (typeof configOrTarget === 'number') {
        // Legacy mode: use the number as idealTarget, adjust safe zone around it
        const target = configOrTarget;
        config = {
            idealTarget: target,
            safeZoneMin: Math.max(2.0, target - 0.2),
            safeZoneMax: Math.min(5.0, target + 0.2),
            maxLimit: Math.min(5.0, target + 0.4),
            minLimit: Math.max(2.0, target - 0.4)
        };
    } else {
        config = configOrTarget || DEFAULT_TARGET_CONFIG;
    }

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

    // Count total future groups for time-horizon awareness
    const futureGroupCount = sortedGroups.filter(g => {
        const status = g.status || 'Draft';
        return !['Final', 'Submitted', 'Review'].includes(status);
    }).length;

    let futureGroupsProcessed = 0;

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
        let targetUsed = config.idealTarget; // Track the target used for this group

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
            // --- ADAPTIVE OPTIMIZATION ENGINE ---
            // Calculate current RSCA and trend to determine dynamic target
            const currentCumulativeRsca = accumulatedCount > 0 ? accumulatedScore / accumulatedCount : 0;
            const trend = calculateTrend(trajectory);

            // Calculate how many reports remain AFTER this one
            const reportsRemaining = futureGroupCount - futureGroupsProcessed - 1;

            // Use time-aware adaptive targeting
            const dynamicTarget = calculateAdaptiveTarget(
                currentCumulativeRsca,
                trend,
                reportsRemaining,
                config
            );

            targetUsed = dynamicTarget; // Store for trajectory point

            // Track that we've processed this future group
            futureGroupsProcessed++;

            // Only optimize for valid reports (non-NOB)
            // Ideally we predict how many will be valid. For now assume entire group size.
            const validCount = reportCount;

            // Formula:
            // (S + X*N) / (C + N) = T
            // S + X*N = T * (C + N)
            // X*N = T*(C+N) - S
            // X = (T*(C+N) - S) / N

            const nextTotalCount = accumulatedCount + validCount;
            const maxAllowedGlobalScore = dynamicTarget * nextTotalCount;
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

        // For final groups, calculate what the target would be at this point
        if (isFinal) {
            const trend = calculateTrend(trajectory);
            targetUsed = calculateDynamicTarget(currentCumulative, trend, config);
        }

        const isEot = i === sortedGroups.length - 1;

        trajectory.push({
            date: date,
            rsca: currentCumulative,
            target: targetUsed,
            margin: round2(targetUsed - currentCumulative),
            groupName: group.name || group.competitiveGroupKey,
            groupId: group.id,
            compKey: group.competitiveGroupKey,
            isProjected: !isFinal,
            optimalMta: optimalMta,
            memberCount: reportCount,
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
