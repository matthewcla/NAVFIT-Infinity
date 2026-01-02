

/**
 * rounds a number to 2 decimal places
 */
const round2 = (num: number): number => Math.round(num * 100) / 100;

/**
 * Calculates the Individual Trait Average (ITA) from a set of trait grades.
 * ITA = Sum(Traits) / Count(Traits)
 * Traits should be 0.0 - 5.0. 
 * 'NOB' or 0 grades in the input map should be handled by caller before passed here? 
 * The requirements say "Mean of traits (Blocks 33-39)".
 */
export const calculateITA = (traits: Record<string, number | null>): number => {
    const validScores = Object.values(traits).filter((t): t is number => typeof t === 'number' && t > 0);
    if (validScores.length === 0) return 0;

    const sum = validScores.reduce((acc, curr) => acc + curr, 0);
    return round2(sum / validScores.length);
};

/**
 * Calculates the projected RSCA based on current cumulative average and a new batch of reports.
 * Formula: ((CurrentRSCA * TotalSigned) + Sum(NewGroupITAs)) / (TotalSigned + NewGroupSize)
 */
export const projectRSCA = (
    currentRSCA: number,
    totalSigned: number,
    newProcessITAs: number[]
): number => {
    const sumNew = newProcessITAs.reduce((acc, curr) => acc + curr, 0);
    const newCount = newProcessITAs.length;

    if (totalSigned + newCount === 0) return 0;

    const numerator = (currentRSCA * totalSigned) + sumNew;
    const denominator = totalSigned + newCount;

    return round2(numerator / denominator);
};

/**
 * Calculates the Sensitivity Index (S).
 * S = 1 / (TotalSigned + 1)
 * Lower S = Higher Stability.
 */
export const calculateSensitivity = (totalSigned: number): number => {
    return 1 / (totalSigned + 1);
};

/**
 * Calculates the Flexibility Score.
 * Min(100, (TotalSigned / 20) * 100)
 * Goal is to reach 20 reports for max "flexibility/credibility".
 */
export const calculateFlexibility = (totalSigned: number): number => {
    return Math.min(100, (totalSigned / 20) * 100);
};

/**
 * Calculates the cumulative RSCA for a specific Paygrade (Rank).
 * Aggregates all reports from all Summary Groups that match the target Paygrade.
 * This ensures Frocked, Regular, Spot, etc. all feed the same RSCA bucket.
 */
import type { SummaryGroup } from '@/types';
import { PERIODIC_SCHEDULE } from '@/lib/constants';

export const calculateCumulativeRSCA = (
    allGroups: SummaryGroup[],
    targetPaygrade: string
): number => {
    // 1. Normalize target Paygrade (take first part if "O-3 1110" passed by mistake, though caller should pass Rank)
    const rank = targetPaygrade.split(' ')[0];

    // 2. Filter groups by matching Paygrade (Rank)
    // We check explicit 'paygrade' field OR derived from 'competitiveGroupKey'
    const matchingGroups = allGroups.filter(g => {
        const groupRank = g.paygrade || g.competitiveGroupKey.split(' ')[0];
        return groupRank === rank;
    });

    if (matchingGroups.length === 0) return 0;

    // 3. Aggregate all reports
    let totalScore = 0;
    let totalReports = 0;

    matchingGroups.forEach(group => {
        group.reports.forEach(report => {
            if (typeof report.traitAverage === 'number' && report.traitAverage > 0) {
                totalScore += report.traitAverage;
                totalReports++;
            }
        });
    });

    if (totalReports === 0) return 0;

    // 4. Return weighted average
    return round2(totalScore / totalReports);
};

/**
 * Returns detailed RSCA stats for a Competitive Group (Paygrade).
 * Useful for establishing a baseline (Current RSCA) from historical data.
 */
