import type { Report, SummaryGroup } from '@/types';

export interface Alert {
    id: string; // unique
    type: 'Critical' | 'Warning' | 'Suggestion';
    title: string;
    message: string;
    actionLabel?: string;
    offendingValue?: string | number;
}

/**
 * Calculates the max number of Early Promotes allowed for a given group size.
 * Based on rule: 20% of summary group.
 */
function calculateMaxEPs(groupSize: number): number {
    return Math.floor(groupSize * 0.2);
}

export function runStrategicSafeguards(
    report: Report,
    group: SummaryGroup,
    history: Report[]
): Alert[] {
    const alerts: Alert[] = [];

    // Helpers
    const reportGrade = report.traitAverage || 0;

    // Determine if this is a "New RS" context (RS_Total_Reports == 0 equivalent proxy)
    // We assume if no reports in history share this Reporting Senior's name/ID, they are new to this member.
    // Note: This is an imperfect proxy for "Global RS Total Reports == 0", but valid for "First report on this member by this RS".
    const isNewRS = !history.some(r => r.reportingSeniorName === report.reportingSeniorName);

    // --- 1. The 5.00 Hard Stop ---
    // Rule: If RS_Total_Reports == 0 (New RS) AND report.traitAverage == 5.00
    if (isNewRS && reportGrade === 5.00) {
        alerts.push({
            id: 'hard-stop-500',
            type: 'Critical',
            title: 'Strategic Error',
            message: 'Starting at 5.00 creates a permanent ceiling.',
        });
    }

    // --- 2. Air Gap Detector ---
    // Rule: If assignedEPs < maxEPs
    // Calculate max EPs allowed for the group size (20%).
    const maxEPs = calculateMaxEPs(group.reports.length);
    const assignedEPs = group.reports.filter(r => r.promotionRecommendation === 'EP').length;

    if (group.reports.length > 0 && assignedEPs < maxEPs) {
        alerts.push({
            id: 'air-gap',
            type: 'Warning',
            title: 'Opportunity Waste',
            message: 'You are leaving an EP quota unused.',
        });
    }

    // --- 3. Declining Performance Sentinel ---
    // Rule: Compare current grade to history[0] (last report).
    // If current < last AND current_PromRec < last_PromRec
    if (history.length > 0) {
        const lastReport = history[0];
        const lastGrade = lastReport.traitAverage || 0;
        const lastPromRec = lastReport.promotionRecommendation;

        // Helper to rank PromRecs
        const promRecValues: Record<string, number> = { 'NOB': 0, 'P': 1, 'MP': 2, 'EP': 3 };
        const currentVal = promRecValues[report.promotionRecommendation] || 0;
        const lastVal = promRecValues[lastPromRec] || 0;

        if (reportGrade < lastGrade && currentVal < lastVal) {
            // Check if it was due to quota limits (forced distribution).
            // Logic: If quotas are full (assignedEPs >= maxEPs), we assume forced distribution.
            const isForcedDistribution = assignedEPs >= maxEPs;

            if (isForcedDistribution) {
                alerts.push({
                    id: 'declining-softener',
                    type: 'Suggestion',
                    title: 'Auto-insert Block 41 Softener Text',
                    message: 'Performance decline likely due to forced distribution.',
                    actionLabel: 'Insert Text'
                });
            } else {
                alerts.push({
                    id: 'declining-adverse',
                    type: 'Warning',
                    title: 'Adverse Report protocols apply',
                    message: 'Significant decline in performance detected.',
                });
            }
        }
    }

    return alerts;
}
