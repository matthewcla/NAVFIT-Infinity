

export interface StrategyConfig {
    breakoutBonus: number;
    reportsRemainingFactor: number;
    ballastDeduction: number;
    minBallastGrade: number;
    maxGradeCap: number;
}

export const DEFAULT_STRATEGY_CONFIG: StrategyConfig = {
    breakoutBonus: 0.30,
    reportsRemainingFactor: 0.10,
    ballastDeduction: 0.20,
    minBallastGrade: 3.60,
    maxGradeCap: 4.90, // Soft Cap for non-transferring members
};

const ABSOLUTE_MAX_GRADE = 5.00;

export interface Member {
    id: string;
    rankOrder: number;
    reportsRemaining: number;
    status: 'Transferring' | 'Retiring' | 'Promotable' | string;
    proposedTraitAverage?: number;
}

/**
 * Calculates Outcome-Based Grades for a roster of members.
 *
 * @param roster - Array of members to calculate grades for.
 * @param rscaTarget - The Reporting Senior Cumulative Average target.
 * @param config - Configuration for the strategy (defaults to DEFAULT_STRATEGY_CONFIG).
 * @returns Array of members with updated proposedTraitAverage.
 */
export function calculateOutcomeBasedGrades(
    roster: Member[],
    rscaTarget: number,
    config: StrategyConfig = DEFAULT_STRATEGY_CONFIG
): Member[] {
    // 1. Sort members by their rankOrder.
    const sortedRoster = [...roster].sort((a, b) => a.rankOrder - b.rankOrder);

    if (sortedRoster.length === 0) {
        return [];
    }

    // Initialize outcome roster
    const outcomeRoster = sortedRoster.map(member => ({ ...member, proposedTraitAverage: 0 }));

    // 2. Determine Ceiling (#1 Ranked)
    const numberOne = outcomeRoster[0];

    // Formula: MaxGrade = rscaTarget + 0.30 (Breakout Bonus) - (0.10 * member.reportsRemaining)
    let ceilingGrade = rscaTarget + config.breakoutBonus - (config.reportsRemainingFactor * numberOne.reportsRemaining);

    // Constraint: Cannot exceed 5.00 (ABSOLUTE_MAX_GRADE).
    // Context Override: If member status is 'Transferring', ignore Ceiling cap (allow higher delta up to 5.00).
    // If NOT Transferring, apply the configured maxGradeCap (e.g. 4.90).
    if (numberOne.status !== 'Transferring') {
        ceilingGrade = Math.min(ceilingGrade, config.maxGradeCap);
    }

    // Always enforce the absolute hard limit for the Navy
    ceilingGrade = Math.min(ceilingGrade, ABSOLUTE_MAX_GRADE);

    // 3. Determine Floor (Ballast)
    // Identify the lowest ranked "Promotable" member (not Adverse).
    // Note: User prompt said "Promotable" member. We'll search from bottom up.
    let floorIndex = -1;
    let floorMember: Member | null = null;

    for (let i = outcomeRoster.length - 1; i >= 0; i--) {
        if (outcomeRoster[i].status === 'Promotable') {
            floorIndex = i;
            floorMember = outcomeRoster[i];
            break;
        }
    }

    // Set their grade to rscaTarget - 0.20 (or 3.60 minimum).
    let floorGrade = config.minBallastGrade;
    if (floorMember) {
        floorGrade = Math.max(rscaTarget - config.ballastDeduction, config.minBallastGrade);
    }

    // 4. Interpolate
    // Distribute the grades for members between #2 and the Floor using a linear spread.
    // The range to interpolate is from index 0 to floorIndex.
    // Index 0 gets ceilingGrade.
    // Index floorIndex gets floorGrade.
    // Logic:
    //   If floorIndex is 0, then #1 is also the floor (only 1 promotable?), so just set to ceiling?
    //   The prompt implies distinct separation.

    // We strictly follow "Distribute the grades for members between #2 and the Floor".
    // This implies we solve for the 'step' that connects Ceiling (at index 0) to Floor (at index floorIndex).

    // If we have no floor (no promotable members), what happens? 
    // We'll fall back to ceiling for everyone above floor if no floor exists? 
    // Let's assume there is at least one promotable for now, or handle gracefully.

    const countBetween = floorIndex; // Number of steps from 0 to floorIndex
    let stepSize = 0;

    if (countBetween > 0) {
        const gradeDiff = ceilingGrade - floorGrade;
        stepSize = gradeDiff / countBetween;
    }

    for (let i = 0; i < outcomeRoster.length; i++) {
        const member = outcomeRoster[i];
        let calculatedGrade = 0;

        // Base Calculation
        if (i <= floorIndex) {
            // Member is within the interpolation range (#1 to Floor)
            // Grade = Ceiling - (step * index)
            calculatedGrade = ceilingGrade - (stepSize * i);
        } else {
            // Below the floor (e.g. non-promotables below the last promotable, 
            // or if the roster extends beyond the last promotable for some reason).
            // User requirement: "Interpolate: Distribute the grades for members between #2 and the Floor"
            // Does not specify what happens BELOW the floor.
            // Implicitly, they might just get the floor grade or drop off?
            // "Identify the lowest ranked 'Promotable'... Set their grade to..."

            // Standard approach: Flatten at floor, or continue slope?
            // "Ballast" implies holding the bottom. I will clip them to the floor value 
            // OR if they are non-promotable, maybe they don't get a calculated grade?
            // But the function must return proposedTraitAverage.
            // I'll clamp to floorGrade for now, as that's safe for "Ballast".
            calculatedGrade = floorGrade;
        }

        // 5. Context Overrides
        // If member status is 'Retiring', set target <= rscaTarget.
        if (member.status === 'Retiring') {
            if (calculatedGrade > rscaTarget) {
                calculatedGrade = rscaTarget;
            }
        }

        // Final Rounding (Standards typically 2 decimal places)
        member.proposedTraitAverage = Number(calculatedGrade.toFixed(2));
    }

    return outcomeRoster;
}
