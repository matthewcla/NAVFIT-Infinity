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
