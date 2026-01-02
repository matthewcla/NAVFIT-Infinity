import type { RosterEntry } from '@/types';

// Standard API Response Interface
export interface ApiResponse<T> {
    data: T;
    status: number;
    message?: string;
}

// Mock Fetch Helper - Simulate API latency and response structure
async function mockFetch<T>(data: T, delay: number = 400): Promise<ApiResponse<T>> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                data,
                status: 200,
                message: 'Success'
            });
        }, delay);
    });
}

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
        const response = await mockFetch(MOCK_ROSTER);
        return response.data;
    },

    getMemberDetails: async (memberId: string): Promise<RosterEntry | undefined> => {
        const member = MOCK_ROSTER.find(m => m.memberId === memberId);
        const response = await mockFetch(member);
        return response.data;
    }
};
