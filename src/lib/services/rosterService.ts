import type { RosterEntry } from '../../types';

// Mock Roster Data
const MOCK_ROSTER: RosterEntry[] = [
    {
        memberId: 'm-1',
        fullName: 'CLARK, MATTHEW',
        rank: 'LT',
        designator: '1110',
        dateReported: '2023-01-15',
        prd: '2025-10-31',
        uic: '55555'
    },
    {
        memberId: 'm-2',
        fullName: 'SMITH, JOHN',
        rank: 'LCDR', // Periodic in Oct
        designator: '1110',
        dateReported: '2022-05-01',
        prd: '2024-12-31', // Approaching PRD
        uic: '55555'
    },
    {
        memberId: 'm-3',
        fullName: 'JONES, SARAH',
        rank: 'LT',
        designator: '1110',
        dateReported: '2024-02-10',
        prd: '2026-02-28',
        uic: '55555'
    }
];

export const RosterService = {
    getRoster: async (): Promise<RosterEntry[]> => {
        return new Promise((resolve) => {
            setTimeout(() => resolve(MOCK_ROSTER), 400);
        });
    },

    getMemberDetails: async (memberId: string): Promise<RosterEntry | undefined> => {
        return MOCK_ROSTER.find(m => m.memberId === memberId);
    }
};
