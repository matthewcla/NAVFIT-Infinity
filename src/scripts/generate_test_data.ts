
import { writeFile } from 'fs/promises';
import { resolve } from 'path';

// Minimal implementations of types to avoid importing from src if environment is tricky (e.g. ts-node vs vite aliases)
// But since we are likely running with tsx, we can try to import.
// However, to keep this script robust and self-contained for generation, I'll define necessary shapes or use relative imports carefully.
// Let's assume we can run it with `npx tsx src/scripts/generate_test_data.ts`

// Constants for Generation
const PAYGRADES_OFFICER = ['O-1', 'O-2', 'O-3', 'O-4', 'O-5', 'O-6', 'W-2', 'W-3', 'W-4', 'W-5'] as const;
const PAYGRADES_ENLISTED = ['E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6', 'E-7', 'E-8', 'E-9'] as const;

// Designators / Ratings
const DESIGNATORS_URL = ['1110', '1310', '1120', '1320'];
const DESIGNATORS_RL = ['1200', '1830', '1810', '1820', '1510'];
const DESIGNATORS_STAFF = ['2100', '2200', '2300', '2900', '3100', '4100', '5100'];
const DESIGNATORS_LDO = ['6110', '6120', '6130', '6180', '6230', '6260', '6280', '6290', '6330', '6410', '6490'];
const DESIGNATORS_CWO = ['7111', '7121', '7131', '7151', '7171', '7181', '7811', '7821', '7831'];

const FIRST_NAMES = [
    'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
    'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen',
    'Christopher', 'Lisa', 'Daniel', 'Nancy', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra',
    'Steven', 'Ashley', 'Paul', 'Kimberly', 'Andrew', 'Emily', 'Joshua', 'Donna', 'Kenneth', 'Michelle',
    'Kevin', 'Dorothy', 'Brian', 'Carol', 'George', 'Amanda', 'Edward', 'Melissa', 'Ronald', 'Deborah'
];

const LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
];

// Helper Functions
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomElement = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomFloat = (min: number, max: number, decimals = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

const addMonths = (dateStr: string, months: number): string => {
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
};

const getRandomDate = (start: string, end: string) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const d = new Date(s + Math.random() * (e - s));
    return d.toISOString().split('T')[0];
};

// Types (Mirrored from codebase for script isolation)
interface RosterMember {
    id: string;
    firstName: string;
    lastName: string;
    rank: string;
    designator: string;
    dateReported: string;
    prd: string;
    history: Report[];
    // ... other fields
}

interface Report {
    id: string;
    memberId: string;
    periodEndDate: string;
    traitAverage: number;
    promotionRecommendation: 'EP' | 'MP' | 'P' | 'Prog' | 'SP' | 'NOB';
    summaryGroupAvg?: number;
    isLocked?: boolean;
    // ... Minimal fields for logic
    firstName?: string;
    lastName?: string;
    memberName?: string; // Align with core type
    memberRank?: string; // Align with core type
    rank?: string;
    designator?: string;
    draftStatus?: string;
}

interface SummaryGroup {
    id: string;
    name: string;
    paygrade: string;
    competitiveGroupKey: string;
    periodEndDate: string;
    status: 'Pending' | 'Accepted' | 'Rejected' | 'Planned' | 'Draft' | 'Submitted' | 'Review' | 'Final';
    reports: Report[];
}

// ---- GENERATOR LOGIC ----

const generateMember = (paygrade: string, designator: string): RosterMember => {
    const firstName = getRandomElement(FIRST_NAMES);
    const lastName = getRandomElement(LAST_NAMES);
    const dateReported = getRandomDate('2021-01-01', '2023-01-01');
    const prd = addMonths(dateReported, 36);

    return {
        id: crypto.randomUUID(),
        firstName,
        lastName,
        rank: paygrade,
        designator,
        dateReported,
        prd,
        history: []
    };
};

const generateReport = (member: RosterMember, date: string, type: 'Historic' | 'Active'): Report => {
    // Historic usually follows a distribution
    // Active is random/unassigned
    const traitAvg = getRandomFloat(3.0, 5.0);
    const recommendations = ['EP', 'MP', 'P', 'NOB'] as const; // Simplified
    const rec = getRandomElement(recommendations);

    return {
        id: crypto.randomUUID(),
        memberId: member.id,
        periodEndDate: date,
        traitAverage: traitAvg,
        promotionRecommendation: rec,
        memberName: `${member.lastName}, ${member.firstName}`,
        memberRank: member.rank,
        firstName: member.firstName,
        lastName: member.lastName,
        rank: member.rank,
        designator: member.designator,
        draftStatus: type === 'Historic' ? 'Final' : 'Draft',
        // Optional fields filled for completeness
        isLocked: type === 'Historic' // Historic reports are locked
    };
};

