import type { RosterMember, ReportingSeniorConfig, Designator } from '@/types/roster';

export const INITIAL_RS_CONFIG: ReportingSeniorConfig = {
    name: "VADM Kazansky, T.",
    rank: "O-9",
    title: "CO",
    changeOfCommandDate: "2025-06-01",
    targetRsca: 4.20,
    totalReports: 0
};

// --- Data Arrays for Randomization ---
const FIRST_NAMES = [
    'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles',
    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
    'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua',
    'Michelle', 'Amanda', 'Dorothy', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Laura', 'Sharon', 'Cynthia'
];

const LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'
];

// --- Helper Functions ---

const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const getRandomDate = (start: Date, end: Date): Date => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

const getRandomTrait = (min: number, max: number): number => {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
};

let memberIdCounter = 1;

/**
 * Generates a group of members with specified Rank and Designator.
 */
const generateMembers = (
    rank: 'O-1' | 'O-2' | 'O-3',
    designator: Designator,
    count: number
): RosterMember[] => {
    const members: RosterMember[] = [];
    // Date Range for Report Date: Jan 1, 2022 to June 1, 2024
    const minDate = new Date('2022-01-01');
    const maxDate = new Date('2024-06-01');

    for (let i = 0; i < count; i++) {
        const id = `m-${rank.toLowerCase().replace('-', '')}-${memberIdCounter++}`;
        const firstName = getRandomElement(FIRST_NAMES);
        const lastName = getRandomElement(LAST_NAMES);

        const dateReportedObj = getRandomDate(minDate, maxDate);
        const dateReported = formatDate(dateReportedObj);

        // PRD is 2-3 years after Date Reported
        const prdYears = 2 + Math.random(); // 2.0 to 3.0
        const prdObj = new Date(dateReportedObj);
        prdObj.setFullYear(prdObj.getFullYear() + Math.floor(prdYears));
        prdObj.setMonth(prdObj.getMonth() + Math.floor((prdYears % 1) * 12));
        const prd = formatDate(prdObj);

        // Random Trait Average between 3.50 and 4.80
        const lastTrait = getRandomTrait(3.50, 4.80);

        // Determine Promotion Rec based on Trait (Simple logic for mock)
        let promoRec: 'EP' | 'MP' | 'P' = 'P';
        if (lastTrait >= 4.50) promoRec = 'EP';
        else if (lastTrait >= 3.80) promoRec = 'MP';

        // Determine Status based on PRD relative to "Now" (Jan 2025)
        // If PRD is within next 6 months of 2025-01-01, set to Transferring
        // BUT keep it simple as requested, mostly Promotable unless stated otherwise
        // Actually, let's make it realistic.
        const mockNow = new Date('2025-01-01');
        const monthsUntilPrd = (prdObj.getFullYear() - mockNow.getFullYear()) * 12 + (prdObj.getMonth() - mockNow.getMonth());

        let status: 'Promotable' | 'Transferring' = 'Promotable';
        if (monthsUntilPrd <= 6 && monthsUntilPrd >= 0) {
            status = 'Transferring';
        }

        const member: RosterMember = {
            id,
            firstName,
            lastName,
            rank,
            designator,
            dateReported,
            prd,
            status,
            reportsRemaining: Math.floor(Math.random() * 3) + 1, // 1-3
            history: [
                {
                    id: `r-prev-${id}`,
                    memberId: id,
                    traitAverage: lastTrait,
                    periodEndDate: '2024-01-01', // Generic past date
                    type: 'Periodic',
                    traitGrades: { 'Performance': lastTrait },
                    promotionRecommendation: promoRec,
                    reportingSeniorId: 'rs-legacy',
                    narrative: "Generated Mock History"
                } as any
            ]
        };

        members.push(member);
    }

    return members;
};

// --- Initial Roster Generation ---

const O3_MEMBERS = generateMembers('O-3', '1110', 25);
const O2_MEMBERS = generateMembers('O-2', '1110', 15);
const O1_MEMBERS = generateMembers('O-1', '1110', 15);

export const INITIAL_ROSTER: RosterMember[] = [
    ...O3_MEMBERS,
    ...O2_MEMBERS,
    ...O1_MEMBERS
];
