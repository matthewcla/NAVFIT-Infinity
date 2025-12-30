import type { RosterMember, ReportingSeniorConfig } from '@/types/roster';

export const INITIAL_RS_CONFIG: ReportingSeniorConfig = {
    name: "VADM Kazansky, T.",
    rank: "O-9",
    title: "CO",
    changeOfCommandDate: "2025-06-01", // This will trigger the MASS RS DETACH event mid-year
    targetRsca: 4.20,
    totalReports: 0 // Simulating a new RS for Ghost Baseline testing
};

// Helper to generate members
const createMember = (
    idSuffix: number,
    rank: 'O-1' | 'O-2' | 'O-3',
    lastName: string,
    dateReported: string,
    prd: string,
    rankOrder: number,
    status: 'Promotable' | 'Transferring' | 'Retiring' | 'Gains' = 'Promotable',
    reportsRemaining: number = 2,
    lastTrait: number = 4.0
): RosterMember => {
    let designation: import('@/types/roster').Designator = '1110'; // Forced 1110

    // Auto-generate ID and Name
    const id = `m-${rank.replace('-', '')}-${idSuffix}`;
    const firstName = `Test-${idSuffix}`;

    return {
        id,
        firstName,
        lastName,
        rank,
        designator: designation,
        dateReported,
        prd,
        status: status === 'Gains' ? 'Promotable' : status, // Gains is usually promotable but just recently reported
        reportsRemaining,
        rankOrder,
        history: [
            {
                id: `r-prev-${idSuffix}`,
                memberId: id,
                traitAverage: lastTrait,
                periodEndDate: '2024-10-31', // Mock previous report
                type: 'Periodic',
                traitGrades: { 'Performance': lastTrait },
                promotionRecommendation: lastTrait >= 4.5 ? 'EP' : (lastTrait >= 3.8 ? 'MP' : 'P'),
                reportingSeniorId: 'rs-old'
            } as any
        ]
    };
};

const O3_LTS: RosterMember[] = [
    // --- O-3 (LT) 1110 --- (25 Members)
    // Periodic: JAN 31
    // Mix of Onboard, Transferring, Gains, Retiring

    // Top Performers / Established (Onboard)
    createMember(301, 'O-3', 'Mitchell', '2023-01-01', '2026-06-01', 1, 'Promotable', 3, 5.00),
    createMember(302, 'O-3', 'Kazansky', '2023-02-01', '2026-07-01', 2, 'Promotable', 3, 4.90),
    createMember(303, 'O-3', 'Bradshaw', '2023-03-01', '2026-08-01', 3, 'Promotable', 3, 4.80),
    createMember(304, 'O-3', 'Seresin', '2023-04-01', '2026-09-01', 4, 'Promotable', 3, 4.75),
    createMember(305, 'O-3', 'Trace', '2023-05-01', '2026-10-01', 5, 'Promotable', 3, 4.70),
    createMember(306, 'O-3', 'Floyd', '2023-06-01', '2026-11-01', 6, 'Promotable', 3, 4.60),
    createMember(307, 'O-3', 'Fitch', '2023-07-01', '2026-12-01', 7, 'Promotable', 3, 4.50),
    createMember(308, 'O-3', 'Machado', '2023-08-01', '2027-01-01', 8, 'Promotable', 3, 4.40),
    createMember(309, 'O-3', 'Garcia', '2023-09-01', '2027-02-01', 9, 'Promotable', 3, 4.30),
    createMember(310, 'O-3', 'Wang', '2023-10-01', '2027-03-01', 10, 'Promotable', 3, 4.20),

    // Middle Pack / Standard (Onboard)
    createMember(311, 'O-3', 'Johnson', '2022-12-01', '2025-12-01', 11, 'Promotable', 2, 4.10),
    createMember(312, 'O-3', 'Smith', '2022-11-01', '2025-11-01', 12, 'Promotable', 2, 4.00),
    createMember(313, 'O-3', 'Williams', '2022-10-01', '2025-10-01', 13, 'Promotable', 2, 3.90),
    createMember(314, 'O-3', 'Brown', '2022-09-01', '2025-09-01', 14, 'Promotable', 2, 3.80),
    createMember(315, 'O-3', 'Jones', '2022-08-01', '2025-08-01', 15, 'Promotable', 2, 3.70),

    // Gains (Recently Reported)
    createMember(316, 'O-3', 'Miller', '2024-11-01', '2027-11-01', 16, 'Promotable', 4, 3.85), // Recent Gain
    createMember(317, 'O-3', 'Davis', '2024-12-15', '2027-12-15', 17, 'Promotable', 4, 3.95), // Recent Gain

    // Transferring (PRD soon)
    createMember(318, 'O-3', 'Gomez', '2022-04-01', '2025-04-01', 18, 'Transferring', 1, 4.15), // PRD in 3 months
    createMember(319, 'O-3', 'Rodriguez', '2022-05-01', '2025-05-01', 19, 'Transferring', 1, 4.05), // PRD in 4 months
    createMember(320, 'O-3', 'Martinez', '2022-06-01', '2025-06-01', 20, 'Transferring', 1, 3.95), // PRD in 5 months

    // Retiring / Separating
    createMember(321, 'O-3', 'Hernandez', '2021-01-01', '2025-02-01', 21, 'Retiring', 1, 3.50), // Retiring soon
    createMember(322, 'O-3', 'Lopez', '2021-02-01', '2025-03-01', 22, 'Retiring', 1, 3.40),

    // Others
    createMember(323, 'O-3', 'Gonzalez', '2023-01-15', '2026-01-15', 23, 'Promotable', 2, 3.60),
    createMember(324, 'O-3', 'Wilson', '2023-02-15', '2026-02-15', 24, 'Promotable', 2, 3.50),
    createMember(325, 'O-3', 'Anderson', '2023-03-15', '2026-03-15', 25, 'Promotable', 2, 3.30),
];

