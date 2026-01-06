
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
    targetPaygrade: string,
    allowedStatuses: string[] = ['Final'], // Default to "Realized" history only
    projections?: Record<string, number> // Optional live MTA overrides (keyed by report.id)
): number => {
    // 1. Normalize target Paygrade (take first part if "O-3 1110" passed by mistake, though caller should pass Rank)
    const rank = targetPaygrade.split(' ')[0];

    // 2. Filter groups by matching Paygrade (Rank)
    // We check explicit 'paygrade' field OR derived from 'competitiveGroupKey'
    const matchingGroups = allGroups.filter(g => {
        const groupRank = g.paygrade || g.competitiveGroupKey.split(' ')[0];
        // Rank Match AND Status Match
        const status = g.status || 'Draft'; // Default to Draft if missing
        return groupRank === rank && allowedStatuses.includes(status);
    });

    if (matchingGroups.length === 0) return 0;

    // 3. Aggregate all reports
    let totalScore = 0;
    let totalReports = 0;

    matchingGroups.forEach(group => {
        group.reports.forEach(report => {
            // Use projection override if available, otherwise fall back to traitAverage
            const mta = projections?.[report.id] ?? report.traitAverage;
            if (typeof mta === 'number' && mta > 0) {
                totalScore += mta;
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
    excludeGroupId?: string,
    allowedStatuses: string[] = ['Final']
): { average: number; count: number; totalScore: number } => {
    // 1. Normalize Rank
    const rank = targetPaygrade.split(' ')[0];

    // 2. Filter groups
    const matchingGroups = allGroups.filter(g => {
        if (excludeGroupId && g.id === excludeGroupId) return false;
        const groupRank = g.paygrade || g.competitiveGroupKey.split(' ')[0];
        const status = g.status || 'Draft';
        return groupRank === rank && allowedStatuses.includes(status);
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
    rsDetachDate: string,
    targetRank: string
): { eotRsca: number, memberProjections: Record<string, number> } => {

    // Default Return
    const defaultResult = { eotRsca: currentRsca, memberProjections: {} };

    // 1. Filter Roster by Rank
    const relevantMembers = roster.filter(m => m.rank === targetRank);
    if (relevantMembers.length === 0) return defaultResult;

    const rsDate = new Date(rsDetachDate);
    const today = new Date();

    // Initialize Simulation State
    // We track each member's current projected MTA
    let memberStates = relevantMembers.map(m => ({
        ...m,
        currentMta: m.lastTrait || (currentRsca > 0 ? currentRsca : 3.60),
        prdDate: m.prd ? new Date(m.prd) : new Date('2099-12-31')
    }));

    const memberProjections: Record<string, number> = {};
    // Init map
    memberStates.forEach(m => {
        memberProjections[m.id] = m.currentMta;
    });

    let futureTotalScore = 0;
    let futureTotalCount = 0;

    // We simulate in monthly steps from Now until RS Detach
    // This allows us to handle "Rank Order" and "Detachment" dynamically

    // Initialize to End of NEXT Month relative to today
    // today.getMonth() is 0-indexed. +2 gives us "2 months ahead" in params, 
    // but day 0 rolls back 1 day. So effectively "End of Next Month".
    // e.g. Jan 15 -> Month 0. Next month is Feb. We want Feb 28.
    // new Date(Y, 0+2, 0) -> new Date(Y, 2, 0) -> Mar 0 -> Feb 28. Correct.
    let cursorDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);

    const periodicMonth = PERIODIC_SCHEDULE[targetRank] || 1; // Default to Jan if unknown

    while (cursorDate <= rsDate) {
        // 1. Identify Valid Members for this Month
        // Must be Onboard at least part of this month (PRD >= 1st of this month)
        const firstDayOfCursorMonth = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
        const activeMembers = memberStates.filter(m => m.prdDate >= firstDayOfCursorMonth);

        if (activeMembers.length === 0) break;

        // 2. Check for Events: Periodic or Transfer
        const currentMonth = cursorDate.getMonth() + 1; // 1-12
        const isPeriodic = currentMonth === periodicMonth;

        // "Reports" this month
        const reportsThisMonth: typeof memberStates = [];

        activeMembers.forEach(member => {
            let isReport = false;
            // Periodic Check
            if (isPeriodic) isReport = true;

            // Transfer Check (PRD in this month?)
            // If PRD is exactly this month (or we just passed it, but we filter >= cursorDate at start...
            // Actually if PRD is this month, they are still here? Usually Transfer report aligns with Detach.
            // Let's assume PRD month IS the report month.
            const prdMonth = member.prdDate.getMonth() + 1;
            const prdYear = member.prdDate.getFullYear();
            if (prdMonth === currentMonth && prdYear === cursorDate.getFullYear()) {
                isReport = true;
            }

            if (isReport) {
                reportsThisMonth.push(member);
            }
        });

        if (reportsThisMonth.length > 0) {
            // 3. Promote/Adjust Rank Order
            // Sort by current MTA descending - this implicitly handles "rank promotion" as
            // members detach (lower-ranked members move up in competitive group order)
            reportsThisMonth.sort((a, b) => b.currentMta - a.currentMta);

            // 4. Identify detachments this month for rank-promotion bump
            // Members whose PRD is this month are detaching after this report
            const detachingMemberIds = new Set(
                reportsThisMonth
                    .filter(m => {
                        const prdMonth = m.prdDate.getMonth() + 1;
                        const prdYear = m.prdDate.getFullYear();
                        return prdMonth === currentMonth && prdYear === cursorDate.getFullYear();
                    })
                    .map(m => m.id)
            );

            // Apply Improvements with variable growth and rank-promotion bump
            reportsThisMonth.forEach((member, index) => {
                // Variable Growth Factor: Random between 0.05 and 0.10 per requirement
                const growth = 0.05 + Math.random() * 0.05;

                // Rank-Promotion Bump: If the member immediately above us (index-1) is detaching,
                // we get an additional bump for "moving up" in the competitive group
                let rankPromotionBonus = 0;
                if (index > 0) {
                    const memberAbove = reportsThisMonth[index - 1];
                    if (detachingMemberIds.has(memberAbove.id)) {
                        rankPromotionBonus = 0.02; // Bonus for competitive group compression
                    }
                }

                if (member.currentMta < 5.0) {
                    member.currentMta += growth + rankPromotionBonus;
                    // Cap at 5.0
                    if (member.currentMta > 5.0) member.currentMta = 5.0;
                }

                // Update Projections
                memberProjections[member.id] = round2(member.currentMta);

                // Accumulate to Global
                futureTotalScore += member.currentMta;
                futureTotalCount++;
            });
        }

        // Advance Month
        // Go 2 months ahead in params, day 0 => End of Next Month from current cursor
        // e.g. Feb 28 (Month 1). +2 => Month 3 (April), Day 0 => Mar 31. Correct.
        cursorDate = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 2, 0);
    }

    if (totalSignedReports + futureTotalCount === 0) return defaultResult;

    const numerator = (currentRsca * totalSignedReports) + futureTotalScore;
    const denominator = totalSignedReports + futureTotalCount;

    return {
        eotRsca: round2(numerator / denominator),
        memberProjections
    };
};
