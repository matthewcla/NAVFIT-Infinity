
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

// --- Interfaces ---

interface RosterMember {
    id: string;
    firstName: string;
    lastName: string;
    rank: string;
    designator: string;
    dateReported: string; // "YYYY-MM-DD"
    prd: string; // "YYYY-MM-DD"
    history?: any[];
}

interface MemberDetail {
    id: string;
    prd: string;
    eda?: string;
    edd?: string;
    gainDate?: string;
    detachDate?: string;
    milestoneTour?: string | null;
    linealNumber?: number | null;
    commissioningDate?: string | null;
    dateOfRank?: string;
}

interface Report {
    id: string;
    memberId: string;
    periodEndDate: string;
    traitAverage: number;
    promotionRecommendation: 'EP' | 'MP' | 'P' | 'NOB';
    memberName: string;
    memberRank: string;
    firstName: string;
    lastName: string;
    rank: string;
    designator: string;
    draftStatus: string;
    isLocked: boolean;
}

interface SummaryGroup {
    id: string;
    name: string;
    paygrade: string;
    competitiveGroupKey: string;
    periodEndDate: string;
    status: 'Draft' | 'Final' | 'Active';
    reports: Report[];
    designator?: string;
    promotionStatus?: string;
}

// --- Configuration ---

const RS_ARRIVAL_DATE = new Date('2024-09-09');
const CURRENT_DEMO_DATE = new Date('2026-01-20');

// Periodic Schedule (Month/Day)
// Enlisted: 15th. Officers: Last Day.
const PERIODIC_SCHEDULE: Record<string, { month: number, day: number, type: 'Enlisted' | 'Officer' }> = {
    'E-1': { month: 6, day: 15, type: 'Enlisted' }, // July (Month 6 index)
    'E-2': { month: 6, day: 15, type: 'Enlisted' },
    'E-3': { month: 6, day: 15, type: 'Enlisted' },
    'E-4': { month: 5, day: 15, type: 'Enlisted' }, // June
    'E-5': { month: 2, day: 15, type: 'Enlisted' }, // March
    'E-6': { month: 10, day: 15, type: 'Enlisted' }, // Nov
    'E-7': { month: 8, day: 15, type: 'Enlisted' }, // Sept
    'E-8': { month: 8, day: 15, type: 'Enlisted' },
    'E-9': { month: 3, day: 15, type: 'Enlisted' }, // April
    'O-1': { month: 4, day: 31, type: 'Officer' }, // May (Use last day logic)
    'O-2': { month: 4, day: 31, type: 'Officer' }, // May
    'O-3': { month: 0, day: 31, type: 'Officer' }, // Jan
    'O-4': { month: 9, day: 31, type: 'Officer' }, // Oct
    'O-5': { month: 3, day: 30, type: 'Officer' }, // April
    'O-6': { month: 6, day: 31, type: 'Officer' }, // July
    'W-2': { month: 8, day: 30, type: 'Officer' }, // Sept
    'W-3': { month: 8, day: 30, type: 'Officer' },
    'W-4': { month: 8, day: 30, type: 'Officer' },
    'W-5': { month: 8, day: 30, type: 'Officer' },
};

// Rank to Paygrade Map (Simplified)
const RANK_TO_PAYGRADE: Record<string, string> = {
    'SR': 'E-1', 'SA': 'E-2', 'SN': 'E-3',
    'PO3': 'E-4', 'PO2': 'E-5', 'PO1': 'E-6',
    'CPO': 'E-7', 'SCPO': 'E-8', 'MCPO': 'E-9',
    'ENS': 'O-1', 'LTJG': 'O-2', 'LT': 'O-3',
    'LCDR': 'O-4', 'CDR': 'O-5', 'CAPT': 'O-6',
    'CWO2': 'W-2', 'CWO3': 'W-3', 'CWO4': 'W-4', 'CWO5': 'W-5'
};

