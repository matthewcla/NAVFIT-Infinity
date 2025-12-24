import type { Board, BoardSchedule } from '../../types';

// Mock Data
const MOCK_BOARDS: Board[] = [
    {
        id: 'b-1',
        name: 'FY-26 Active-Duty Lieutenant Commander Line',
        type: 'Statutory',
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
        conveningDate: '2025-09-15',
        eligibles: ['m-1']
    }
];

export const BoardService = {
    getSchedule: async (year: number): Promise<BoardSchedule> => {
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    year,
                    boards: MOCK_BOARDS
                });
            }, 500);
        });
    },

    addCustomBoard: async (board: Omit<Board, 'id'>): Promise<Board> => {
        const newBoard = { ...board, id: `cb-${Date.now()}` };
        MOCK_BOARDS.push(newBoard);
        return newBoard;
    },

    // Helper to find boards a member is eligible for
    getBoardsForMember: async (memberId: string): Promise<Board[]> => {
        return MOCK_BOARDS.filter(b =>
            b.zones?.inZone.includes(memberId) ||
            b.zones?.aboveZone.includes(memberId) ||
            b.zones?.belowZone.includes(memberId) ||
            b.eligibles?.includes(memberId)
        );
    }
};
