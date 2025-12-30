import type { RosterMember, ReportingSeniorConfig } from '@/types/roster';

export const INITIAL_RS_CONFIG: ReportingSeniorConfig = {
    name: "VADM Kazansky, T.",
    rank: "O-9",
    title: "CO",
    changeOfCommandDate: "2025-06-01", // This will trigger the MASS RS DETACH event mid-year
    targetRsca: 4.20,
    totalReports: 0 // Simulating a new RS for Ghost Baseline testing
};

export const INITIAL_ROSTER: RosterMember[] = [
    // --- O-5 (CDR) ---
    // Periodic: OCT 31
    {
        id: 'm-101',
        firstName: 'Pete',
        lastName: 'Mitchell',
        rank: 'O-5',
        designator: '1310',
        dateReported: '2023-01-01',
        prd: '2026-06-01',
        status: 'Promotable',
        reportsRemaining: 1,
        rankOrder: 1,
        // Mock History for Ghost Baseline Testing
        history: [
            {
                id: 'r-prev-101',
                memberId: 'm-101',
                traitAverage: 5.00, // Previous high grade
                periodEndDate: '2022-10-31',
                type: 'Periodic',
                traitGrades: { 'Performance': 5.0 }, // Minimal mock
                promotionRecommendation: 'EP',
                reportingSeniorId: 'rs-old'
            } as any // Cast to any to avoid filling all 50+ fields for this mock
        ]
    },

    // --- O-4 (LCDR) ---
    // Periodic: OCT 31
    {
        id: 'm-201',
        firstName: 'Bradley',
        lastName: 'Bradshaw',
        rank: 'O-4',
        designator: '1310',
        dateReported: '2023-05-15',
        prd: '2026-05-15',
        status: 'Promotable',
        reportsRemaining: 2,
        rankOrder: 2
    },
    {
        id: 'm-202',
        firstName: 'Natasha',
        lastName: 'Trace',
        rank: 'O-4',
        designator: '1310',
        dateReported: '2022-11-01',
        prd: '2025-11-01',
        status: 'Promotable',
        reportsRemaining: 1,
        rankOrder: 3
    },

    // --- O-3 (LT) ---
    // Periodic: JAN 31
    {
        id: 'm-301',
        firstName: 'Jake',
        lastName: 'Seresin',
        rank: 'O-3',
        designator: '1310',
        dateReported: '2024-02-01',
        prd: '2027-02-01',
        status: 'Promotable',
        reportsRemaining: 3,
        rankOrder: 4
    },
    {
        id: 'm-302',
        firstName: 'Mickey',
        lastName: 'Garcia',
        rank: 'O-3',
        designator: '1310',
        dateReported: '2023-08-01',
        prd: '2026-08-01',
        status: 'Promotable',
        reportsRemaining: 2,
        rankOrder: 5
    },
    {
        id: 'm-303',
        firstName: 'Robert',
        lastName: 'Floyd',
        rank: 'O-3',
        designator: '1310',
        dateReported: '2024-01-15',
        prd: '2026-01-15', // PRD implies a transfer report in Jan 2026
        status: 'Transferring',
        reportsRemaining: 1,
        rankOrder: 6
    },
    {
        id: 'm-304',
        firstName: 'Reuben',
        lastName: 'Fitch',
        rank: 'O-3',
        designator: '1310',
        dateReported: '2023-03-01',
        prd: '2026-03-01',
        status: 'Promotable',
        reportsRemaining: 2,
        rankOrder: 7
    },

    // --- O-2 (LTJG) ---
    // Periodic: FEB 28
    {
        id: 'm-401',
        firstName: 'Brigham',
        lastName: 'Hartley',
        rank: 'O-2',
        designator: '1310',
        dateReported: '2024-06-01',
        prd: '2027-06-01',
        status: 'Promotable',
        reportsRemaining: 3,
        rankOrder: 8
    },

    // --- O-1 (ENS) ---
    // Periodic: MAY 31
    {
        id: 'm-501',
        firstName: 'New',
        lastName: 'Guy',
        rank: 'O-1',
        designator: '1110',
        dateReported: '2024-12-01',
        prd: '2026-12-01',
        status: 'Promotable',
        reportsRemaining: 2,
        rankOrder: 9
    },

    // --- LDO/CWO (Example) ---
    // CWO2 Periodic: SEP 30
    {
        id: 'm-601',
        firstName: 'Bernie',
        lastName: 'Coleman',
        rank: 'W-2',
        designator: '6130',
        dateReported: '2020-01-01',
        prd: '2026-01-01',
        status: 'Retiring',
        reportsRemaining: 1,
        rankOrder: 10
    }
];
