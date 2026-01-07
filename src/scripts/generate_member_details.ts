
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

interface RosterMember {
    id: string;
    firstName: string;
    lastName: string;
    rank: string;
    designator: string;
    dateReported: string; // "YYYY-MM-DD"
    prd: string; // "YYYY-MM-DD"
}

interface SummaryGroup {
    competitiveGroupKey: string;
    reports: { memberId: string, rank: string, designator: string }[];
}

interface MemberDetail {
    id: string;
    prd: string;
    eda: string;
    edd: string;
    gainDate: string;
    detachDate: string;
    milestoneTour: string | null;
    linealNumber: number | null;
    commissioningDate: string | null;
    dateOfRank: string;
    timeInRank?: number; // Calculated field requested by prompt? Prompt said "Time in Rank (number of years at present rank)" but then "No. Instead of Time in Rank, implement a "Date of Rank"". So I will include Date of Rank.
}

// Utils
const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

const getRandomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Milestone Logic
const getMilestoneTour = (rank: string): string | null => {
    if (rank === 'O-1' || rank === 'O-2') return '1DV';
    if (rank === 'O-3') return '2DV';
    if (rank === 'O-4') {
        const options = ['1DH', '2DH', 'SLT DH'];
        return options[getRandomInt(0, options.length - 1)];
    }
    if (rank === 'O-5') return 'XO/CO';
    if (rank === 'O-6') return 'MAJ CMD';
    return null; // Enlisted
};

// Time in Rank Logic (Average years to next rank for estimation)
const getYearsForRank = (rank: string): number => {
    switch (rank) {
        case 'O-1': return 0;
        case 'O-2': return 2;
        case 'O-3': return 4;
        case 'O-4': return 10;
        case 'O-5': return 16;
        case 'O-6': return 22;
        case 'E-1': return 0;
        case 'E-2': return 1;
        case 'E-3': return 2;
        case 'E-4': return 3;
        case 'E-5': return 6;
        case 'E-6': return 10;
        case 'E-7': return 15;
        case 'E-8': return 18;
        case 'E-9': return 22;
        default: return 5;
    }
};

