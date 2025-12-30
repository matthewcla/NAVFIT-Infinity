/**
 * Strategy & Opportunity Finder
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 90-Day Rule Trigger
 * IF (Today - LastReportEndDate) >= 90 days
 * AND (NextPeriodicDate - Today) > 60 days
 * THEN Trigger "Volume Opportunity"
 */
export const findVolumeMessage = (
    lastReportEndDateStr: string,
    nextPeriodicDateStr: string,
    currentDate: Date = new Date() // Default to now, but actionable for testing
): string | null => {
    const lastEnd = new Date(lastReportEndDateStr);
    const nextPeriodic = new Date(nextPeriodicDateStr);

    lastEnd.setHours(0, 0, 0, 0);
    nextPeriodic.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);

    const timeSinceLast = currentDate.getTime() - lastEnd.getTime();
    const daysSinceLast = timeSinceLast / ONE_DAY_MS;

    const timeToNext = nextPeriodic.getTime() - currentDate.getTime();
    const daysToNext = timeToNext / ONE_DAY_MS;

    if (daysSinceLast >= 90 && daysToNext > 60) {
        return "Volume Opportunity: Eligible for Special Report >90 days observed.";
    }

    return null;
};

/**
 * Optimize Strategy Algorithm
 * 
 * Recommends trait averages based on seniority and report importance.
 * Goals:
 * 1. Maximize "Transfer" reports for senior ranks (Money Makers).
 * 2. Assign lower "shielding" scores to junior/periodic reports.
 * 3. Keep overall average close to current RSCA.
 */
export interface OptimizableReport {
    id: string;
    rank: string; // "O-3", "E-6" etc
    type: string; // 'Periodic', 'Transfer', 'Gain', 'Special', 'Promotion'
    traitAverage: number;
    [key: string]: any; // Allow other props to pass through
}

const RANK_VALUE: Record<string, number> = {
    'O-6': 100, 'O-5': 90, 'O-4': 80, 'O-3': 70, 'O-2': 60, 'O-1': 50,
    'W-5': 85, 'W-4': 75, 'W-3': 65, 'W-2': 55,
    'E-9': 45, 'E-8': 40, 'E-7': 35, 'E-6': 30, 'E-5': 20, 'E-4': 10
};

export const optimizeStrategy = <T extends OptimizableReport>(
    reports: T[],
    currentRsca: number
): T[] => {
    // 1. Sort reports by "Priority"
    // Priority Score = RankValue + TypeBonus (Transfer=20, Promo=10, Periodic=0)
    const scored = reports.map(r => {
        let score = RANK_VALUE[r.rank] || 0;
        if (r.type === 'Transfer' || r.type === 'Deployment') score += 20;
        if (r.type === 'Promotion') score += 15;
        if (r.type === 'Special') score += 5;
        return { ...r, _priorityScore: score };
    });

    scored.sort((a, b) => b._priorityScore - a._priorityScore);

    // 2. Assign Values
    // Strategy: 
    // Top 20% (High Priority): 5.00 ("EP")
    // Next 30%: CurrentRSCA + 0.20 ("MP" / Strong Promotable)
    // Bottom 50%: CurrentRSCA - 0.20 ("P" / Setup)
    // *Ensure no one goes below 3.00 unless special?

    const total = scored.length;
    const topCutoff = Math.floor(total * 0.2);
    const midCutoff = Math.floor(total * 0.5);

    const optimized = scored.map((r, index) => {
        let newTrait = r.traitAverage;

        if (r.type === 'Gain') {
            // Gains usually don't get traits or are NOB, leave as is or set NOB logic elsewhere
            return r;
        }

        if (index < topCutoff) {
            // Top Tier: Maximize
            newTrait = 5.00;
        } else if (index < midCutoff) {
            // Mid Tier: Maintain/Slight Growth
            newTrait = Math.min(5.00, currentRsca + 0.15);
        } else {
            // Bottom Tier: Shield
            // Don't tank them too hard, but keep below RSCA
            newTrait = Math.max(3.00, currentRsca - 0.25);
        }

        // Add some jitter so it doesn't look robotic?
        // No, user wants optimization.

        // Round to 2 decimals
        newTrait = Math.round(newTrait * 100) / 100;

        // Remove temporary score
        const { _priorityScore, ...rest } = r;
        return { ...rest, traitAverage: newTrait } as unknown as T;
    });

    return optimized;
};
