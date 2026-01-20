
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
    traitAverage: number | null;
    promotionRecommendation: 'EP' | 'MP' | 'P' | 'NOB' | null;
    memberName: string;
    memberRank: string;
    firstName: string;
    lastName: string;
    rank: string;
    designator: string;
    draftStatus: 'Draft' | 'Final' | 'Planned';
    isLocked: boolean;
}

interface SummaryGroup {
    id: string;
    name: string;
    paygrade: string;
    competitiveGroupKey: string;
    periodEndDate: string;
    status: 'Draft' | 'Final' | 'Active' | 'Planned';
    reports: Report[];
    designator?: string;
    promotionStatus?: string;
}

// --- Configuration ---

const RS_ARRIVAL_DATE = new Date('2024-09-09');
const CURRENT_DEMO_DATE = new Date('2026-01-20');
const RS_DETACHMENT_DATE = new Date('2028-01-22');

// Periodic Schedule
const PERIODIC_SCHEDULE: Record<string, { month: number, day: number, type: 'Enlisted' | 'Officer' }> = {
    'E-1': { month: 6, day: 15, type: 'Enlisted' },
    'E-2': { month: 6, day: 15, type: 'Enlisted' },
    'E-3': { month: 6, day: 15, type: 'Enlisted' },
    'E-4': { month: 5, day: 15, type: 'Enlisted' },
    'E-5': { month: 2, day: 15, type: 'Enlisted' },
    'E-6': { month: 10, day: 15, type: 'Enlisted' },
    'E-7': { month: 8, day: 15, type: 'Enlisted' },
    'E-8': { month: 8, day: 15, type: 'Enlisted' },
    'E-9': { month: 3, day: 15, type: 'Enlisted' },
    'O-1': { month: 4, day: 31, type: 'Officer' },
    'O-2': { month: 4, day: 31, type: 'Officer' },
    'O-3': { month: 0, day: 31, type: 'Officer' }, // Jan
    'O-4': { month: 9, day: 31, type: 'Officer' },
    'O-5': { month: 3, day: 30, type: 'Officer' },
    'O-6': { month: 6, day: 31, type: 'Officer' },
    'W-2': { month: 8, day: 30, type: 'Officer' },
    'W-3': { month: 8, day: 30, type: 'Officer' },
    'W-4': { month: 8, day: 30, type: 'Officer' },
    'W-5': { month: 8, day: 30, type: 'Officer' },
};

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
    const prospectiveGainsPath = resolve('public/prospective_gains.json');
    const memberDetailsPath = resolve('public/member_details.json');
    const outputDataPath = resolve('public/user_1.json');

    console.log('Reading input files...');
    const summaryData = JSON.parse(readFileSync(summaryDataPath, 'utf-8'));
    const memberDetails: Record<string, MemberDetail> = JSON.parse(readFileSync(memberDetailsPath, 'utf-8'));

    let prospectiveGains: RosterMember[] = [];
    try {
        prospectiveGains = JSON.parse(readFileSync(prospectiveGainsPath, 'utf-8'));
    } catch (e) {
        console.warn('No prospective gains file found or invalid.');
    }

    const coreRoster: RosterMember[] = summaryData.roster;
    // Combine Rosters
    const fullRoster = [...coreRoster, ...prospectiveGains];
    console.log(`Core Roster: ${coreRoster.length}, Gains: ${prospectiveGains.length}, Total: ${fullRoster.length}`);

    // Clean up roster history before processing
    fullRoster.forEach(m => m.history = []);

    const newSummaryGroups: SummaryGroup[] = [];

    // 1. Generate Periodic Dates
    const periodicDates: { date: Date, paygrade: string }[] = [];
    const years = [2024, 2025, 2026, 2027, 2028];

    Object.entries(PERIODIC_SCHEDULE).forEach(([paygrade, sched]) => {
        years.forEach(year => {
            let day = sched.day;
            if (sched.type === 'Officer' && day > 28) {
                day = getLastDayOfMonth(year, sched.month);
            }
            const date = new Date(year, sched.month, day);

            // Filter by Window: RS Arrival -> RS Detachment
            if (date >= RS_ARRIVAL_DATE && date <= RS_DETACHMENT_DATE) {
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

        // Filter Eligible Members
        const eligibleMembers = fullRoster.filter(m => {
            const detail = memberDetails[m.id];
            if (!detail) return false;

            // Paygrade Match
            let pKey = m.rank;
            if (RANK_TO_PAYGRADE[m.rank]) pKey = RANK_TO_PAYGRADE[m.rank];
            if (pKey !== paygrade) return false;

            // Date Checks
            const reported = parseDate(detail.dateReported || detail.gainDate);
            const detached = parseDate(detail.detachDate);

            if (!reported) return false;

            // Must have reported ON or BEFORE the cycle date
            if (reported > date) return false;

            // Must NOT have detached BEFORE the cycle date
            if (detached && detached < date) return false;

            return true;
        });

        if (eligibleMembers.length === 0) return;

        // Determine Status
        let status: 'Final' | 'Draft' | 'Planned' = 'Final';
        let groupName = `${paygrade} Periodic ${cycleLabel}`;

        // Active Group Logic: O-3 Jan 2026
        const isActiveGroup = paygrade === 'O-3' && date.getFullYear() === 2026 && date.getMonth() === 0; // Jan
        const isPlanned = date > CURRENT_DEMO_DATE;
        const isHistorical = date <= CURRENT_DEMO_DATE && !isActiveGroup;

        if (isActiveGroup) {
            status = 'Draft';
            groupName = `${paygrade} Active Periodic ${cycleLabel}`;
        } else if (isPlanned) {
            status = 'Planned';
            groupName = `${paygrade} Planned ${cycleLabel}`;
        } else {
            status = 'Final';
            groupName = `${paygrade} Archive ${cycle.date.getFullYear()}`;
        }

        // Generate Reports
        const reports: Report[] = eligibleMembers.map(m => {
            const reportId = randomUUID();

            let traitAverage: number | null = null;
            let promotionRecommendation: 'EP' | 'MP' | 'P' | 'NOB' | null = null;
            let isLocked = false;

            if (status === 'Final') {
                traitAverage = getRandomFloat(3.5, 4.8, 2);
                promotionRecommendation = getRandomRecommendation();
                isLocked = true;
            } else if (status === 'Draft' && isActiveGroup) {
                // 80% populated logic handled later in batch
                // For now, init valid
                traitAverage = getRandomFloat(3.5, 4.8, 2);
                promotionRecommendation = getRandomRecommendation();
                isLocked = false;
            } else if (status === 'Planned') {
                traitAverage = null;
                promotionRecommendation = null;
                isLocked = false;
            }

            const report: Report = {
                id: reportId,
                memberId: m.id,
                periodEndDate: cycleDateStr,
                traitAverage,
                promotionRecommendation,
                memberName: `${m.lastName}, ${m.firstName}`,
                memberRank: m.rank,
                firstName: m.firstName,
                lastName: m.lastName,
                rank: m.rank,
                designator: m.designator,
                draftStatus: status,
                isLocked
            };

            // Only add to history if Final (Historical)
            if (status === 'Final') {
                if (!m.history) m.history = [];
                m.history.push(report);
            }

            return report;
        });

        // Apply Active Group Constraints (80% populated, 1 extra EP)
        if (isActiveGroup) {
            const total = reports.length;
            const emptyCount = Math.floor(total * 0.2);

            // Clear last N reports
            for (let i = 0; i < emptyCount; i++) {
                const idx = total - 1 - i;
                if (idx >= 0) {
                    reports[idx].traitAverage = null;
                    reports[idx].promotionRecommendation = null;
                }
            }

            // Set EP Count to exceed limit
            // BUPERS Limit: ceil(total * 0.2)
            const maxEP = Math.ceil(total * 0.2);
            const targetEP = maxEP + 1;

            // Assign EPs to first N members
            let epCount = 0;
            reports.forEach((r, idx) => {
                if (epCount < targetEP && r.traitAverage !== null) {
                    r.promotionRecommendation = 'EP';
                    epCount++;
                } else if (r.traitAverage !== null) {
                    r.promotionRecommendation = 'MP'; // Default to MP for rest
                }
            });
        }

        const group: SummaryGroup = {
            id: randomUUID(),
            name: groupName,
            paygrade: paygrade,
            competitiveGroupKey: PAYGRADE_TO_KEY[paygrade] || `${paygrade} COMP`,
            periodEndDate: cycleDateStr,
            status: status,
            reports: reports
        };

        newSummaryGroups.push(group);
    });

    console.log(`Generated ${newSummaryGroups.length} summary groups.`);

    // 3. Detachment Reports (Historical only for now, unless planned? Prompt says "Planned Groups: ... shells for all periodic cycles". Doesn't mention planned detachment.
    // Prompt says "Core Roster: Include them until the RS's detachment date". This implies they might detach.
    // But "Generate 'Planned' group shells for all periodic cycles".
    // I will stick to Periodic for Planned.
    // For Historical, I'll generate Detachment groups as before.

    const detachmentGroups: SummaryGroup[] = [];
    fullRoster.forEach(m => {
        const detail = memberDetails[m.id];
        if (!detail || !detail.detachDate) return;

        const detachDate = new Date(detail.detachDate);

        // Only generate Detachment reports if they happened in the past (History)
        // Or should we plan them? "Planned groups... for all periodic cycles".
        // I'll stick to Historical Detachments.
        if (detachDate >= RS_ARRIVAL_DATE && detachDate <= CURRENT_DEMO_DATE) {
             // Exclude if Gain Date > Detach Date (sanity check)
             const reported = parseDate(detail.dateReported || detail.gainDate);
             if (reported && reported > detachDate) return;

             const reportId = randomUUID();
             const report: Report = {
                 id: reportId,
                 memberId: m.id,
                 periodEndDate: detail.detachDate!,
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

             if (!m.history) m.history = [];
             m.history.push(report);

             const monthYear = detachDate.toLocaleString('default', { month: 'long', year: 'numeric' });
             const groupName = `${m.rank} Detachment ${monthYear}`;

             const group: SummaryGroup = {
                 id: randomUUID(),
                 name: groupName,
                 paygrade: m.rank,
                 competitiveGroupKey: PAYGRADE_TO_KEY[m.rank] || `${m.rank} COMP`,
                 periodEndDate: detail.detachDate,
                 status: 'Final',
                 reports: [report]
             };

             detachmentGroups.push(group);
        }
    });

    console.log(`Generated ${detachmentGroups.length} detachment summary groups.`);

    // 4. Write Output
    const userData = {
        roster: fullRoster, // Include everyone
        summaryGroups: [...newSummaryGroups, ...detachmentGroups],
        rsConfig: summaryData.rsConfig, // Keep original config
        version: "1.0",
        timestamp: new Date().toISOString()
    };

    writeFileSync(outputDataPath, JSON.stringify(userData, null, 2));
    console.log('Successfully generated user_1.json');
};

main();
