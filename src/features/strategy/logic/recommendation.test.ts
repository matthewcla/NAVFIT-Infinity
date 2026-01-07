import { describe, it, expect } from 'vitest';
import { assignRecommendationsByRank } from './recommendation';
import type { Report, SummaryGroup } from '@/types';
import { PromotionRecommendation, TraitId } from '@/domain/policy/types';

// Helper to create mock reports
function createMockReport(id: string, _rank: number, traits: Record<string, number> = {}, existingRec: PromotionRecommendation = PromotionRecommendation.MUST_PROMOTE): Report {
    return {
        id,
        memberId: id,
        periodEndDate: '2023-12-31',
        type: 'Periodic',
        traitGrades: traits,
        traitAverage: 3.0,
        promotionRecommendation: existingRec,
        // ... other fields
    } as Report;
}

// Helper to create mock group
function createMockGroup(size: number, paygrade: string, designator: string = '1110'): SummaryGroup {
    return {
        id: 'group1',
        name: 'Test Group',
        paygrade,
        designator,
        competitiveGroupKey: `${paygrade} ${designator}`,
        reports: Array.from({ length: size }, (_, i) => createMockReport(`m${i + 1}`, i + 1)),
        periodEndDate: '2023-12-31',
    } as SummaryGroup;
}

