import { describe, it, expect } from 'vitest';
import { redistributeMTA } from './redistribution';
import type { Member, Constraints, AlgorithmParams } from './types';
import { RedistributionReasonCode } from './types';

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
  maxIterations: 50,
  tolerance: 0.001
};

const DEFAULT_PARAMS: AlgorithmParams = {
  alpha: 0.1,
  tau: 0.05,
  delta: 0.1,
  p: 1.0
};

describe('Redistribution Engine Enhanced', () => {
  describe('changedMembers', () => {
    it('should report changed members', () => {
      const members = createMembers([3.0, 3.0, 3.0]);
      // Target 4.0 (average of band). All should change.
      const result = redistributeMTA(members, DEFAULT_CONSTRAINTS, DEFAULT_PARAMS);
      expect(result.changedMembers).toHaveLength(3);
      expect(result.changedMembers![0].delta).toBeGreaterThan(0);
      expect(result.changedMembers![0].id).toBe('m-0');
    });

    it('should not include unchanged members', () => {
      const members = createMembers([4.0, 4.0, 4.0]);
      // Target 4.0. No change needed.
      const result = redistributeMTA(members, DEFAULT_CONSTRAINTS, DEFAULT_PARAMS);
      expect(result.changedMembers).toHaveLength(0);
    });
  });

  describe('reasonCodes', () => {
    it('should include RSCA_TARGETED', () => {
      const members = createMembers([3.0, 3.0]);
      const result = redistributeMTA(members, DEFAULT_CONSTRAINTS, DEFAULT_PARAMS);
      expect(result.reasonCodes).toContain(RedistributionReasonCode.RSCA_TARGETED);
    });

    it('should include ANCHOR_CONSTRAINT if anchors present', () => {
      const members = createMembers([4.0, 3.0], [{ index: 0, value: 4.0 }]);
      const result = redistributeMTA(members, DEFAULT_CONSTRAINTS, DEFAULT_PARAMS);
      expect(result.reasonCodes).toContain(RedistributionReasonCode.ANCHOR_CONSTRAINT);
    });

    it('should include BOUNDS_ENFORCED if values hit bounds', () => {
      // Force values to hit 5.0
      const members = createMembers([4.0]);
      const constraints = { ...DEFAULT_CONSTRAINTS, controlBandLower: 5.0, controlBandUpper: 5.0 };
      const result = redistributeMTA(members, constraints, DEFAULT_PARAMS);
      expect(result.reasonCodes).toContain(RedistributionReasonCode.BOUNDS_ENFORCED);
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

      const members = createMembers([5.0, 5.0, 2.0], [{ index: 1, value: 5.0 }]);
      const constraints: Constraints = {
        ...DEFAULT_CONSTRAINTS,
        controlBandLower: 2.0,
        controlBandUpper: 3.0
      };
      const result = redistributeMTA(members, constraints, DEFAULT_PARAMS);
      expect(result.isFeasible).toBe(false);
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.meanMin).toBeCloseTo(4.0, 1);
      expect(result.diagnostics?.meanMax).toBeCloseTo(5.0, 1);

      // Suggested Adjustment (Checking diagnostics suggestions instead of full report)
      const suggestions = result.diagnostics?.suggestedAnchorEdits;
      expect(suggestions).toBeDefined();
      const adjustment = suggestions?.find(a => a.id === 'm-1');
      expect(adjustment).toBeDefined();
      // We need to lower mean, so suggestion should be < 5.0?
      // Logic says "Lower anchor".
      // Current anchor 5.0. Suggested should be lower.
      // Implementation suggests a - 0.05.
      expect(adjustment?.suggestedMta).toBeLessThan(5.0);
    });

    it('should suggest raising anchors if mean is too low', () => {
      // Anchor Rank 2 = 2.0.
      // Max config: [5.0, 2.0, 2.0]. Mean = 3.0.
      // Target Band: [4.0, 4.2].

      const members = createMembers([5.0, 2.0, 2.0], [{ index: 1, value: 2.0 }]);
      const constraints: Constraints = {
        ...DEFAULT_CONSTRAINTS,
        controlBandLower: 4.0,
        controlBandUpper: 4.2
      };
      const result = redistributeMTA(members, constraints, DEFAULT_PARAMS);
      expect(result.isFeasible).toBe(false);
      expect(result.diagnostics).toBeDefined();

      const suggestions = result.diagnostics?.suggestedAnchorEdits;
      expect(suggestions).toBeDefined();
      const adjustment = suggestions?.find(a => a.id === 'm-1');
      expect(adjustment).toBeDefined();
      expect(adjustment?.suggestedMta).toBeGreaterThan(2.0);
    });
  });
});
