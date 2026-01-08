import type { RosterMember, ReportingSeniorConfig } from '@/types/roster';
import type { SummaryGroup, Report } from '@/types';
import { PERIODIC_SCHEDULE, PERIODIC_DAYS } from '@/lib/constants';
import { getCompetitiveCategory, getCategoryLabel } from './competitiveGroupUtils';

const formatISODate = (year: number, monthIndex: number, day: number) => {
    // Month Index is 0-based
    const mm = String(monthIndex + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
};

interface CompGroupKey {
    paygrade: string;
    designator: string;
    promotionStatus: 'REGULAR' | 'FROCKED' | 'SELECTED' | 'SPOT';
    label: string;
    categoryCode: string; // Add category code for grouping ID
}

const getCompetitiveGroup = (member: RosterMember): CompGroupKey => {
    const { rank, payGrade, designator, promotionStatus = 'REGULAR' } = member;

    // Robust Fallback: Rank Title might be missing. Use PayGrade as fallback.
    // User requested "URL O-1", "E-6". Prefer PayGrade (Code) over Rank (Title) for the Group Label.
    const displayRank = payGrade || rank;

    // Robust Logic: Is Officer?
    // Check PAYGRADE (e.g. O-1, W-2). Rank (Title) is unreliable for this check.
    const isOfficer = payGrade ? (payGrade.startsWith('O') || payGrade.startsWith('W')) : false;

    let categoryLabel = '';
    let categoryCode = '';

    if (isOfficer && designator) {
        const cat = getCompetitiveCategory(designator);
        categoryLabel = getCategoryLabel(cat);
        categoryCode = cat.code;
    }

    // Label Construction
    // Officers: "URL O-3" or "STAFF O-3"
    // Enlisted: "E-6" (No designator)
    // CWO: "W-2" (Avoid "CWO W-2")
    const finalCategoryLabel = categoryLabel === 'CWO' ? '' : categoryLabel;
    const labelBase = isOfficer && finalCategoryLabel ? `${finalCategoryLabel} ${displayRank}` : displayRank;
    const label = `${labelBase} ${promotionStatus !== 'REGULAR' ? promotionStatus : ''}`.trim();

    return {
        paygrade: payGrade || rank, // Prefer code
        designator: designator,
        promotionStatus: promotionStatus,
        label: label,
        categoryCode: categoryCode
    };
};

/**
 * Finds the Reporting Senior in the roster based on Milestone Tour ("CO", "MAJ CMD") or Highest Rank.
 * Returns the detachDate if found, otherwise null.
 */
const findReportingSenior = (roster: RosterMember[]): RosterMember | null => {
    // 1. Look for explicit CO/Command tours
    const coMembers = roster.filter(m =>
        m.milestoneTour && (
            m.milestoneTour.includes('CO') ||
            m.milestoneTour.includes('COMMAND') ||
            m.milestoneTour.includes('MAJ CMD')
        )
    );

    // Filter out XO if possible, unless they are the only ones (Acting?)
    // But usually we want the real CO.
    // If we have "XO/CO" and "MAJ CMD", prefer "MAJ CMD" or pure "CO" if possible.
    // For now, let's sort by Paygrade descending, then by milestone priority.

    if (coMembers.length > 0) {
        // Sort by rank (desc)
        coMembers.sort((a, b) => {
            // Simple string comparison for O-6 vs O-5 works well enough for standard ranks
            // but let's be safer if needed. However, O-6 > O-5 lexicographically? No.
            // O-6 > O-5.
            // Let's just pick the first one found for now or refine if needed.
            // Actually, we should probably stick to the highest rank found in the CO list.
            if (a.payGrade > b.payGrade) return -1;
            if (a.payGrade < b.payGrade) return 1;
            return 0;
        });
        return coMembers[0];
    }

    // 2. Fallback: Highest Ranking Officer
    // Sort entire roster by paygrade?
    // This is expensive and risky if the CO isn't the highest rank (unlikely but possible).
    // Let's just return null and rely on config if no explicit CO is found.
    return null;
};


// --- Logic Engine ---

/**
 * Calculates a smart starting trait average for a projected report.
 * Based on:
 * 1. Seniority (Higher ranks start higher)
 * 2. Previous Permormance (Last Trait)
 * 3. Career Milestone (Transfer/PRD gets a boost)
 * 4. Target Trajectory
 */
const calculateStartValue = (
    member: RosterMember,
    reportType: string,
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    _rsConfig: ReportingSeniorConfig
): number => {
    // 1. Establish Baseline based on Rank (Seniority)
    // Junior Officers start lower to allow growth; Seniors start competitive.
    let baseline = 3.40; // Default (P)
    if (['O-5', 'O-6', 'W-5', 'E-9'].includes(member.rank)) baseline = 4.00; // MP
    else if (['O-4', 'W-4', 'E-8'].includes(member.rank)) baseline = 3.80;
    else if (['O-3', 'W-3', 'E-7'].includes(member.rank)) baseline = 3.60;

    // 2. Adjust for History
    if (member.lastTrait && member.lastTrait > 0) {
        // If they have a previous ave, start slightly above it (trajectory)
        // unless it was absurdly high, then maintain.
        baseline = Math.max(baseline, member.lastTrait);

        // Slight growth factor for projection
        if (baseline < 4.80) baseline += 0.05;
    }

    // 3. "Kiss Goodbye" / Transfer Boost
    // If this report coincides with their PRD, it's a Transfer report.
    // Transfer reports are typically "One up" calls.
    if (reportType === 'Detachment' || reportType === 'Transfer') { // We need to detect Transfer intent
        baseline += 0.10;
    }

    // 4. Cap at 5.00
    return Math.min(5.00, Math.round(baseline * 100) / 100);
};

export const generateSummaryGroups = (
    roster: RosterMember[],
    rsConfig: ReportingSeniorConfig,
    baseYear: number = 2025,
    projections: Record<string, number> = {}
): SummaryGroup[] => {
    const groupsMap = new Map<string, SummaryGroup>();

    // 1. Resolve Reporting Senior Dates
    const rsMember = findReportingSenior(roster);

    // Determine RS Detach Date: Prefer found member's detachDate, then config date
    const rsDetachDateStr = (rsMember && rsMember.detachDate)
        ? rsMember.detachDate
        : rsConfig.changeOfCommandDate;

    const rsEndDate = new Date(rsDetachDateStr); // e.g. 2026-06-01

    // Helper to get-or-create Group
    const ensureGroup = (key: CompGroupKey, endDate: string): SummaryGroup => {
        // Unique ID must include all segmentation factors
        // Use categoryCode instead of raw designator to group "1110" and "1310" together under "URL"
        const idParts = [
            key.paygrade,
            key.categoryCode || key.designator || 'NODESIG', // Fallback for Enlisted or missing
            key.promotionStatus,
            endDate
        ].join('|');

        const id = `sg-${idParts.replace(/[\s|]+/g, '-')}`;

        if (!groupsMap.has(id)) {
            groupsMap.set(id, {
                id,
                name: key.label, // "O-3 URL Frocked"
                periodEndDate: endDate,
                status: 'Pending',
                reports: [],
                paygrade: key.paygrade,
                designator: key.designator,
                // The key needs to be human readable but unique per group logic
                // For Officers: "O-3 URL"
                // For Enlisted: "E-6"
                competitiveGroupKey: key.label,
                promotionStatus: key.promotionStatus
            });
        }
        return groupsMap.get(id)!;
    };


    roster.forEach(member => {
        // Skip the Reporting Senior themselves from planning their own reports
        if (rsMember && member.id === rsMember.id) return;

        const groupKey = getCompetitiveGroup(member);

        // Resolve Member Separation Date (PRD / Detach Date)
        // Priority: detachDate > edd > prd
        const memberExitStr = member.detachDate || member.edd || member.prd;
        const memberExitDate = new Date(memberExitStr);

        // Helper to calc remaining reports
        const getReportsRemaining = (rDate: string) => {
            const d = new Date(rDate);
            const years = memberExitDate.getFullYear() - d.getFullYear();
            return Math.max(0, years);
        };

        // Loop through years from Base Year until RS Detach Date
        // We go a bit past base year to cover the full tenure
        let currentYear = baseYear;
        const endYear = rsEndDate.getFullYear();

        // -----------------------------------------------------
        // 1. ITERATE PERIODIC CYCLES (Long Term Projection)
        // -----------------------------------------------------
        while (currentYear <= endYear + 1) { // Look ahead slightly
            // Rank might be "ENS", we need paygrade key for schedule if possible, or fallback
            // The PERIODIC_SCHEDULE uses paygrades (O-1, E-6) or titles?
            // src/lib/constants.ts uses 'O-6', 'E-5'. So we should use payGrade code.
            // Fallback to rank if payGrade is missing (legacy).
            const rankKey = member.payGrade || member.rank;
            const periodicMonth = PERIODIC_SCHEDULE[rankKey];

            if (periodicMonth) {
                const pMonthIndex = periodicMonth - 1;

                // Determine Day: 15th or Last Day?
                const daySetting = PERIODIC_DAYS[rankKey] ?? 0; // Default to 0 (Last Day) if unknown

                let pDate: Date;
                if (daySetting === 15) {
                    pDate = new Date(currentYear, pMonthIndex, 15);
                } else {
                    // Last Day of Month
                    pDate = new Date(currentYear, pMonthIndex + 1, 0);
                }

                // Constraints:
                // 1. Report Date must be BEFORE RS Leaves (Strict < or <= depends on if RS signs on their last day. Usually YES).
                // 2. Report Date must be BEFORE Member Leaves (PRD)
                // 3. Member must have reported BEFORE Report Date
                const memberRepDate = new Date(member.dateReported);

                // We allow pDate == rsEndDate (RS signs on last day)
                // We check if member is still onboard.
                if (pDate <= rsEndDate && pDate <= memberExitDate && pDate >= memberRepDate) {
                    const pDateStr = formatISODate(currentYear, pMonthIndex, pDate.getDate());
                    const group = ensureGroup(groupKey, pDateStr);

                    // Avoid duplication
                    if (!group.reports.some(r => r.memberId === member.id)) {
                        /* 
                           Determine Status:
                           If date is in the past (relative to NOW/Simulation), it's 'Submitted' or 'Final'.
                           If it's the current active cycle, it's 'Draft'.
                           If it's future, it's 'Planned'.
                        */
                        const today = new Date(); // In real app, this might be injected 'simulationDate'
                        let status: Report['draftStatus'] = 'Planned';
                        if (pDate < today) status = 'Final'; // Simplification for demo
                        // For the immediate upcoming cycle, we might want 'Draft'. 
                        // For now, let's treat everything > today as 'Planned' defaults, 
                        // logic elsewhere promotes them to 'Draft'.

                        // "Kiss Goodbye" check for Transfer logic within Periodic? 
                        // Valid Transfer reports replace Periodics if within 3 months, 
                        // but here we just project the periodic cycle slots.

                        const reportId = `r-${member.id}-periodic-${currentYear}`;
                        const calculatedAvg = projections[reportId] ?? projections[member.id] ?? calculateStartValue(member, 'Periodic', rsConfig);

                        const report: Report = {
                            id: reportId,
                            memberId: member.id,
                            memberRank: member.rank,
                            memberName: `${member.lastName}, ${member.firstName} ${member.middleInitial || ''}`.trim(),
                            periodEndDate: pDateStr,
                            type: 'Periodic',
                            traitAverage: calculatedAvg,
                            promotionRecommendation: calculatedAvg > 0 ? 'P' : 'NOB',
                            draftStatus: status,
                            traitGrades: {},
                            isAdverse: false,
                            notObservedReport: false,
                            grade: member.rank,
                            designator: member.designator,
                            promotionStatus: member.promotionStatus, // Explicitly pass status
                            dateReported: member.dateReported,
                            reportingSeniorName: rsConfig.name,
                            reportsRemaining: getReportsRemaining(pDateStr),
                        };
                        group.reports.push(report);
                    }
                }
            }
            currentYear++;
        }

        // -----------------------------------------------------
        // 2. MEMBER TRANSFER (DETACHMENT OF INDIVIDUAL) REPORT
        // -----------------------------------------------------
        // If Member leaves BEFORE RS leaves, they get a Transfer Report at Detach Date.
        if (memberExitDate < rsEndDate && memberExitDate > new Date(member.dateReported)) {
            const prdStr = formatISODate(memberExitDate.getFullYear(), memberExitDate.getMonth(), memberExitDate.getDate());
            const group = ensureGroup(groupKey, prdStr);

            const reportId = `r-${member.id}-transfer-${memberExitDate.getFullYear()}`;
            const calculatedAvg = projections[reportId] ?? projections[member.id] ?? calculateStartValue(member, 'Transfer', rsConfig);
            const report: Report = {
                id: reportId,
                memberId: member.id,
                memberRank: member.rank,
                memberName: `${member.lastName}, ${member.firstName} ${member.middleInitial || ''}`.trim(),
                periodEndDate: prdStr,
                type: 'Detachment', // Transfer is a Detachment of Individual
                detachmentOfIndividual: true,
                traitAverage: calculatedAvg, // Boosted by logic
                promotionRecommendation: 'EP', // Usually Transfer is EP if good
                draftStatus: 'Planned',
                traitGrades: {},
                grade: member.rank,
                designator: member.designator,
                promotionStatus: member.promotionStatus,
                reportingSeniorName: rsConfig.name,
                reportsRemaining: 0, // Transfer is last report
            };
            group.reports.push(report);
        }

        // -----------------------------------------------------
        // 3. RS DETACH REPORT (The "End of Tour" Mass Report)
        // -----------------------------------------------------
        // Occurs ON `rsEndDate`.
        // Member must be Onboard (Exit Date >= RS Date)
        // Member must have reported before RS Date.
        if (memberExitDate >= rsEndDate && new Date(member.dateReported) < rsEndDate) {
            const group = ensureGroup(groupKey, rsDetachDateStr);

            if (!group.reports.some(r => r.memberId === member.id)) {
                const reportId = `r-${member.id}-rsdetach-${rsEndDate.getFullYear()}`;
                const calculatedAvg = projections[reportId] ?? projections[member.id] ?? calculateStartValue(member, 'Detachment', rsConfig);
                const report: Report = {
                    id: reportId,
                    memberId: member.id,
                    memberRank: member.rank,
                    memberName: `${member.lastName}, ${member.firstName} ${member.middleInitial || ''}`.trim(),
                    periodEndDate: rsDetachDateStr,
                    type: 'Detachment',
                    traitAverage: calculatedAvg,
                    promotionRecommendation: calculatedAvg > 0 ? 'P' : 'NOB',
                    draftStatus: 'Planned',
                    traitGrades: {},
                    grade: member.rank,
                    designator: member.designator,
                    promotionStatus: member.promotionStatus,
                    reportingSeniorName: rsConfig.name,
                    reportsRemaining: getReportsRemaining(rsDetachDateStr),
                };
                group.reports.push(report);
            }
        }
    });

    // Post-process groups to set correct status based on simulation date (Today)
    const today = new Date();
    const finalGroups = Array.from(groupsMap.values()).map(group => {
        const endDate = new Date(group.periodEndDate);

        let status = group.status;

        // If simulated status is still 'Pending', derive one
        if (status === 'Pending') {
            if (endDate < today) {
                // Past Cycle
                // Simulate some random status variety for Archive
                const rand = Math.random();
                if (rand > 0.9) status = 'Rejected';
                else if (rand > 0.7) status = 'Submitted';
                else status = 'Final';
            } else {
                // Current/Future Cycle
                // If it's the very next one, maybe 'Drafting' or 'Planning'
                // For simplicity, everything future is 'Drafting' unless specific logic
                status = 'Draft';

                // If it's way out (more than 3 months), set status to 'Planned'
                const monthsOut = (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);
                if (monthsOut > 3) status = 'Planned';
            }
        }

        return { ...group, status };
    });

    return finalGroups.sort((a, b) => a.periodEndDate.localeCompare(b.periodEndDate));
};
