
import { describe, it, expect } from 'vitest';
import { calculateEotRsca } from './rsca';

describe('calculateEotRsca', () => {
    // Mock Data Helpers
    const createMember = (id: string, rank: string, prd: string, lastTrait: number) => ({
        id,
        rank,
        prd,
        lastTrait
    });

    const TODAY = new Date();
    const CURRENT_YEAR = TODAY.getFullYear();


    const makeRelativeDate = (monthsOffset: number) => {
        const d = new Date();
        d.setMonth(d.getMonth() + monthsOffset);
        return d.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    it('should return currentRsca if no members of target rank exist', () => {
        // Test that empty roster returns currentRsca
        const result = calculateEotRsca([], 3.50, 10, '2030-01-01', 'O-4');
        expect(result.eotRsca).toBe(3.50);
    });

    it('should simulate improvement over time for a single member', () => {
        const rsDetach = `${CURRENT_YEAR + 2}-02-28`; // 2 years out roughly
        const memberPrd = `${CURRENT_YEAR + 2}-05-01`;

        const roster = [createMember('1', 'O-3', memberPrd, 4.00)];
        const currentRsca = 4.00;
        const totalSigned = 10;

        const result = calculateEotRsca(roster, currentRsca, totalSigned, rsDetach, 'O-3');

        expect(result.eotRsca).toBeGreaterThan(4.00);
        // Verify projection map
        expect(result.memberProjections['1']).toBeDefined();
        expect(result.memberProjections['1']).toBeGreaterThan(4.00);
    });

    it('should handle transfer reports correctly', () => {
        const rsDetach = makeRelativeDate(12);
        const memberPrd = makeRelativeDate(1); // 1 month out

        const roster = [createMember('1', 'O-3', memberPrd, 3.80)];

        const result = calculateEotRsca(roster, 3.00, 0, rsDetach, 'O-3');

        expect(result.eotRsca).toBeGreaterThan(3.80);
        expect(result.eotRsca).toBeLessThan(4.00);
    });

    it('should accumulate correctly with multiple members', () => {
        const rsDetach = `${CURRENT_YEAR + 3}-06-01`; // far future
        const roster = [
            createMember('1', 'O-3', rsDetach, 4.00),
            createMember('2', 'O-3', rsDetach, 3.00)
        ];

        const result = calculateEotRsca(roster, 3.50, 10, rsDetach, 'O-3');

        expect(result.eotRsca).toBeGreaterThan(0);
        expect(result.eotRsca).toBeLessThan(5.0);
        expect(result.memberProjections['2']).toBeDefined();
    });

});