const main = async () => {
    const roster: RosterMember[] = [];
    const summaryGroups: SummaryGroup[] = [];

    const CURRENT_CYCLE_DATE = '2025-01-31';
    const LAST_CYCLE_DATE = '2024-01-31';

    // 1. Generate Officer Groups
    // For each Paygrade x Category combo

    // Categories to Iterate
    const categories = [
        { name: 'URL', desigs: DESIGNATORS_URL },
        { name: 'RL', desigs: DESIGNATORS_RL },
        { name: 'Staff', desigs: DESIGNATORS_STAFF },
        { name: 'LDO', desigs: DESIGNATORS_LDO },
        { name: 'CWO', desigs: DESIGNATORS_CWO },
    ];

    // Iterate Officers
    for (const pg of PAYGRADES_OFFICER) {
        // Skip CWO for O-ranks and vice versa logic if strictly needed, but let's just do all combos relevant.
        // O-1 to O-6 -> URL, RL, Staff, LDO (LDO can be O)
        // W-2 to W-5 -> CWO only

        const isWarrant = pg.startsWith('W');

        const validCategories = isWarrant
            ? categories.filter(c => c.name === 'CWO')
            : categories.filter(c => c.name !== 'CWO'); // LDO is Officer (O1-O6)

        for (const cat of validCategories) {
            // Create "Active" Group
            const activeGroupId = crypto.randomUUID();
            const activeGroup: SummaryGroup = {
                id: activeGroupId,
                name: `${pg} ${cat.name === 'CWO' ? '' : cat.name + ' '}Active`.replace(/\s+/g, ' ').trim(),
                paygrade: pg,
                competitiveGroupKey: `${pg} ${cat.name}`, // Simplified Key
                periodEndDate: CURRENT_CYCLE_DATE,
                status: 'Draft',
                reports: []
            };

            // Create "Archive" Group (Last Year)
            const archiveGroupId = crypto.randomUUID();
            const archiveGroup: SummaryGroup = {
                id: archiveGroupId,
                name: `${pg} ${cat.name === 'CWO' ? '' : cat.name + ' '}Archive 2024`.replace(/\s+/g, ' ').trim(),
                paygrade: pg,
                competitiveGroupKey: `${pg} ${cat.name}`,
                periodEndDate: LAST_CYCLE_DATE,
                status: 'Final',
                reports: []
            };

            // Generate Members for this bucket
            // Random count 5-15
            const count = getRandomInt(5, 15);
            for (let i = 0; i < count; i++) {
                const desig = getRandomElement(cat.desigs);
                const member = generateMember(pg, desig);

                // Add to Global Roster
                roster.push(member);

                // Create Active Report
                const activeRep = generateReport(member, CURRENT_CYCLE_DATE, 'Active');
                activeGroup.reports.push(activeRep);

                // Create Historic Report (Archive)
                // Assuming they were here last year (simple case)
                const archiveRep = generateReport(member, LAST_CYCLE_DATE, 'Historic');
                archiveGroup.reports.push(archiveRep);

                // Update Member History
                member.history.push(archiveRep);
            }

            if (activeGroup.reports.length > 0) summaryGroups.push(activeGroup);
            if (archiveGroup.reports.length > 0) summaryGroups.push(archiveGroup);
        }
    }

    // 2. Generate Enlisted Groups
    // E-1 to E-9, '0000' designator equivalent
    for (const pg of PAYGRADES_ENLISTED) {
        const activeGroupId = crypto.randomUUID();
        const activeGroup: SummaryGroup = {
            id: activeGroupId,
            name: `${pg} Active`,
            paygrade: pg,
            competitiveGroupKey: `${pg} ENLISTED`,
            periodEndDate: CURRENT_CYCLE_DATE,
            status: 'Draft',
            reports: []
        };

        // Archive
        const archiveGroupId = crypto.randomUUID();
        const archiveGroup: SummaryGroup = {
            id: archiveGroupId,
            name: `${pg} Archive 2024`,
            paygrade: pg,
            competitiveGroupKey: `${pg} ENLISTED`,
            periodEndDate: LAST_CYCLE_DATE,
            status: 'Final',
            reports: []
        };

        const count = getRandomInt(10, 25); // More enlisted usually
        for (let i = 0; i < count; i++) {
            const member = generateMember(pg, '0000');
            roster.push(member);

            const activeRep = generateReport(member, CURRENT_CYCLE_DATE, 'Active');
            activeGroup.reports.push(activeRep);

            const archiveRep = generateReport(member, LAST_CYCLE_DATE, 'Historic');
            archiveGroup.reports.push(archiveRep);

            member.history.push(archiveRep);
        }

        if (activeGroup.reports.length > 0) summaryGroups.push(activeGroup);
        if (archiveGroup.reports.length > 0) summaryGroups.push(archiveGroup);
    }

    // Output Data
    const output = {
        roster,
        summaryGroups,
        rsConfig: {
            name: 'CAPT J. T. Kirk',
            rank: 'O-6',
            title: 'CO',
            changeOfCommandDate: '2026-06-01',
            targetRsca: 4.10,
            totalReports: 500
        },
        version: '1.0',
        timestamp: new Date().toISOString()
    };

    const path = resolve('public/summary_groups_test_data.json');
    await writeFile(path, JSON.stringify(output, null, 2));
    console.log(`Generated ${roster.length} members and ${summaryGroups.length} summary groups to ${path}`);
};

main().catch(console.error);
