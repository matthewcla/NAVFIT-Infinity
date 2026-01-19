
import { describe, it, expect } from 'vitest';
import { optimizeGroup } from './rankOptimization';
import type { SummaryGroup, Report } from '@/types';
import { PromotionRecommendation } from '@/domain/policy/types';

// Mock Data Helper
const createMockReport = (id: string, memberId: string, currentMta: number, locked = false): Report => ({
    id,
    memberId,
    memberRank: 'O-3',
    memberName: `Member ${memberId}`,
    type: 'Periodic',
    periodEndDate: '2025-01-31',
    traitAverage: currentMta,
    promotionRecommendation: PromotionRecommendation.PROMOTABLE,
    isLocked: locked,
    traitGrades: {},
    isAdverse: false,
    notObservedReport: false,
    reportsRemaining: 1
} as Report);

describe('Optimization Engine', () => {

    it('should assign quotas based on rank order', () => {
        // Setup: 5 Members. 20% EP = 1 EP.
        const reports = [
            createMockReport('r1', 'm1', 3.80),
            createMockReport('r2', 'm2', 3.80),
            createMockReport('r3', 'm3', 3.80),
            createMockReport('r4', 'm4', 3.80),
            createMockReport('r5', 'm5', 3.80),
        ];

        const group: SummaryGroup = {
            id: 'g1',
            name: 'Test Group',
            periodEndDate: '2025-01-31',
            reports,
            competitiveGroupKey: 'O-3 URL',
            paygrade: 'O-3',
            designator: '1110'
        };

        // Rank Order: m3 is #1
        const rankList = ['m3', 'm1', 'm2', 'm5', 'm4'];

        const optimized = optimizeGroup(group, rankList);

        // Verify Rank 1 (m3) got EP
        const m3 = optimized.find(r => r.memberId === 'm3');
        expect(m3?.promotionRecommendation).toBe(PromotionRecommendation.EARLY_PROMOTE);

        // Verify Rank 2 (m1) got MP (assuming MP limit allows, usually 20-40% depending on EP)
        // O-3 Limits: EP=20% (1), MP=40% (2). So m1 and m2 should get MP.
        const m1 = optimized.find(r => r.memberId === 'm1');
        expect(m1?.promotionRecommendation).toBe(PromotionRecommendation.MUST_PROMOTE);
    });

    it('should water-fill MTA to target RSCA', () => {
        // Setup: 3 Members. Target 4.00.
        // Baselines: 3.60.
        // Total Budget needed: 12.00. Current: 10.8. Surplus: 1.20.

        const reports = [
            createMockReport('r1', 'm1', 3.60),
            createMockReport('r2', 'm2', 3.60),
            createMockReport('r3', 'm3', 3.60),
        ];

        const group: SummaryGroup = {
            id: 'g1', name: 'Test', periodEndDate: '2025-01-31', reports,
            competitiveGroupKey: 'key', paygrade: 'O-3', designator: '1110'
        };

        const rankList = ['m1', 'm2', 'm3'];

        // Optimize with Target 4.00
        const result = optimizeGroup(group, rankList, { targetRsca: 4.00 });

        // Expectation:
        // Rank 1 gets filled first.

        const m1 = result.find(r => r.memberId === 'm1')!;
        const m2 = result.find(r => r.memberId === 'm2')!;

        expect(m1.traitAverage).toBeGreaterThan(3.80);
        expect(m1.traitAverage).toBeLessThanOrEqual(5.00);

        // Ensure Rank 1 >= Rank 2 (Optimization should favor higher rank or at least equal)
        expect(m1.traitAverage).toBeGreaterThanOrEqual(m2.traitAverage);
    });

    it('should respect locked reports', () => {
        // Setup: m1 is Locked at 3.00 P.
        // m2 is open.
        // Target very high.

        const reports = [
            createMockReport('r1', 'm1', 3.00, true), // Locked
            createMockReport('r2', 'm2', 3.00, false),
        ];

        const group: SummaryGroup = {
            id: 'g1', name: 'Test', periodEndDate: '2025-01-31', reports,
            competitiveGroupKey: 'key', paygrade: 'O-3', designator: '1110'
        };

        const result = optimizeGroup(group, ['m1', 'm2'], { targetRsca: 4.50 });

        const m1 = result.find(r => r.memberId === 'm1')!;
        const m2 = result.find(r => r.memberId === 'm2')!;

        expect(m1.traitAverage).toBe(3.00); // Should not change
        expect(m2.traitAverage).toBeGreaterThan(3.00); // Should soak up budget
    });

});
