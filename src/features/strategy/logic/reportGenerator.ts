import type { RosterMember, ReportingSeniorConfig } from '@/types/roster';
import type { SummaryGroup, Report } from '@/types';
import { PERIODIC_SCHEDULE } from '@/lib/constants';

const formatISODate = (year: number, monthIndex: number, day: number) => {
    // Month Index is 0-based
    const mm = String(monthIndex + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
};

const getCompetitiveGroup = (member: RosterMember): string => {
    // E.g. "O-3 URL", "O-4 RL", "E-6 OS"
    const { rank, designator } = member;

    // Officer Groups
    if (rank.startsWith('O') || rank.startsWith('W')) {
        let category = 'OFF';
        if (designator) {
            if (['1110', '1120', '1310', '1320', '1300'].includes(designator)) category = 'URL';
            else if (['1200', '1800', '1810', '1820', '1830'].includes(designator)) category = 'RL';
            else if (['6410', '6130', '6160', '6180'].includes(designator)) category = 'LDO'; // Limited Duty
            else if (designator.startsWith('7')) category = 'CWO';
            else category = 'STAFF'; // Medical, Supply, etc. simplified
        }
        return `${category} ${rank}`;
    }

    // Enlisted Groups (Placeholder for future)
    // if (rank.startsWith('E')) {
    //     if (['E-7', 'E-8', 'E-9'].includes(rank)) return `CPO ${rank}`;
    //     return `ENL ${rank}`;
    // }

    return `${rank} GROUP`;
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
    const rsEndDate = new Date(rsConfig.changeOfCommandDate); // e.g. 2026-06-01

    // Helper to get-or-create Group
    const ensureGroup = (compGroup: string, endDate: string): SummaryGroup => {
        const id = `sg-${compGroup.replace(/\s+/g, '-')}-${endDate}`;
        if (!groupsMap.has(id)) {
            groupsMap.set(id, {
                id,
                name: compGroup,
                periodEndDate: endDate,
                status: 'Pending',
                reports: []
            });
        }
        return groupsMap.get(id)!;
    };

    roster.forEach(member => {
        const compGroup = getCompetitiveGroup(member);
        const memberPRD = new Date(member.prd);

        // Loop through years from Base Year until RS Detach Date
        // We go a bit past base year to cover the full tenure
        let currentYear = baseYear;
        const endYear = rsEndDate.getFullYear();

        // -----------------------------------------------------
        // 1. ITERATE PERIODIC CYCLES (Long Term Projection)
        // -----------------------------------------------------
        while (currentYear <= endYear + 1) { // Look ahead slightly
            const periodicMonth = PERIODIC_SCHEDULE[member.rank as string];

            if (periodicMonth) {
                const pMonthIndex = periodicMonth - 1;
                // Periodic Date for this year
                const pDate = new Date(currentYear, pMonthIndex + 1, 0); // Last day of month

                // Constraints:
                // 1. Report Date must be BEFORE RS Leaves
                // 2. Report Date must be BEFORE Member Leaves (PRD)
                // 3. Member must have reported BEFORE Report Date
                const memberRepDate = new Date(member.dateReported);

                if (pDate <= rsEndDate && pDate <= memberPRD && pDate >= memberRepDate) {
                    const pDateStr = formatISODate(currentYear, pMonthIndex, pDate.getDate());
                    const group = ensureGroup(compGroup, pDateStr);

                    // Avoid duplication
                    if (!group.reports.some(r => r.memberId === member.id)) {
                        /* 
                           Determine Status:
                           If date is in the past (relative to NOW/Simulation), it's 'Submitted' or 'Final'.
                           If it's the current active cycle, it's 'Draft'.
                           If it's future, it's 'Projected'.
                        */
                        const today = new Date(); // In real app, this might be injected 'simulationDate'
                        let status: Report['draftStatus'] = 'Projected';
                        if (pDate < today) status = 'Final'; // Simplification for demo
                        // For the immediate upcoming cycle, we might want 'Draft'. 
                        // For now, let's treat everything > today as 'Projected' defaults, 
                        // logic elsewhere promotes them to 'Draft'.

                        // "Kiss Goodbye" check for Transfer logic within Periodic? 
                        // Valid Transfer reports replace Periodics if within 3 months, 
                        // but here we just project the periodic cycle slots.

                        const reportId = `r-${member.id}-periodic-${currentYear}`;
                        const calculatedAvg = projections[reportId] ?? projections[member.id] ?? calculateStartValue(member, 'Periodic', rsConfig);

                        const report: Report = {
                            id: reportId,
                            memberId: member.id,
                            periodEndDate: pDateStr,
                            type: 'Periodic',
                            traitAverage: calculatedAvg,
                            promotionRecommendation: calculatedAvg > 0 ? 'P' : 'NOB',
                            draftStatus: status, // <--- KEY CHANGE
                            traitGrades: {},
                            isAdverse: false,
                            notObservedReport: false,
                            grade: member.rank,
                            designator: member.designator,
                            dateReported: member.dateReported,
                            reportingSeniorName: rsConfig.name,
                        };
                        group.reports.push(report);
                    }
                }
            }
            currentYear++;
        }

        // -----------------------------------------------------
        // 2. MEMBER TRANSFER (PRD) REPORT
        // -----------------------------------------------------
        // If Member leaves BEFORE RS leaves, they get a Transfer Report at PRD.
        if (memberPRD < rsEndDate && memberPRD > new Date(member.dateReported)) {
            const prdStr = formatISODate(memberPRD.getFullYear(), memberPRD.getMonth(), memberPRD.getDate());
            const group = ensureGroup(compGroup, prdStr);

            const reportId = `r-${member.id}-transfer-${memberPRD.getFullYear()}`;
            const calculatedAvg = projections[reportId] ?? projections[member.id] ?? calculateStartValue(member, 'Transfer', rsConfig);
            const report: Report = {
                id: reportId,
                memberId: member.id,
                periodEndDate: prdStr,
                type: 'Detachment', // Transfer is a Detachment of Individual
                detachmentOfIndividual: true,
                traitAverage: calculatedAvg, // Boosted by logic
                promotionRecommendation: 'EP', // Usually Transfer is EP if good
                draftStatus: 'Projected',
                traitGrades: {},
                grade: member.rank,
                designator: member.designator,
                reportingSeniorName: rsConfig.name,
            };
            group.reports.push(report);
        }

        // -----------------------------------------------------
        // 3. RS DETACH REPORT (The "End of Tour" Mass Report)
        // -----------------------------------------------------
        // Occurs ON `rsEndDate`.
        // Member must be Onboard (PRD > RS Date)
        // Member must have reported before RS Date.
        if (memberPRD >= rsEndDate && new Date(member.dateReported) < rsEndDate) {
            const rsDateStr = rsConfig.changeOfCommandDate;
            const group = ensureGroup(compGroup, rsDateStr);

            if (!group.reports.some(r => r.memberId === member.id)) {
                const reportId = `r-${member.id}-rsdetach-${rsEndDate.getFullYear()}`;
                const calculatedAvg = projections[reportId] ?? projections[member.id] ?? calculateStartValue(member, 'Detachment', rsConfig);
                const report: Report = {
                    id: reportId,
                    memberId: member.id,
                    periodEndDate: rsDateStr,
                    type: 'Detachment',
                    traitAverage: calculatedAvg,
                    promotionRecommendation: calculatedAvg > 0 ? 'P' : 'NOB',
                    draftStatus: 'Projected',
                    traitGrades: {},
                    grade: member.rank,
                    designator: member.designator,
                    reportingSeniorName: rsConfig.name,
                };
                group.reports.push(report);
            }
        }
    });

    return Array.from(groupsMap.values()).sort((a, b) => a.periodEndDate.localeCompare(b.periodEndDate));
};
