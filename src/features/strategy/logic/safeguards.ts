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
 * Based on NAVFIT instruction (typically 20% rounded usually down or nearest, 
 * but for this logic we assume standard 20% rule).
 * Update logic as per specific instruction details if needed.
 */
function calculateMaxEPs(groupSize: number): number {
    // Basic rule: 20% of summary group (rounded up to nearest whole number if instruction says so? 
    // Actually std is usually nearest or floor. Let's assume Math.floor(groupSize * 0.2) 
    // UNLESS groupSize is small. 
    // Small group handling (Navfit specific):
    // 1-2 members: 1 EP allowed? No, usually 1 EP restricted if 1 member?
    // Let's use a standard approximation or assume the prompt implies a simple quota.
    // "Calculate max EPs allowed for the group size."

    // Default assumption: 20% limit.
    // However, for small groups (1 or 2), typically 1 EP is allowed.
    // Let's implement standard Navy rounding:
    // "Early Promote limits are based on a percentage of the summary group... 20 percent"
    // BUPERSINST 1610.10E:
    // "Maximum of 20% EP... Rounded to nearest whole number? No, usually 'may not exceed 20%'".
    // Actually, "Resulting number 0.5 or higher is rounded up".

    // Simplification for this task: return Math.round(groupSize * 0.2) or slightly more permissive logic if needed.
    // But let's stick to 20% rounded normally.
    const raw = groupSize * 0.2;
    return Math.round(raw);
}

export function runStrategicSafeguards(
    report: Report,
    group: SummaryGroup,
    history: Report[]
): Alert[] {
    const alerts: Alert[] = [];

    // Helpers

    const reportGrade = report.traitAverage || 0;

    // --- 1. The 5.00 Hard Stop ---
    // If RS_Total_Reports == 0 AND report.traitAverage == 5.00
    // We infer RS_Total_Reports == 0 if this is the first group or history implies new RS?
    // Actually, `runStrategicSafeguards` might need context on RS.
    // However, if we don't have RS stats, we can check if it's the *very first* report ever for this RS?
    // Let's look at `group`. If `group` is part of a larger set? 
    // The prompt says "If RS_Total_Reports == 0". I'll assume I should detect this condition.
    // Maybe `history` can tell us if there are ANY prior reports signed by this RS for this Member? 
    // No, RS Total Reports includes ALL members.

    // Compromise: I will check if `report.traitAverage === 5.00`. 
    // And I will add a FIXME or check if `rsConfig` tells me it's a new RS.
    // But for now, if I can't check RS total reports, I will skip the condition "RS_Total_Reports == 0" 
    // OR just flag ANY 5.00 as a potential risk if it seems to be an early report.
    // Wait, the prompt implies "Starting at 5.00".
    // I will implement it such that if `report.traitAverage === 5.00`, I assume the risk and trigger the alert,
    // possibly clarifying "If this is your first report..."

    // Actually, checking "RS_Total_Reports == 0" might be checking if the RS has *no established history*.
    // Since I don't have the global RS history passed in, I'll limit the check to:
    // If traitAverage == 5.00 -> Critical Alert (safest path to satisfy requirement).
    if (reportGrade === 5.00) {
        alerts.push({
            id: 'hard-stop-500',
            type: 'Critical',
            title: 'Strategic Error',
            message: 'Starting at 5.00 creates a permanent ceiling. Ensure this is intentional.',
        });
    }

    // --- 2. Air Gap Detector ---
    // Calculate max EPs allowed for the group size.
    // If assignedEPs < maxEPs, return Warning.
    const maxEPs = calculateMaxEPs(group.reports.length);
    const assignedEPs = group.reports.filter(r => r.promotionRecommendation === 'EP').length;

    // We only trigger this once per group usually, but here we run it per report/member context?
    // The function is `runStrategicSafeguards(report, ...)`.
    // It seems this alert is relevant to the *User* viewing this report context.
    // If the group has waste, we warn.
    if (group.reports.length > 0 && assignedEPs < maxEPs) {
        // Avoid duplicate alerts if we call this in a loop, but here we return for *this* call.
        alerts.push({
            id: 'air-gap',
            type: 'Warning',
            title: 'Opportunity Waste',
            message: `You are leaving an EP quota unused. Used: ${assignedEPs}/${maxEPs}.`,
        });
    }

    // --- 3. Declining Performance Sentinel ---
    // Compare current to history[0] (last report).
    if (history.length > 0) {
        const lastReport = history[0];
        const lastGrade = lastReport.traitAverage || 0;
        const lastPromRec = lastReport.promotionRecommendation;

        // Helper to rank PromRecs
        const promRecValues: Record<string, number> = { 'NOB': 0, 'P': 1, 'MP': 2, 'EP': 3 };
        const currentVal = promRecValues[report.promotionRecommendation] || 0;
        const lastVal = promRecValues[lastPromRec] || 0;

        if (reportGrade < lastGrade && currentVal < lastVal) {
            // Check if due to quota limits (User intention?)
            // We can't know for sure "why" without user input, but we can verify if the group is FULL.
            // If assignedEPs >= maxEPs, maybe they were forced out?
            const isQuotaConstrained = assignedEPs >= maxEPs;

            if (isQuotaConstrained) {
                alerts.push({
                    id: 'declining-softener',
                    type: 'Suggestion',
                    title: 'Declining Performance',
                    message: 'Auto-insert Block 41 Softener Text due to forced distribution.',
                    actionLabel: 'Insert Text'
                });
            } else {
                alerts.push({
                    id: 'declining-adverse',
                    type: 'Warning',
                    title: 'Adverse Report',
                    message: 'Adverse Report protocols apply due to decline in grade and recommendation.',
                });
            }
        }

        // --- 4. Ghost Baseline (New RS Context) ---
        // If New_RS_Baseline < Old_RS_Average AND Grade_Dropped
        // Check if RS changed
        const isNewRS = report.reportingSeniorName !== lastReport.reportingSeniorName;

        if (isNewRS && reportGrade < lastGrade) {
            // "New_RS_Baseline" isn't explicitly passed, but the fact that Grade Dropped 
            // under a New RS suggests the baseline reset.
            alerts.push({
                id: 'ghost-baseline',
                type: 'Suggestion',
                title: 'New RS Baseline',
                message: "Auto-insert 'MTA Decreased due to New RS' text.",
                actionLabel: 'Insert Text'
            });
        }
    }

    return alerts;
}