const main = () => {
    const inputPath = resolve('public/summary_groups_test_data.json');
    const outputPath = resolve('public/member_details.json');

    const data = JSON.parse(readFileSync(inputPath, 'utf-8'));
    const roster: RosterMember[] = data.roster;
    const summaryGroups: SummaryGroup[] = data.summaryGroups || [];

    const memberDetailsMap: Record<string, MemberDetail> = {};
    const allOfficers: { id: string, rank: string, dateOfRank: Date }[] = [];

    // 1. Process Existing Members
    console.log(`Processing ${roster.length} existing members...`);
    roster.forEach(member => {
        const rank = member.rank;
        const gainDate = new Date(member.dateReported);
        const prd = new Date(member.prd);

        // EDD is typically PRD +/- 3 months. Let's make it PRD - 1 month for simplicity or close to it.
        // Prompt says "EDD is estimated date member must detach".
        const edd = addDays(prd, getRandomInt(-30, 30));
        const detachDate = edd; // Assuming actual detach matches estimated for test data
        const eda = gainDate; // For existing members, they arrived on Gain Date.

        // Date of Rank
        // Simulate: Current Date - (Random time in current rank)
        // Ensure it's somewhat realistic.
        // For O-1, < 2 years. O-2, < 2 years.
        // Actually, let's just make it randomly 0.5 to 3 years before TODAY, constrained by their rank.
        // Or better: dateReported minus some time?
        // Let's assume they've been in rank for 1-3 years.
        const yearsInRank = getRandomInt(1, 4);
        const dateOfRank = addDays(new Date(), -1 * yearsInRank * 365);

        // Commissioning Date
        // Years in service calculated from rank and time in rank (used for commissioning date below)
        const commissioningDate = rank.startsWith('O') || rank.startsWith('W')
            ? addDays(dateOfRank, -1 * getYearsForRank(rank) * 365)
            : null;

        const detail: MemberDetail = {
            id: member.id,
            prd: formatDate(prd),
            eda: formatDate(eda),
            edd: formatDate(edd),
            gainDate: formatDate(gainDate),
            detachDate: formatDate(detachDate),
            milestoneTour: getMilestoneTour(rank),
            linealNumber: null, // Assign later
            commissioningDate: commissioningDate ? formatDate(commissioningDate) : null,
            dateOfRank: formatDate(dateOfRank)
        };

        memberDetailsMap[member.id] = detail;

        if (rank.startsWith('O') || rank.startsWith('W')) { // Officers/Warrant
            allOfficers.push({ id: member.id, rank, dateOfRank });
        }
    });

    // 2. Identify Competitive Groups and Generate Prospective Gains
    console.log('Generating Prospective Gains...');
    const distinctGroups = new Set<string>();
    const groupSampleMember: Record<string, { rank: string, designator: string }> = {};

    summaryGroups.forEach(group => {
        distinctGroups.add(group.competitiveGroupKey);
        // Find a representative member for this group to copy Rank/Designator
        // Usually reports have member details snapshot.
        if (group.reports && group.reports.length > 0) {
            const rep = group.reports[0];
            // Reports in SummaryGroup have { memberId, rank, designator, ... }
            groupSampleMember[group.competitiveGroupKey] = {
                rank: rep.rank,
                designator: rep.designator
            };
        }
    });

    // Generate 5-10 per group
    distinctGroups.forEach(groupKey => {
        const count = getRandomInt(5, 10);
        const sample = groupSampleMember[groupKey];
        if (!sample) return; // Should not happen

        for (let i = 0; i < count; i++) {
            const id = randomUUID();
            const rank = sample.rank;

            // Dates for Prospective Gains
            // Gain Date is in future.
            const daysUntilArrival = getRandomInt(30, 365);
            const gainDate = addDays(new Date(), daysUntilArrival);
            const eda = gainDate;
            const prd = addDays(gainDate, 365 * 3); // 3 year tour
            const edd = addDays(prd, getRandomInt(-10, 10));
            const detachDate = edd;

            // Date of Rank (similar logic to existing)
            const yearsInRank = getRandomInt(1, 3);
            const dateOfRank = addDays(new Date(), -1 * yearsInRank * 365);

            // Commissioning Date
            const commissioningDate = rank.startsWith('O') || rank.startsWith('W')
                ? addDays(dateOfRank, -1 * getYearsForRank(rank) * 365)
                : null;

            const detail: MemberDetail = {
                id: id,
                prd: formatDate(prd),
                eda: formatDate(eda),
                edd: formatDate(edd),
                gainDate: formatDate(gainDate),
                detachDate: formatDate(detachDate),
                milestoneTour: getMilestoneTour(rank),
                linealNumber: null,
                commissioningDate: commissioningDate ? formatDate(commissioningDate) : null,
                dateOfRank: formatDate(dateOfRank)
            };

            memberDetailsMap[id] = detail;

            if (rank.startsWith('O') || rank.startsWith('W')) {
                allOfficers.push({ id, rank, dateOfRank });
            }
        }
    });

    // 3. Assign Lineal Numbers
    // Sort by Rank (Desc) then Date of Rank (Asc - earlier date means more senior)
    console.log('Assigning Lineal Numbers...');
    const rankOrder = ['O-10', 'O-9', 'O-8', 'O-7', 'O-6', 'O-5', 'O-4', 'O-3', 'O-2', 'O-1', 'W-5', 'W-4', 'W-3', 'W-2']; // Simplified

    allOfficers.sort((a, b) => {
        const rankIdxA = rankOrder.indexOf(a.rank);
        const rankIdxB = rankOrder.indexOf(b.rank);
        if (rankIdxA !== rankIdxB) {
            // Lower index is higher rank (e.g. 0 is O-10)
            // But we want to handle unknown ranks gracefully? assuming normalized data.
            return rankIdxA - rankIdxB;
        }
        return a.dateOfRank.getTime() - b.dateOfRank.getTime();
    });

    allOfficers.forEach((officer, index) => {
        if (memberDetailsMap[officer.id]) {
            memberDetailsMap[officer.id].linealNumber = index + 1;
        }
    });

    // Write Output
    writeFileSync(outputPath, JSON.stringify(memberDetailsMap, null, 2));
    console.log(`Successfully generated member_details.json with ${Object.keys(memberDetailsMap).length} entries.`);
};

main();
