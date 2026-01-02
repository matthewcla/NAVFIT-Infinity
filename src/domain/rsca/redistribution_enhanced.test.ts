import { describe, it, expect } from 'vitest';
import { redistributeMTA, boundedIsotonicRegressionWithAnchors, computeBaselineCurve, computeWeights } from './redistribution';
import { Member, Constraints, RedistributionReasonCode } from './types';

// Helper to create members
const createMembers = (mtas: number[], anchors: { index: number; value: number }[] = []): Member[] => {
  return mtas.map((mta, i) => ({
    id: `m-${i}`,
    rank: i + 1, // Rank 1 is highest
    mta,
    isAnchor: anchors.some(a => a.index === i),
    anchorValue: anchors.find(a => a.index === i)?.value,
  }));
};

const DEFAULT_CONSTRAINTS: Constraints = {
  controlBandLower: 3.8,
  controlBandUpper: 4.2,
  mtaLowerBound: 2.0,
  mtaUpperBound: 5.0,
};

describe('Redistribution Engine Enhanced', () => {
  describe('changedMembers', () => {
    it('should report changed members', () => {
      const members = createMembers([3.0, 3.0, 3.0]);
      // Target 4.0. All should change.
      const result = redistributeMTA(members, DEFAULT_CONSTRAINTS, 4.0);
      expect(result.changedMembers).toHaveLength(3);
      expect(result.changedMembers![0].delta).toBeGreaterThan(0);
      expect(result.changedMembers![0].id).toBe('m-0');
    });

    it('should not include unchanged members', () => {
        const members = createMembers([4.0, 4.0, 4.0]);
        // Target 4.0. No change needed.
        const result = redistributeMTA(members, DEFAULT_CONSTRAINTS, 4.0);
        expect(result.changedMembers).toHaveLength(0);
    });
  });

  describe('reasonCodes', () => {
      it('should include RSCA_BAND_ENFORCED', () => {
          const members = createMembers([3.0, 3.0]);
          const result = redistributeMTA(members, DEFAULT_CONSTRAINTS);
          expect(result.reasonCodes).toContain(RedistributionReasonCode.RSCA_BAND_ENFORCED);
      });

      it('should include ANCHOR_CONSTRAINT if anchors present', () => {
          const members = createMembers([4.0, 3.0], [{index: 0, value: 4.0}]);
          const result = redistributeMTA(members, DEFAULT_CONSTRAINTS);
          expect(result.reasonCodes).toContain(RedistributionReasonCode.ANCHOR_CONSTRAINT);
      });

      it('should include BOUNDS_CLAMPED if values hit bounds', () => {
          // Force values to hit 5.0
          const members = createMembers([4.0]);
          const constraints = { ...DEFAULT_CONSTRAINTS, controlBandLower: 5.0, controlBandUpper: 5.0 };
          const result = redistributeMTA(members, constraints);
          expect(result.reasonCodes).toContain(RedistributionReasonCode.BOUNDS_CLAMPED);
          expect(result.mtaVector[0]).toBe(5.0);
      });
  });

  describe('infeasibilityReport', () => {
      it('should generate report when infeasible', () => {
        // 3 members.
        // Anchor Rank 2 (index 1) = 5.0.
        // Rank 1 must be >= 5.0. So 5.0.
        // Rank 3 can be anything.
        // Min possible config: [5.0, 5.0, 2.0]. Mean = 4.0.
        // Target Band: [2.0, 3.0].
        // Impossible.

        const members = createMembers([5.0, 5.0, 2.0], [{index: 1, value: 5.0}]);
        const constraints: Constraints = {
            ...DEFAULT_CONSTRAINTS,
            controlBandLower: 2.0,
            controlBandUpper: 3.0
        };
        const result = redistributeMTA(members, constraints);
        expect(result.isFeasible).toBe(false);
        expect(result.infeasibilityReport).toBeDefined();
        expect(result.infeasibilityReport?.meanMin).toBeCloseTo(4.0, 1);
        expect(result.infeasibilityReport?.meanMax).toBeCloseTo(5.0, 1);

        // Sensitivity Check
        // We need to LOWER the mean.
        // Anchor at index 1 is 5.0. If we lower it, mean should drop.
        // So sensitivity (impactOnMin) should be positive.
        const sensitivity = result.infeasibilityReport?.anchorSensitivity.find(s => s.anchorIndex === 1);
        expect(sensitivity).toBeDefined();
        expect(sensitivity?.impactOnMin).toBeGreaterThan(0);

        // Suggested Adjustment
        // We need to reach 3.0 (or closer). Current min is 4.0. Gap is 1.0.
        // We have 3 members. Lowering one member by X lowers mean by X/3.
        // So impactOnMin should be approx 0.33.
        // To lower mean by 1.0, we need to lower anchor by 3.0.
        // So suggested value should be 5.0 - 3.0 = 2.0.
        const adjustment = result.infeasibilityReport?.minimalAdjustments.find(a => a.memberId === 'm-1');
        expect(adjustment).toBeDefined();
        expect(adjustment?.suggestedValue).toBeLessThan(5.0);
      });

      it('should suggest raising anchors if mean is too low', () => {
          // Anchor Rank 2 = 2.0.
          // Max config: [5.0, 2.0, 2.0]. Mean = 3.0.
          // Target Band: [4.0, 4.2].

          const members = createMembers([5.0, 2.0, 2.0], [{index: 1, value: 2.0}]);
          const constraints: Constraints = {
            ...DEFAULT_CONSTRAINTS,
            controlBandLower: 4.0,
            controlBandUpper: 4.2
          };
          const result = redistributeMTA(members, constraints);
          expect(result.isFeasible).toBe(false);
          expect(result.infeasibilityReport).toBeDefined();

          const adjustment = result.infeasibilityReport?.minimalAdjustments.find(a => a.memberId === 'm-1');
          expect(adjustment).toBeDefined();
          expect(adjustment?.suggestedValue).toBeGreaterThan(2.0);
      });
  });
});
