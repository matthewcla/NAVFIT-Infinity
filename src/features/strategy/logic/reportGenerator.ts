import type { RosterMember, ReportingSeniorConfig } from '@/types/roster';
import type { SummaryGroup, Report } from '@/types';
import { PERIODIC_SCHEDULE } from '@/lib/constants';

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
}

const getCompetitiveGroup = (member: RosterMember): CompGroupKey => {
    const { rank, designator, promotionStatus = 'REGULAR' } = member;

    // Normalize Category for Label
    let category = 'OFF';
    if (rank.startsWith('O') || rank.startsWith('W')) {
        if (designator) {
            if (['1110', '1120', '1310', '1320', '1300'].includes(designator)) category = 'URL';
            else if (['1200', '1800', '1810', '1820', '1830'].includes(designator)) category = 'RL';
            else if (['6410', '6130', '6160', '6180'].includes(designator)) category = 'LDO';
            else if (designator.startsWith('7')) category = 'CWO';
            else category = 'STAFF';
        }
    } else {
        category = ''; // Was 'ENL', now empty as requested
    }

    const label = `${rank} ${category} ${promotionStatus !== 'REGULAR' ? promotionStatus : ''}`.trim();

    return {
        paygrade: rank,
        designator: designator,
        promotionStatus: promotionStatus,
        label: label
    };
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
    const ensureGroup = (key: CompGroupKey, endDate: string): SummaryGroup => {
        // Unique ID must include all segmentation factors
        const idParts = [
            key.paygrade,
            key.designator,
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
                competitiveGroupKey: `${key.paygrade} ${key.designator}`,
                promotionStatus: key.promotionStatus
            });
        }
        return groupsMap.get(id)!;
    };


    roster.forEach(member => {
        const groupKey = getCompetitiveGroup(member);
        const memberPRD = new Date(member.prd);

        // Helper to calc remaining reports
        const getReportsRemaining = (rDate: string) => {
            const d = new Date(rDate);
            const years = memberPRD.getFullYear() - d.getFullYear();
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
                    const group = ensureGroup(groupKey, pDateStr);

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
        // 2. MEMBER TRANSFER (PRD) REPORT
        // -----------------------------------------------------
        // If Member leaves BEFORE RS leaves, they get a Transfer Report at PRD.
        if (memberPRD < rsEndDate && memberPRD > new Date(member.dateReported)) {
            const prdStr = formatISODate(memberPRD.getFullYear(), memberPRD.getMonth(), memberPRD.getDate());
            const group = ensureGroup(groupKey, prdStr);

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
        // Member must be Onboard (PRD > RS Date)
        // Member must have reported before RS Date.
        if (memberPRD >= rsEndDate && new Date(member.dateReported) < rsEndDate) {
            const rsDateStr = rsConfig.changeOfCommandDate;
            const group = ensureGroup(groupKey, rsDateStr);

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
                    promotionStatus: member.promotionStatus,
                    reportingSeniorName: rsConfig.name,
                    reportsRemaining: getReportsRemaining(rsDateStr),
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
                status = 'Drafting';

                // If it's way out (more than 6 months), maybe 'Planned' (map to Planning)
                const monthsOut = (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);
                if (monthsOut > 6) status = 'Planning';
            }
        }

        return { ...group, status };
    });

    return finalGroups.sort((a, b) => a.periodEndDate.localeCompare(b.periodEndDate));
};
