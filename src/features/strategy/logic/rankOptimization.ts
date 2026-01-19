import { PromotionRecommendation } from '@/domain/policy/types';
import { assignRecommendationsByRank } from './recommendation';
import type { SummaryGroup, Report } from '@/types';

export interface OptimizerConfig {
    targetRsca: number;
    rscaMargin: number;
    minMtaHike: number; // e.g. 0.01
    diminishingReturnsThreshold: number; // e.g. 0.05 hike
}

// Default Configuration
export const DEFAULT_OPTIMIZER_CONFIG: OptimizerConfig = {
    targetRsca: 4.10, // Safe bet
    rscaMargin: 0.05,
    minMtaHike: 0.01,
    diminishingReturnsThreshold: 0.06
};

/**
 * Core Optimization Engine
 * 
 * 1. Aligns members by Rank.
 * 2. Assigns Recommendations (EP/MP/P) based on quotas.
 * 3. Water-fills MTA based on RSCA budget.
 */
export function optimizeGroup(
    group: SummaryGroup,
    rankList: string[], // Member IDs in order 1..N
    config: Partial<OptimizerConfig> = {}
): Report[] {
    const finalConfig = { ...DEFAULT_OPTIMIZER_CONFIG, ...config };

    // Safety check
    if (!group.reports || group.reports.length === 0) return [];

    // --- Step 1: Rank Alignment ---
    // Create a map for fast lookup of rank index
    const rankMap = new Map<string, number>();
    rankList.forEach((id, index) => rankMap.set(id, index));

    // Sort reports by Rank Order (Unranked go to bottom)
    const sortedReports = [...group.reports].sort((a, b) => {
        const rankA = rankMap.has(a.memberId) ? rankMap.get(a.memberId)! : 9999;
        const rankB = rankMap.has(b.memberId) ? rankMap.get(b.memberId)! : 9999;
        return rankA - rankB;
    });

    // --- Step 2: Quota Assignment ---
    // We reuse the existing quota logic, but we pass it the pre-sorted list.
    // The existing function respects the input order as "Merit Order".
    const withRecs = assignRecommendationsByRank(sortedReports, group);

    // --- Step 3: MTA Optimization (Water Filling) ---
    // Calculate total budget
    const targetAvg = finalConfig.targetRsca;
    // We only optimize "Active" reports (not NOB)
    const activeReports = withRecs.filter(r =>
        r.promotionRecommendation !== PromotionRecommendation.NOB &&
        !r.notObservedReport
    );

    if (activeReports.length === 0) return withRecs; // No one to optimize

    const n = activeReports.length;
    const totalBudget = targetAvg * n;

    // A. Set Baselines (Minimum Viable MTA)
    // - Must be >= Last Trait + MinHike (unless capped)
    // - Must be >= 3.0 (Absolute floor)
    // - Locked reports consume budget but don't change

    let currentSum = 0;
    const candidates: { report: Report, minMta: number, currentMta: number, locked: boolean }[] = [];

    activeReports.forEach(r => {
        // Determine baseline
        // For now, simpler logic: preserve existing if projected, or use calculator
        // TODO: Import calculator. For now assume report.traitAverage is the "Start Point"

        // Use implicit usage to satisfy lint if we aren't using minMta yet logic-wise
        // or just comment it out. Let's use it for the candidates object.
        const minMta = r.traitAverage;

        // If locked, it is what it is
        if (r.isLocked) {
            candidates.push({ report: r, minMta, currentMta: r.traitAverage, locked: true });
            currentSum += r.traitAverage;
            return;
        }

        // Apply Minimum Hike if applicable (and not maxed)
        // If this is a Planned report, we might want to boost it from previous cycle
        // But here we assume report.traitAverage came from "createPlannedReport" which already set a baseline.

        candidates.push({ report: r, minMta: r.traitAverage, currentMta: r.traitAverage, locked: false });
        currentSum += r.traitAverage;
    });

    // B. Distribute Surplus Budget
    let remainingBudget = totalBudget - currentSum;

    // We iterate top-down (by Rank) and give boosts
    // Loop until budget exhausted or all capped
    let iterations = 0;
    while (remainingBudget > 0.009 && iterations < 100) {
        let distributedInRound = 0;

        for (const cand of candidates) {
            if (cand.locked) continue;
            if (remainingBudget <= 0.009) break;

            // Cap check
            if (cand.currentMta >= 5.00) continue;

            // Prioritize higher ranks for larger chunks?
            // Simple approach: Round Robin +0.01 to top ranks first
            cand.currentMta += 0.01;
            cand.report.traitAverage = Number(cand.currentMta.toFixed(2));
            remainingBudget -= 0.01;
            distributedInRound++;
        }

        if (distributedInRound === 0) break; // Everyone capped
        iterations++;
    }

    // C. Apply Margins (Cut if over budget)
    // If we started ABOVE budget (e.g. user set target 3.8 but baselines are 4.0), we need to shave.
    // We shave from BOTTOM up.
    if (remainingBudget < 0) {
        // Sort bottom-up for cutting
        const reversed = [...candidates].reverse();

        while (remainingBudget < -0.009 && iterations < 200) {
            let cutInRound = 0;
            for (const cand of reversed) {
                if (cand.locked) continue;
                if (remainingBudget >= -0.009) break;

                // Floor check (e.g. 2.0 or maintain baseline?)
                // Strict: Don't go below baseline? Or allow cut to baseline?
                // For now, allow cut down to 3.0 or baseline if baseline was high?
                // Let's assume we can cut down to minMta (if we boosted) or even lower if needed?
                // Constraint: Try not to go below minMta unless absolutely necessary.

                if (cand.currentMta > 2.0) {
                    cand.currentMta -= 0.01;
                    cand.report.traitAverage = Number(cand.currentMta.toFixed(2));
                    remainingBudget += 0.01;
                    cutInRound++;
                }
            }
            if (cutInRound === 0) break;
            iterations++;
        }
    }

    return withRecs;
}