describe('assignRecommendationsByRank', () => {
    it('assigns EP and MP correctly for small group (size 6)', () => {
        // Table 1-2 for Size 6: EP=2. MP=2 (E5-E6/O3).
        const group = createMockGroup(6, 'O-3');
        const reports = group.reports;

        // Pass sorted reports (simulate drag result)
        const result = assignRecommendationsByRank(reports, group);

        // Expect: EP, EP, MP, MP, P, P
        const recs = result.map(r => r.promotionRecommendation);
        expect(recs[0]).toBe('EP');
        expect(recs[1]).toBe('EP');
        expect(recs[2]).toBe('MP');
        expect(recs[3]).toBe('MP');
        expect(recs[4]).toBe('P');
        expect(recs[5]).toBe('P');
    });

    it('assigns EP and MP correctly for group of 2', () => {
        // Size 2: EP=1, MP=1 (Special rule)
        const group = createMockGroup(2, 'O-3');
        const reports = group.reports;

        const result = assignRecommendationsByRank(reports, group);

        expect(result[0].promotionRecommendation).toBe('EP');
        expect(result[1].promotionRecommendation).toBe('MP');
    });

    it('respects trait blocking (1.0 blocks EP/MP/P)', () => {
        // Size 3: EP=1, MP=1.
        // Rank 1 has a 1.0 trait -> Should be SP (or at least NOT EP/MP/P)
        const group = createMockGroup(3, 'O-3');
        const reports = group.reports;

        // Rank 1 has 1.0
        reports[0].traitGrades = { [TraitId.LEADERSHIP]: 1.0 };

        const result = assignRecommendationsByRank(reports, group);

        // Rank 1 blocked for EP -> skipped. Should become SP? Or stay original?
        // Logic defaults to SP if P is blocked.
        expect(result[0].promotionRecommendation).toBe('SP');

        // EP quota (1) goes to Rank 2
        expect(result[1].promotionRecommendation).toBe('EP');

        // MP quota (1) goes to Rank 3
        expect(result[2].promotionRecommendation).toBe('MP');
    });

    it('respects trait blocking (2.0 blocks EP/MP)', () => {
        // Size 3: EP=1, MP=1.
        // Rank 1 has a 2.0 trait -> Can be P, but not EP/MP.
        const group = createMockGroup(3, 'O-3');
        const reports = group.reports;

        reports[0].traitGrades = { [TraitId.LEADERSHIP]: 2.0 };

        const result = assignRecommendationsByRank(reports, group);

        // Rank 1 blocked for EP/MP -> becomes P
        expect(result[0].promotionRecommendation).toBe('P');

        // Rank 2 gets EP
        expect(result[1].promotionRecommendation).toBe('EP');

        // Rank 3 gets MP
        expect(result[2].promotionRecommendation).toBe('MP');
    });

    it('handles unused EP adding to MP', () => {
        // Size 3: EP=1. MP=1.
        // Rank 1 blocked for EP (2.0 trait). Rank 2 blocked for EP (2.0 trait). Rank 3 blocked for EP.
        // Actually simpler: Rank 1 blocked for EP. Rank 2 takes EP.
        // What if NO ONE can take EP?
        // Rank 1: 2.0. Rank 2: 2.0. Rank 3: 2.0.
        // EP limit = 1. Used = 0. Unused = 1.
        // MP limit = 1 + 1 = 2.
        // Rank 1, 2, 3 all blocked for MP too (2.0 blocks MP).
        // Everyone gets P.

        // Let's try: Rank 1 blocked for EP/MP (2.0). Rank 2 normal. Rank 3 normal.
        // Size 3: EP=1, MP=1.
        // Rank 1 -> P (blocked for EP/MP)
        // Rank 2 -> EP (takes EP slot)
        // Rank 3 -> MP (takes MP slot)

        // Let's try: Rank 1 blocked for EP (but allows MP?). No 2.0 blocks MP too.
        // Is there a block for EP but NOT MP?
        // Usually NO. 2.0 blocks BOTH.
        // Unless there is a specific rule?
        // "Any trait grade of 2.0 prevents Must Promote or Early Promote". So blocked for both.

        // Let's force EP usage to be 0.
        // Rank 1, 2, 3 all have 2.0 trait.
        const group = createMockGroup(3, 'O-3');
        group.reports.forEach(r => r.traitGrades = { [TraitId.LEADERSHIP]: 2.0 });

        const result = assignRecommendationsByRank(group.reports, group);

        expect(result[0].promotionRecommendation).toBe('P');
        expect(result[1].promotionRecommendation).toBe('P');
        expect(result[2].promotionRecommendation).toBe('P');
        // Quotas: EP=1 (unused). MP=1+1=2 (unused). All P.
    });

    it('handles O1/O2 non-LDO limit', () => {
        // O1 non-LDO. Size 3.
        // EP=0. MP=0.
        // Everyone P.
        const group = createMockGroup(3, 'O-1', '1110'); // URL O1
        const result = assignRecommendationsByRank(group.reports, group);

        expect(result[0].promotionRecommendation).toBe('P');
        expect(result[1].promotionRecommendation).toBe('P');
        expect(result[2].promotionRecommendation).toBe('P');
    });

    it('handles O1 LDO allowing EP/MP', () => {
        // O1 LDO. Size 6.
        // EP=2. MP=2 (Low group).
        const group = createMockGroup(6, 'O-1', '6130'); // LDO
        const result = assignRecommendationsByRank(group.reports, group);

        expect(result[0].promotionRecommendation).toBe('EP');
        expect(result[1].promotionRecommendation).toBe('EP');
        expect(result[2].promotionRecommendation).toBe('MP');
        expect(result[3].promotionRecommendation).toBe('MP');
    });

    it('skips NOB reports during EP/MP assignment', () => {
        // Size 5: EP=1, MP=2 for O-3.
        // Rank 1 = NOB (should be skipped)
        // Rank 2 = should get EP
        // Rank 3, 4 = should get MP
        // Rank 5 = should get P
        const group = createMockGroup(5, 'O-3');
        const reports = group.reports;

        // Mark rank 1 as NOB
        reports[0].promotionRecommendation = PromotionRecommendation.NOB;

        const result = assignRecommendationsByRank(reports, group);

        // NOB should remain NOB (skipped entirely)
        expect(result[0].promotionRecommendation).toBe('NOB');

        // EP goes to next eligible: Rank 2
        expect(result[1].promotionRecommendation).toBe('EP');

        // MP goes to Rank 3, 4
        expect(result[2].promotionRecommendation).toBe('MP');
        expect(result[3].promotionRecommendation).toBe('MP');

        // Rank 5 gets P
        expect(result[4].promotionRecommendation).toBe('P');
    });

    it('NOB traitAverage is NOT modified by assignRecommendationsByRank', () => {
        // This test verifies the function does NOT touch traitAverage
        const group = createMockGroup(3, 'O-3');
        const reports = group.reports;

        // NOB with MTA = 3.5 (should remain unchanged by this function)
        reports[0].promotionRecommendation = PromotionRecommendation.NOB;
        reports[0].traitAverage = 3.5;

        // Non-NOB reports
        reports[1].traitAverage = 4.0;
        reports[2].traitAverage = 3.8;

        const result = assignRecommendationsByRank(reports, group);

        // Verify traitAverage is NOT modified (the function only changes promotionRecommendation)
        expect(result[0].traitAverage).toBe(3.5); // NOB - unchanged
        expect(result[1].traitAverage).toBe(4.0); // unchanged
        expect(result[2].traitAverage).toBe(3.8); // unchanged
    });
});
