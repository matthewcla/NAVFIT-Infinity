import type { RosterMember, ReportingSeniorConfig, PayGrade, Designator } from '../types/roster';

const FIRST_NAMES = [
    'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
    'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen',
    'Christopher', 'Lisa', 'Daniel', 'Nancy', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra'
];

const LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
];

/**
 * Helper to generate a random number between min and max (inclusive of min, roughly inclusive of max depending on rounding)
 */
const getRandomInt = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Helper to pick a random element from an array
 */
const getRandomElement = <T>(arr: T[]): T => {
    return arr[Math.floor(Math.random() * arr.length)];
};

/**
 * Helper to generate a random date between two dates
 */
const getRandomDate = (start: Date, end: Date): string => {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
};

/**
 * Helper to add years to a date string
 */
const addYears = (dateStr: string, years: number): string => {
    const date = new Date(dateStr);
    date.setFullYear(date.getFullYear() + years);
    return date.toISOString().split('T')[0];
};

/**
 * Generate a list of members based on criteria
 */
const generateMember = (
    rank: PayGrade,
    designator: Designator | '0000',
    promotionStatus: 'REGULAR' | 'FROCKED' | 'SELECTED' | 'SPOT',
    count: number
): RosterMember[] => {
    const members: RosterMember[] = [];

    for (let i = 0; i < count; i++) {
        const firstName = getRandomElement(FIRST_NAMES);
        const lastName = getRandomElement(LAST_NAMES);
        const dateReported = getRandomDate(new Date('2022-01-01'), new Date('2024-06-01'));

        // Random PRD 2-3 years after dateReported
        const prd = addYears(dateReported, getRandomInt(2, 3));

        // Random last trait between 3.50 and 4.80
        const lastTrait = parseFloat((Math.random() * (4.80 - 3.50) + 3.50).toFixed(2));

        members.push({
            id: `m-${rank}-${promotionStatus.substring(0, 3)}-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
            firstName,
            lastName,
            rank,
            designator: designator as Designator, // Casting for 0000 since Designator type might technically be strict, but '0000' is requested for enlisted
            promotionStatus,
            dateReported,
            prd,
            lastTrait,
        });
    }

    return members;
};

// 2. Generate the Roster Data
const o3_1110_regular = generateMember('O-3', '1110', 'REGULAR', 15);
const o3_1110_frocked = generateMember('O-3', '1110', 'FROCKED', 5);

// Use '0000' for Enlisted
const e6_regular = generateMember('E-6', '0000', 'REGULAR', 10);

export const INITIAL_ROSTER: RosterMember[] = [
    ...o3_1110_regular,
    ...o3_1110_frocked,
    ...e6_regular,
];

// 3. Export INITIAL_RS_CONFIG
export const INITIAL_RS_CONFIG: ReportingSeniorConfig = {
    name: 'CAPT J. T. Kirk',
    rank: 'O-6',
    title: 'CO',
    changeOfCommandDate: '2025-06-01', // Updated date
    targetRsca: 4.10,
    totalReports: 124,
};
