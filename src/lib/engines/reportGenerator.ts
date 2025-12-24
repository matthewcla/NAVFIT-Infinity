import type { RosterMember, ReportingSeniorConfig } from '../../types/roster';
import type { SummaryGroup, Report } from '../../types';
import { PERIODIC_SCHEDULE } from '../constants';

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

export const generateSummaryGroups = (
    roster: RosterMember[],
    rsConfig: ReportingSeniorConfig,
    baseYear: number = 2025
): SummaryGroup[] => {
    const groupsMap = new Map<string, SummaryGroup>();

    // Helper to get-or-create Group
    const ensureGroup = (compGroup: string, endDate: string): SummaryGroup => {
        // ID must be deterministic and URL-safe
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

        // 1. Periodic Report Plan
        // PERIODIC_SCHEDULE keys might need casting if strict strict
        // rank is 'PayGrade' (e.g. O-3), PERIODIC_SCHEDULE uses string keys.
        const periodicMonth = PERIODIC_SCHEDULE[member.rank as string];

        if (periodicMonth) {
            const pMonthIndex = periodicMonth - 1; // Convert to 0-based
            const pDate = new Date(baseYear, pMonthIndex + 1, 0); // Last day of month
            const pDateStr = formatISODate(baseYear, pMonthIndex, pDate.getDate());

            const group = ensureGroup(compGroup, pDateStr);

            // Check if member already in group
            if (!group.reports.some(r => r.memberId === member.id)) {

                // Create Base Report
                const report: Report = {
                    id: `r-${member.id}-periodic-${baseYear}`,
                    memberId: member.id,
                    periodEndDate: pDateStr,
                    type: 'Periodic',
                    traitAverage: 0,
                    promotionRecommendation: 'NOB',
                    draftStatus: 'Draft',
                    traitGrades: {},
                    isAdverse: false,
                    notObservedReport: false,

                    // Admin Data Snapshots
                    grade: member.rank,
                    designator: member.designator,
                    dateReported: member.dateReported,
                    reportingSeniorId: 'rs-current', // Placeholder linkage
                    reportingSeniorName: rsConfig.name,
                    reportingSeniorGrade: rsConfig.rank,
                    reportingSeniorTitle: rsConfig.title,
                };

                group.reports.push(report);
            }
        }

        // 2. RS Detach Report Plan
        // Logic: specific date for everyone < that date
        // Only if they haven't transferred before that date.
        const rsDate = rsConfig.changeOfCommandDate;

        // Simple Logic: If onboard during RS shift
        if (member.dateReported < rsDate && member.prd > rsDate) {
            // Eligible for RS Detach Report
            const group = ensureGroup(compGroup, rsDate);

            // Avoid duplication just in case
            if (!group.reports.some(r => r.memberId === member.id)) {
                const report: Report = {
                    id: `r-${member.id}-rsdetach-${baseYear}`,
                    memberId: member.id,
                    periodEndDate: rsDate,
                    type: 'Detachment', // "Detachment of Reporting Senior" maps to Detachment type usually or Special?
                    // Standard FITREP uses 'Detachment of Reporting Senior' as an occasion.
                    // Our Type Enum has 'Detachment'. We'll use that for now.
                    traitAverage: 0,
                    promotionRecommendation: 'NOB',
                    draftStatus: 'Draft',
                    traitGrades: {},
                    isAdverse: false,
                    notObservedReport: false,

                    // Admin Data Snapshots
                    grade: member.rank,
                    designator: member.designator,
                    dateReported: member.dateReported,
                    reportingSeniorName: rsConfig.name,
                };
                group.reports.push(report);
            }
        }
    });

    return Array.from(groupsMap.values()).sort((a, b) => a.periodEndDate.localeCompare(b.periodEndDate));
};
