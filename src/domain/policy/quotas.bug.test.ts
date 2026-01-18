/**
 * Bug Reproduction Test for MTA Distribution Control
 * 
 * This test specifically reproduces the issue where:
 * - E1-E4, W1-W2, LDO O1-O2 groups have "No Limit" for MP
 * - This causes ALL remaining members after EP to get MP
 * - Result: Zero P (Promotable) assignments, violating BUPERS requirements
 */
import { describe, it, expect } from 'vitest';
import { computeEpMax, computeMpMax } from './quotas';
import { Paygrade, RankCategory, type SummaryGroupContext } from './types';

describe('Quota Bug Reproduction - Low MP Groups', () => {
    it('E-4 group of 6 should NOT assign MP to all remaining after EP', () => {
        // E-4 is in the "low" MP group (E1-E4), which has "No Limit" for MP
        const context: SummaryGroupContext = {
            size: 6,
            paygrade: Paygrade.E4,
            rankCategory: RankCategory.ENLISTED,
            isLDO: false,
            isCWO: false
        };

        const epLimit = computeEpMax(6, context);
        console.log('EP Limit for E-4 size 6:', epLimit);

        // Table 1-2 says EP=2 for size 6
        expect(epLimit).toBe(2);

        // If 2 EPs are assigned, what's the MP limit?
        const mpLimit = computeMpMax(6, context, 2);
        console.log('MP Limit for E-4 size 6 with 2 EP used:', mpLimit);

        // BUG: Currently returns 4 (6-2=4), leaving 0 P's
        // This is the bug! Table 1-2 says MP="No Limit" for E1-E4,
        // but we should still ensure a reasonable distribution

        // Log the actual distribution
        console.log('EP:', 2, 'MP:', mpLimit, 'P:', 6 - 2 - mpLimit);

        // This assertion will FAIL with current code, exposing the bug
        // If mpLimit is 4, then P count is 0
        expect(6 - 2 - mpLimit).toBeGreaterThan(0); // At least 1 P required
    });

    it('E-3 group of 5 should have some P recommendations', () => {
        const context: SummaryGroupContext = {
            size: 5,
            paygrade: Paygrade.E3,
            rankCategory: RankCategory.ENLISTED,
            isLDO: false,
            isCWO: false
        };

        const epLimit = computeEpMax(5, context);
        const mpLimit = computeMpMax(5, context, epLimit);

        console.log('E-3 size 5: EP:', epLimit, 'MP:', mpLimit, 'P:', 5 - epLimit - mpLimit);

        // Should have at least 1 P
        expect(5 - epLimit - mpLimit).toBeGreaterThan(0);
    });

    it('W-2 group of 4 should have some P recommendations', () => {
        const context: SummaryGroupContext = {
            size: 4,
            paygrade: Paygrade.W2,
            rankCategory: RankCategory.WARRANT,
            isLDO: false,
            isCWO: true
        };

        const epLimit = computeEpMax(4, context);
        const mpLimit = computeMpMax(4, context, epLimit);

        console.log('W-2 size 4: EP:', epLimit, 'MP:', mpLimit, 'P:', 4 - epLimit - mpLimit);

        // Should have at least 1 P
        expect(4 - epLimit - mpLimit).toBeGreaterThan(0);
    });

    it('LDO O-1 group of 6 should have some P recommendations', () => {
        const context: SummaryGroupContext = {
            size: 6,
            paygrade: Paygrade.O1,
            rankCategory: RankCategory.OFFICER,
            isLDO: true,
            isCWO: false
        };

        const epLimit = computeEpMax(6, context);
        const mpLimit = computeMpMax(6, context, epLimit);

        console.log('LDO O-1 size 6: EP:', epLimit, 'MP:', mpLimit, 'P:', 6 - epLimit - mpLimit);

        // Should have at least 1 P
        expect(6 - epLimit - mpLimit).toBeGreaterThan(0);
    });
});
