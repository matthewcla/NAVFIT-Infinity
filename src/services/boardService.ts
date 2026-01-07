import type { Board, BoardSchedule } from '@/types';

// Standard API Response Interface
export interface ApiResponse<T> {
    data: T;
    status: number;
    message?: string;
}

// Mock Fetch Helper - Simulate API latency and response structure
async function mockFetch<T>(data: T, delay: number = 500): Promise<ApiResponse<T>> {
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

// Mock Data
const MOCK_BOARDS: Board[] = [
    {
        id: 'b-1',
        name: 'FY-26 Active-Duty Lieutenant Commander Line',
        type: 'Statutory',
        conveneDate: '2025-05-12',
        conveningDate: '2025-05-12',
        zones: {
            aboveZone: [],
            inZone: ['m-1', 'm-3'],
            belowZone: ['m-4']
        }
    },
    {
        id: 'b-2',
        name: 'FY-26 Active-Duty Commander Staff',
        type: 'Statutory',
        conveneDate: '2025-04-01',
        conveningDate: '2025-04-01',
        zones: {
            aboveZone: [],
            inZone: [],
            belowZone: []
        }
    },
    {
        id: 'b-3',
        name: 'Command Screen',
        type: 'Administrative',
        conveneDate: '2025-09-15',
        conveningDate: '2025-09-15',
        eligibles: ['m-1']
    }
];

export const BoardService = {
    getSchedule: async (year: number): Promise<BoardSchedule> => {
        // Simulate API call
        const schedule: BoardSchedule = {
            id: `sched-${year}`,
            boardId: `board-schedule-${year}`,
            paygrade: 'ALL',
            recordsDueDate: `${year}-01-01`,
            year,
            boards: MOCK_BOARDS
        };
        const response = await mockFetch(schedule);
        return response.data;
    },

    addCustomBoard: async (board: Omit<Board, 'id'>): Promise<Board> => {
        const newBoard = { ...board, id: `cb-${Date.now()}` };
        MOCK_BOARDS.push(newBoard);
        const response = await mockFetch(newBoard);
        return response.data;
    },

    // Helper to find boards a member is eligible for
    getBoardsForMember: async (memberId: string): Promise<Board[]> => {
        const boards = MOCK_BOARDS.filter(b =>
            b.zones?.inZone.includes(memberId) ||
            b.zones?.aboveZone.includes(memberId) ||
            b.zones?.belowZone.includes(memberId) ||
            b.eligibles?.includes(memberId)
        );
        const response = await mockFetch(boards);
        return response.data;
    }
};
