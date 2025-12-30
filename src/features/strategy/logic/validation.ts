

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Helper to parse YYYY-MM-DD string to Date object
 */
const parseDate = (dateStr: string): Date => new Date(dateStr);

/**
 * Zero-Gap Continuity Check
 * NewReportStartDate MUST equal PreviousReportEndDate + 1 day.
 */
export const checkZeroGap = (prevEndDateStr: string, newStartDateStr: string): { isValid: boolean; message?: string } => {
    const prevEnd = parseDate(prevEndDateStr);
    const newStart = parseDate(newStartDateStr);

    // Normalize to midnight to avoid time zone drift issues in simple Day checks
    prevEnd.setHours(0, 0, 0, 0);
    newStart.setHours(0, 0, 0, 0);

    const diffTime = newStart.getTime() - prevEnd.getTime();
    const diffDays = diffTime / ONE_DAY_MS;

    if (diffDays === 1) {
        return { isValid: true };
    } else if (diffDays > 1) {
        return { isValid: false, message: `Gap detected: ${diffDays - 1} days missing between reports.` };
    } else {
        return { isValid: false, message: `Overlap detected: Start date is ${Math.abs(diffDays - 1)} days before previous end date.` };
    }
};

/**
 * Forced Distribution (Quota) Check
 * Max EP = 20% (Rounded)
 * Max EP+MP = 60% (Rounded)
 */
export const checkQuota = (
    groupSize: number,
    epCount: number,
    mpCount: number
): { isValid: boolean; epLimit: number; combinedLimit: number; message?: string } => {
    const epLimit = Math.round(groupSize * 0.20);
    const combinedLimit = Math.round(groupSize * 0.60);

    if (epCount > epLimit) {
        return {
            isValid: false,
            epLimit,
            combinedLimit,
            message: `EP Usage Exceeded: ${epCount} assigned, Max allowed is ${epLimit}.`
        };
    }

    if ((epCount + mpCount) > combinedLimit) {
        return {
            isValid: false,
            epLimit,
            combinedLimit,
            message: `Combined EP+MP Usage Exceeded: ${epCount + mpCount} assigned, Max allowed is ${combinedLimit}.`
        };
    }

    return { isValid: true, epLimit, combinedLimit };
};