// O-2 (LTJG) 1110 (15 Members)
// Periodic: FEB 28
const O2_LTJGS: RosterMember[] = [
    createMember(401, 'O-2', 'Thomas', '2024-01-01', '2026-01-01', 1, 'Promotable', 3, 4.20),
    createMember(402, 'O-2', 'Taylor', '2024-02-01', '2026-02-01', 2, 'Promotable', 3, 4.10),
    createMember(403, 'O-2', 'Moore', '2024-03-01', '2026-03-01', 3, 'Promotable', 3, 4.00),
    createMember(404, 'O-2', 'Jackson', '2024-04-01', '2026-04-01', 4, 'Promotable', 3, 3.90),
    createMember(405, 'O-2', 'Martin', '2024-05-01', '2026-05-01', 5, 'Promotable', 3, 3.80),
    createMember(406, 'O-2', 'Lee', '2024-06-01', '2026-06-01', 6, 'Promotable', 3, 3.70),
    createMember(407, 'O-2', 'Perez', '2024-07-01', '2026-07-01', 7, 'Promotable', 3, 3.60),
    createMember(408, 'O-2', 'Thompson', '2024-08-01', '2026-08-01', 8, 'Promotable', 3, 3.50),
    createMember(409, 'O-2', 'White', '2024-09-01', '2026-09-01', 9, 'Promotable', 3, 3.40),
    createMember(410, 'O-2', 'Harris', '2024-10-01', '2026-10-01', 10, 'Promotable', 3, 3.30),
    createMember(411, 'O-2', 'Sanchez', '2024-11-01', '2026-11-01', 11, 'Promotable', 3, 3.20),
    createMember(412, 'O-2', 'Clark', '2024-12-01', '2026-12-01', 12, 'Promotable', 3, 3.10),
    createMember(413, 'O-2', 'Ramirez', '2023-12-01', '2025-12-01', 13, 'Transferring', 1, 3.00), // Transferring soon
    createMember(414, 'O-2', 'Lewis', '2023-11-01', '2025-11-01', 14, 'Transferring', 1, 3.00),
    createMember(415, 'O-2', 'Robinson', '2023-10-01', '2025-10-01', 15, 'Transferring', 1, 3.00),
];

// O-1 (ENS) 1110 (15 Members)
// Periodic: MAY 31
const O1_ENS: RosterMember[] = [
    createMember(501, 'O-1', 'Walker', '2024-06-01', '2026-06-01', 1, 'Promotable', 2, 3.80),
    createMember(502, 'O-1', 'Young', '2024-07-01', '2026-07-01', 2, 'Promotable', 2, 3.70), // Typical NOB/first report? Giving score for data
    createMember(503, 'O-1', 'Allen', '2024-08-01', '2026-08-01', 3, 'Promotable', 2, 3.60),
    createMember(504, 'O-1', 'King', '2024-09-01', '2026-09-01', 4, 'Promotable', 2, 3.50),
    createMember(505, 'O-1', 'Wright', '2024-10-01', '2026-10-01', 5, 'Promotable', 2, 3.40),
    createMember(506, 'O-1', 'Scott', '2024-11-01', '2026-11-01', 6, 'Promotable', 2, 3.30),
    createMember(507, 'O-1', 'Torres', '2024-12-01', '2026-12-01', 7, 'Promotable', 2, 3.20),
    createMember(508, 'O-1', 'Nguyen', '2025-01-01', '2027-01-01', 8, 'Promotable', 2, 3.00), // New Gain
    createMember(509, 'O-1', 'Hill', '2025-01-15', '2027-01-15', 9, 'Promotable', 2, 3.00),
    createMember(510, 'O-1', 'Flores', '2024-05-15', '2026-05-15', 10, 'Promotable', 2, 3.10),
    createMember(511, 'O-1', 'Green', '2024-04-15', '2026-04-15', 11, 'Promotable', 2, 3.10),
    createMember(512, 'O-1', 'Adams', '2024-03-15', '2026-03-15', 12, 'Promotable', 2, 3.10),
    createMember(513, 'O-1', 'Nelson', '2024-02-15', '2026-02-15', 13, 'Promotable', 2, 3.10),
    createMember(514, 'O-1', 'Baker', '2024-01-15', '2026-01-15', 14, 'Promotable', 2, 3.10),
    createMember(515, 'O-1', 'Hall', '2023-12-15', '2025-12-15', 15, 'Promotable', 2, 3.10),
];

export const INITIAL_ROSTER: RosterMember[] = [
    ...O3_LTS,
    ...O2_LTJGS,
    ...O1_ENS
];
