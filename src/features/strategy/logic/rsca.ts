

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