const PAYGRADE_TO_KEY: Record<string, string> = {
    'E-1': 'SR COMP', 'E-2': 'SA COMP', 'E-3': 'SN COMP',
    'E-4': 'PO3 COMP', 'E-5': 'PO2 COMP', 'E-6': 'PO1 COMP',
    'E-7': 'CPO COMP', 'E-8': 'SCPO COMP', 'E-9': 'MCPO COMP',
    'O-1': 'ENS COMP', 'O-2': 'LTJG COMP', 'O-3': 'LT COMP',
    'O-4': 'LCDR COMP', 'O-5': 'CDR COMP', 'O-6': 'CAPT COMP',
    'W-2': 'CWO2 COMP', 'W-3': 'CWO3 COMP', 'W-4': 'CWO4 COMP', 'W-5': 'CWO5 COMP'
};

// --- Helpers ---

const parseDate = (d: string | undefined): Date | null => {
    if (!d) return null;
    return new Date(d);
};

const formatDate = (d: Date): string => {
    return d.toISOString().split('T')[0];
};

const getLastDayOfMonth = (year: number, monthIndex: number): number => {
    return new Date(year, monthIndex + 1, 0).getDate();
};

const getRandomFloat = (min: number, max: number, decimals: number): number => {
    const str = (Math.random() * (max - min) + min).toFixed(decimals);
    return parseFloat(str);
};

const getRandomRecommendation = (): 'EP' | 'MP' | 'P' => {
    const r = Math.random();
    if (r < 0.2) return 'EP';
    if (r < 0.6) return 'MP';
    return 'P';
};

// --- Main ---

