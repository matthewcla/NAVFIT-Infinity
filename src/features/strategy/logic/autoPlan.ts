

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
    maxGradeCap: 5.00,
};

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

    // 2. Determine Ceiling (#1 Ranked)
    const numberOne = sortedRoster[0];

    // 3. Determine Floor (Ballast)
    // Identify the lowest ranked "Promotable" member.
    let floorIndex = -1;
    let floorMember: Member | null = null;

    for (let i = sortedRoster.length - 1; i >= 0; i--) {
        if (sortedRoster[i].status === 'Promotable') {
            floorIndex = i;
            floorMember = sortedRoster[i];
            break;
        }
    }

    // Initialize outcome roster
    const outcomeRoster = sortedRoster.map(member => ({ ...member, proposedTraitAverage: 0 }));

    // Calculate Grade #1
    let gradeNumOne = rscaTarget + config.breakoutBonus - (config.reportsRemainingFactor * numberOne.reportsRemaining);
    if (numberOne.status !== 'Transferring') {
        gradeNumOne = Math.min(gradeNumOne, config.maxGradeCap);
    }

    // Calculate Grade Floor
    let gradeFloor = config.minBallastGrade;
    if (floorMember) {
        gradeFloor = Math.max(rscaTarget - config.ballastDeduction, config.minBallastGrade);
    }

    // Interpolation Loop
    for (let i = 0; i < outcomeRoster.length; i++) {
        const member = outcomeRoster[i];
        let grade = 0;

        if (i === 0) {
            grade = gradeNumOne;
        } else if (i === floorIndex) {
            grade = gradeFloor;
        } else if (floorIndex > 0 && i < floorIndex) {
            // Interpolate
            const totalSteps = floorIndex; // from 0 to floorIndex
            const gradeDiff = gradeFloor - gradeNumOne;
            const stepSize = gradeDiff / totalSteps;
            grade = gradeNumOne + (stepSize * i);
        } else {
            // Below floor or undefined floor
            if (i > floorIndex && floorIndex !== -1) {
                // Member is below the floor member.
                // Usually these are non-promotables?
                // I'll set them to floorGrade or maybe a default low?
                // The prompt doesn't specify. I'll preserve floorGrade to be safe (min 3.60).
                grade = gradeFloor;
            } else if (floorIndex === -1) {
                // No floor member. Interpolate to minBallastGrade at end of roster?
                // Or just give everyone #1 grade?
                // I'll assume everyone gets assigned recursively?
                // I'll just set to gradeNumOne for now to be safe.
                grade = gradeNumOne;
            }
        }

        // Context Override: Retiring
        // "If member status is 'Retiring', set target <= rscaTarget."
        if (member.status === 'Retiring') {
            if (grade > rscaTarget) {
                grade = rscaTarget;
            }
        }

        // Assign
        member.proposedTraitAverage = Number(grade.toFixed(2)); // Round to 2 decimals usually
    }

    return outcomeRoster;
}