export const getCompetitiveGroupStats = (
    allGroups: SummaryGroup[],
    targetPaygrade: string,
    excludeGroupId?: string
): { average: number; count: number; totalScore: number } => {
    // 1. Normalize Rank
    const rank = targetPaygrade.split(' ')[0];

    // 2. Filter groups
    const matchingGroups = allGroups.filter(g => {
        if (excludeGroupId && g.id === excludeGroupId) return false;
        const groupRank = g.paygrade || g.competitiveGroupKey.split(' ')[0];
        return groupRank === rank;
    });

    // 3. Aggregate
    let totalScore = 0;
    let totalReports = 0;

    matchingGroups.forEach(group => {
        group.reports.forEach(report => {
            if (typeof report.traitAverage === 'number' && report.traitAverage > 0) {
                totalScore += report.traitAverage;
                totalReports++;
            }
        });
    });

    const average = totalReports > 0 ? round2(totalScore / totalReports) : 0;

    return {
        average,
        count: totalReports,
        totalScore
    };
};

/**
 * rounds a number to 2 decimal places - Reused from top if scope issue, 
 * but simpler to just use Math.
 */
// const round2 defined at top

// Minimal interface for Member data needed for projection (compatible with both Member and RosterMember)
interface ProjectableMember {
    id: string;
    rank: string;
    prd?: string;
    lastTrait?: number;
    // ... any other fields
}

/**
 * Calculates the projected EOT RSCA.
 * Incorporates future Phantom Reports (Periodic & Transfer) into the current RSCA.
 */
export const calculateEotRsca = (
    roster: ProjectableMember[],
    currentRsca: number,
    totalSignedReports: number,
    rsDetachDate: string
): number => {
    let futureTotalScore = 0;
    let futureTotalCount = 0;

    const rsDate = new Date(rsDetachDate);
    const today = new Date();
    const currentYear = today.getFullYear();
    const rsDetachYear = rsDate.getFullYear();

    roster.forEach(member => {
        // Validation
        if (!member.prd) return;

        const memberPRD = new Date(member.prd);
        const rank = member.rank;

        // Skip if member already left
        if (memberPRD < today) return;

        // Heuristic: Current Trait Average or Baseline
        // If they have a lastTrait, use it. If not, maybe use current RSCA as neutral proxy.
        // Cap growth at 5.0
        let projectedMTA = member.lastTrait || (currentRsca > 0 ? currentRsca : 3.60);

        // 1. Iterate Years for Periodic Cycles
        for (let year = currentYear; year <= rsDetachYear; year++) {
            const periodicMonth = PERIODIC_SCHEDULE[rank]; // 1-based (Jan=1)

            if (periodicMonth) {
                // Periodic Date: End of that month
                const pDate = new Date(year, periodicMonth, 0); // Day 0 of next month = last day of this month

                // Check constraints
                // Must be in future relative to "simulation now" (approx today)
                // Must be BEFORE RS leaves
                // Must be BEFORE Member leaves
                if (pDate > today && pDate <= rsDate && pDate <= memberPRD) {

                    // Apply Improvement Heuristic
                    // Assume +0.05 per cycle
                    if (projectedMTA < 4.80) { // Soft cap for easy growth
                        projectedMTA += 0.05;
                    }
                    projectedMTA = Math.min(5.00, round2(projectedMTA));

                    futureTotalCount++;
                    futureTotalScore += projectedMTA;
                }
            }
        }

        // 2. Transfer Report Check
        // If Member PRD is BEFORE RS Detach, they get a Transfer Report
        // which counts towards RSCA.
        // We only count this if we haven't already counted it via Periodic (collision check simplisitic here)
        // Usually Transfer overrides Periodic if close, but let's just check raw date.
        if (memberPRD > today && memberPRD <= rsDate) {
            // Is this distinct from the periodic we just counted?
            // Simplest check: Did we count a periodic exactly on this month?
            // For MVP: Just add it if it's the Transfer. Transfer is usually a separate event unless coinciding.
            // Heuristic Update: Transfer usually "one up".

            let transferMTA = projectedMTA + 0.10;
            transferMTA = Math.min(5.00, round2(transferMTA));

            // To avoid double counting for the exact same month/year collision, 
            // we could be smarter, but usually PRD is specific day.
            // Let's assume valid separate report for now.
            futureTotalCount++;
            futureTotalScore += transferMTA;
        }
    });

    if (totalSignedReports + futureTotalCount === 0) return 0;

    const numerator = (currentRsca * totalSignedReports) + futureTotalScore;
    const denominator = totalSignedReports + futureTotalCount;

    return round2(numerator / denominator);
};
