import type { RosterMember, ReportingSeniorConfig } from '@/types/roster';

export const INITIAL_RS_CONFIG: ReportingSeniorConfig = {
    name: "VADM Kazansky, T.",
    rank: "O-9",
    title: "CO",
    changeOfCommandDate: "2025-06-01" // This will trigger the MASS RS DETACH event mid-year
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
        prd: '2026-06-01'
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
        prd: '2026-05-15'
    },
    {
        id: 'm-202',
        firstName: 'Natasha',
        lastName: 'Trace',
        rank: 'O-4',
        designator: '1310',
        dateReported: '2022-11-01',
        prd: '2025-11-01'
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
        prd: '2027-02-01'
    },
    {
        id: 'm-302',
        firstName: 'Mickey',
        lastName: 'Garcia',
        rank: 'O-3',
        designator: '1310',
        dateReported: '2023-08-01',
        prd: '2026-08-01'
    },
    {
        id: 'm-303',
        firstName: 'Robert',
        lastName: 'Floyd',
        rank: 'O-3',
        designator: '1310',
        dateReported: '2024-01-15',
        prd: '2026-01-15' // PRD implies a transfer report in Jan 2026
    },
    {
        id: 'm-304',
        firstName: 'Reuben',
        lastName: 'Fitch',
        rank: 'O-3',
        designator: '1310',
        dateReported: '2023-03-01',
        prd: '2026-03-01'
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
        prd: '2027-06-01'
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
        prd: '2026-12-01'
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
        prd: '2026-01-01'
    }
];