const main = () => {
    const summaryDataPath = resolve('public/summary_groups_test_data.json');
    const memberDetailsPath = resolve('public/member_details.json');
    const outputDataPath = resolve('public/user_1.json');

    console.log('Reading input files...');
    const summaryData = JSON.parse(readFileSync(summaryDataPath, 'utf-8'));
    const memberDetails: Record<string, MemberDetail> = JSON.parse(readFileSync(memberDetailsPath, 'utf-8'));

    // Load existing user data to append/merge
    let userData = { roster: [], summaryGroups: [], rsConfig: {} };
    try {
        userData = JSON.parse(readFileSync(outputDataPath, 'utf-8'));
    } catch (e) {
        console.log('User data not found, creating new.');
    }

    const roster: RosterMember[] = summaryData.roster;
    console.log(`Core Roster Size: ${roster.length}`);

    const newSummaryGroups: SummaryGroup[] = [];

    // 1. Generate Periodic Dates
    const periodicDates: { date: Date, paygrade: string }[] = [];
    const years = [2024, 2025, 2026];

    Object.entries(PERIODIC_SCHEDULE).forEach(([paygrade, sched]) => {
        years.forEach(year => {
            let day = sched.day;
            if (sched.type === 'Officer' && day > 28) {
                day = getLastDayOfMonth(year, sched.month);
            }
            const date = new Date(year, sched.month, day);

            // Check window
            if (date >= RS_ARRIVAL_DATE && date <= CURRENT_DEMO_DATE) {
                periodicDates.push({ date, paygrade });
            }
        });
    });

    console.log(`Identified ${periodicDates.length} periodic cycles in window.`);

    // 2. Process Periodic Groups
    periodicDates.forEach(cycle => {
        const { date, paygrade } = cycle;
        const cycleDateStr = formatDate(date);
        const cycleLabel = date.toLocaleString('default', { month: 'long', year: 'numeric' });

        // Filter Roster
        const eligibleMembers = roster.filter(m => {
            const detail = memberDetails[m.id];
            if (!detail) return false;

            // Map rank to paygrade
            const memberPaygrade = m.rank.startsWith('O') || m.rank.startsWith('W') || m.rank.startsWith('E') ? m.rank : RANK_TO_PAYGRADE[m.rank]; // Assume roster has O-1 etc or ENS

            // Handle Roster rank format (e.g. 'ENS' vs 'O-1')
            let normalizedPaygrade = memberPaygrade;
            // Reverse lookup if needed
            if (!normalizedPaygrade && RANK_TO_PAYGRADE[m.rank]) normalizedPaygrade = RANK_TO_PAYGRADE[m.rank];

            // Try to match 'O-1' to 'O-1'
            // If roster uses 'ENS', normalized is 'O-1'. cycle.paygrade is 'O-1'.

            // Actually PERIODIC_SCHEDULE uses keys like 'O-1', 'E-4'.
            // Roster might have 'O-1' or 'ENS'.
            // Let's normalize roster rank to paygrade key.
            let pKey = m.rank;
            if (!PERIODIC_SCHEDULE[pKey]) {
                // Try finding key by value in RANK_TO_PAYGRADE isn't easy, but RANK_TO_PAYGRADE maps Rank Name -> Paygrade (e.g. ENS -> O-1).
                // Wait, RANK_TO_PAYGRADE I defined above maps Rank Label -> Paygrade Key.
                // Let's check summary data roster format.
                // It usually has 'O-1', 'E-4' in 'rank' field?
                // Looking at user_1.json, rank is 'CDR', 'LCDR'.
                // Looking at summary_groups_test_data.json, rank is 'O-1', 'O-2'.

                // So if roster is from summary_groups_test_data.json, it is likely 'O-1'.
                // But just in case:
                if (RANK_TO_PAYGRADE[m.rank]) pKey = RANK_TO_PAYGRADE[m.rank];
            }

            if (pKey !== paygrade) return false;

            // Date Checks
            const reported = parseDate(detail.dateReported || detail.gainDate);
            const detached = parseDate(detail.detachDate);

            if (!reported) return false; // Should have reported date

            // Must have reported ON or BEFORE the cycle date
            if (reported > date) return false; // Prospective Gain

            // Must NOT have detached BEFORE the cycle date
            if (detached && detached < date) return false;

            return true;
        });

        if (eligibleMembers.length === 0) return;

        // Create Summary Group
        const reports: Report[] = eligibleMembers.map(m => {
            const reportId = randomUUID();
            const report: Report = {
                id: reportId,
                memberId: m.id,
                periodEndDate: cycleDateStr,
                traitAverage: getRandomFloat(3.5, 4.8, 2),
                promotionRecommendation: getRandomRecommendation(),
                memberName: `${m.lastName}, ${m.firstName}`,
                memberRank: m.rank,
                firstName: m.firstName,
                lastName: m.lastName,
                rank: m.rank,
                designator: m.designator,
                draftStatus: 'Final',
                isLocked: true
            };

            // Add to Member History
            if (!m.history) m.history = [];
            m.history.push(report);

            return report;
        });

        // Group Name: [Rank] Periodic [Month/Year]
        // E.g. "E-4 Periodic June 2025"
        // Or "Archived" as per previous data? "E-4 Archive 2024".
        // Instructions: "Generate Final summary groups for every standard Periodic cycle"
        // Let's use "[Rank] Archive [Year]" or "[Rank] Periodic [Date]"
        // The user_1.json uses "E-4 Archive 2024".
        // Let's stick to a descriptive name.
        const groupName = `${paygrade} Periodic ${cycleLabel}`;

        const group: SummaryGroup = {
            id: randomUUID(),
            name: groupName,
            paygrade: paygrade,
            competitiveGroupKey: PAYGRADE_TO_KEY[paygrade] || `${paygrade} COMP`,
            periodEndDate: cycleDateStr,
            status: 'Final',
            reports: reports
        };

        newSummaryGroups.push(group);
    });

    console.log(`Generated ${newSummaryGroups.length} periodic summary groups.`);

    // 3. Detachment Reports
    const detachmentGroups: SummaryGroup[] = [];

    // Find members with detachDate in window
    roster.forEach(m => {
        const detail = memberDetails[m.id];
        if (!detail || !detail.detachDate) return;

        const detachDate = new Date(detail.detachDate);
        if (detachDate >= RS_ARRIVAL_DATE && detachDate <= CURRENT_DEMO_DATE) {

            // Exclude if Gain Date > Detach Date (sanity check, shouldn't happen for onboard)
            const reported = parseDate(detail.dateReported || detail.gainDate);
            if (reported && reported > detachDate) return;

            // Generate Detachment Report
            const reportId = randomUUID();
            const report: Report = {
                id: reportId,
                memberId: m.id,
                periodEndDate: detail.detachDate!, // detail.detachDate is guaranteed string by check above
                traitAverage: getRandomFloat(3.5, 4.8, 2),
                promotionRecommendation: getRandomRecommendation(),
                memberName: `${m.lastName}, ${m.firstName}`,
                memberRank: m.rank,
                firstName: m.firstName,
                lastName: m.lastName,
                rank: m.rank,
                designator: m.designator,
                draftStatus: 'Final',
                isLocked: true
            };

            // Add to Member History
            if (!m.history) m.history = [];
            m.history.push(report);

            // Group Name: [Rank] Detachment [Month/Year]
            const monthYear = detachDate.toLocaleString('default', { month: 'long', year: 'numeric' });
            const groupName = `${m.rank} Detachment ${monthYear}`;

            // Check if group already exists for this date/rank?
            // Usually Detachment of Individual is 1 person, or grouped by month.
            // "Generate specific 'Detachment of Individual' summary groups... matching their detachment dates."
            // Assuming 1 group per person per date? Or Group by Date?
            // "Summary Group of 2" exception implies they can be grouped.
            // Let's group by Date + Rank + Competitive Category.

            // For simplicity, let's create unique groups per date/rank combination to avoid massive number of groups if dates align.
            // Key: Date_Rank_Comp

            // Actually, prompt says: "For the transferredMembers, generate specific 'Detachment of Individual' summary groups"
            // Let's just make one group per member for simplicity unless they match exactly.
            // Or grouping by Month is cleaner?
            // "Group Name format: [Rank] Detachment [Month/Year]" suggests grouping by Month.

            // But the date must match exactly the detachment date for the report?
            // A summary group has a `periodEndDate`. If members detach on different days in the same month, they usually need different summary groups unless it's a special case.
            // But NOB/Detachment usually allows grouping if within limits?
            // To be safe and precise: Group by exact Date.
            // But Name format is Month/Year. This implies multiple dates might fall into one "Folder" or they just name it loosely.

            // I will group by Exact Date. Name will include Day to be specific: "[Rank] Detachment [Month/Day/Year]"
            // Wait, prompt specific format: "[Rank] Detachment [Month/Year]".
            // Okay, I will use that name, but create separate groups for different days to respect `periodEndDate` correctness.

            const group: SummaryGroup = {
                id: randomUUID(),
                name: groupName, // Warning: Multiple groups might have same name if different days. acceptable.
                paygrade: m.rank, // or paygrade
                competitiveGroupKey: PAYGRADE_TO_KEY[m.rank] || `${m.rank} COMP`,
                periodEndDate: detail.detachDate,
                status: 'Final',
                reports: [report]
            };

            detachmentGroups.push(group);
        }
    });

    console.log(`Generated ${detachmentGroups.length} detachment summary groups.`);

    // 4. Merge and Write
    // We want to KEEP the existing "Active" drafts if any?
    // The prompt implies "build the 'Archived' ... using data we just created".
    // I will replace `summaryGroups` with the generated ones, OR append?
    // Since user_1.json currently has some 'Archive' groups, I should probably replace them to be consistent with the "New World" generated by the previous prompt (which generated the roster).
    // The previous roster generation likely invalidated old groups.

    // I will replace all 'Final' / 'Archived' groups.
    // I will keep any 'Draft' / 'Active' groups if they exist (user_1.json has some).
    // But user_1.json roster was small.
    // The roster I read from `summary_groups_test_data.json` is the "Source of Truth".
    // So I should overwrite `user_1.json`'s roster with `summaryData.roster`.

    userData.roster = roster;

    // Filter out old historical groups if needed?
    // I'll just Overwrite summaryGroups with my new list for cleanliness, assuming this is a fresh start for "Archived" history.
    userData.summaryGroups = [...newSummaryGroups, ...detachmentGroups];

    writeFileSync(outputDataPath, JSON.stringify(userData, null, 2));
    console.log('Successfully updated user_1.json');
};

main();
