import { describe, it, expect } from 'vitest';
import { redistributeMTA, boundedIsotonicRegressionWithAnchors, computeBaselineCurve, computeWeights } from './redistribution';
import { Member, Constraints } from './types';

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

describe('Redistribution Engine', () => {
  describe('boundedIsotonicRegressionWithAnchors', () => {
    it('should respect global bounds', () => {
      const inputs = [1.0, 6.0, 3.0];
      const weights = [1, 1, 1];
      const anchors = new Map();
      const bounds: [number, number] = [2.0, 5.0];

      const result = boundedIsotonicRegressionWithAnchors(inputs, weights, anchors, bounds);

      // Monotonic non-increasing: inputs sorted would be 6, 3, 1.
      // But PAVA on sequence [1, 6, 3].
      // Index 0 (1.0) must be >= Index 1 (6.0) >= Index 2 (3.0).
      // Violation: 1 < 6. Merge -> 3.5.
      // Sequence: 3.5, 3.5, 3.0.
      // 3.5 >= 3.0. OK.
      // Bounds: [2, 5].
      // 1.0 -> clipped to 2.0 (if isolated).
      // Result should be monotonic and bounded.

      // Let's trace manually:
      // PAVA on [1, 6, 3].
      // Block 1: val 1, w 1.
      // Block 2: val 6. 1 < 6 violation. Merge -> (1+6)/2 = 3.5.
      // Block 3: val 3. 3.5 >= 3. OK.
      // Result PAVA: [3.5, 3.5, 3.0].
      // Clip to [2, 5]: [3.5, 3.5, 3.0].
      expect(result).toEqual([3.5, 3.5, 3.0]);
    });

    it('should respect anchors', () => {
      // 5 members. Anchor at index 2 (middle) to 4.0.
      // Input: [5, 5, 5, 2, 2]
      // Rank 1..5.
      // Anchor at Rank 3 is 4.0.
      // So x[2] = 4.0.
      // x[0], x[1] must be >= 4.0.
      // x[3], x[4] must be <= 4.0.

      const inputs = [4.8, 4.8, 4.0, 2.0, 2.0]; // already good
      const weights = [1, 1, 1, 1, 1];
      const anchors = new Map([[2, 4.0]]);
      const bounds: [number, number] = [2.0, 5.0];

      const result = boundedIsotonicRegressionWithAnchors(inputs, weights, anchors, bounds);
      expect(result[2]).toBe(4.0);
      expect(result[0]).toBeGreaterThanOrEqual(4.0);
      expect(result[1]).toBeGreaterThanOrEqual(4.0);
      expect(result[3]).toBeLessThanOrEqual(4.0);
      expect(result[4]).toBeLessThanOrEqual(4.0);
    });

    it('should enforce monotonicity with anchors', () => {
        // Inputs: [3, 5, 4, 5, 2]
        // Anchor index 2 (val 4).
        // Segment 1 (indices 0, 1): constrained >= 4. Input [3, 5].
        //   PAVA on [3, 5]. 3 < 5 merge -> 4. Result [4, 4].
        //   Clip to [4, H]. Result [4, 4].
        // Segment 2 (indices 3, 4): constrained <= 4. Input [5, 2].
        //   PAVA on [5, 2]. 5 >= 2 ok. Result [5, 2].
        //   Clip to [L, 4]. 5->4, 2->2. Result [4, 2].
        // Full result: [4, 4, 4, 4, 2].

        const inputs = [3, 5, 4, 5, 2];
        const weights = [1, 1, 1, 1, 1];
        const anchors = new Map([[2, 4.0]]);
        const bounds: [number, number] = [2.0, 5.0];

        const result = boundedIsotonicRegressionWithAnchors(inputs, weights, anchors, bounds);
        expect(result).toEqual([4, 4, 4, 4, 2]);
    });
  });

  describe('redistributeMTA', () => {
    it('should redistribute to target mean', () => {
      // 4 members. Bounds 2.0 - 5.0. Band 3.8 - 4.2.
      // Start with [3.0, 3.0, 3.0, 3.0]. Mean 3.0.
      // Target mean 4.0.
      // Should shift up.
      const members = createMembers([3.0, 3.0, 3.0, 3.0]);
      const result = redistributeMTA(members, DEFAULT_CONSTRAINTS, 4.0);

      expect(result.isFeasible).toBe(true);
      expect(result.finalRSCA).toBeCloseTo(4.0, 3);
      expect(result.mtaVector[0]).toBeGreaterThanOrEqual(result.mtaVector[1]);
    });

    it('should detect infeasibility due to anchors', () => {
      // Anchor 1 (Rank 1) = 2.0
      // Anchor 2 (Rank 2) = 5.0
      // Violation.
      const members = createMembers([2.0, 5.0], [{index: 0, value: 2.0}, {index: 1, value: 5.0}]);
      const result = redistributeMTA(members, DEFAULT_CONSTRAINTS);
      expect(result.isFeasible).toBe(false);
      expect(result.explanation).toContain('Anchor inconsistency');
    });

    it('should detect infeasibility due to band and anchors', () => {
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
        expect(result.explanation).toContain('Infeasible');
    });

    it('should handle empty group', () => {
        const result = redistributeMTA([], DEFAULT_CONSTRAINTS);
        expect(result.isFeasible).toBe(true);
        expect(result.mtaVector).toHaveLength(0);
    });

    it('should maintain anchors exactly', () => {
        const members = createMembers([4.0, 3.5, 3.0, 2.5], [{index: 1, value: 3.5}]);
        // Shift required to hit 3.8 mean (4.0 is infeasible with these anchors and bounds).
        // Anchor at index 1 must remain 3.5.
        // Max possible mean is 3.875. 3.8 is feasible.
        const constraints = { ...DEFAULT_CONSTRAINTS, controlBandLower: 3.8, controlBandUpper: 3.8 };
        const result = redistributeMTA(members, constraints, 3.8);

        expect(result.mtaVector[1]).toBe(3.5);
        expect(result.isFeasible).toBe(true);
        expect(result.finalRSCA).toBeCloseTo(3.8, 3);
    });
  });

  describe('Performance', () => {
      it('should run efficiently for N=300', () => {
          const N = 300;
          const members = createMembers(new Array(N).fill(3.0));
          // Add some anchors
          members[0].isAnchor = true; members[0].anchorValue = 5.0;
          members[N-1].isAnchor = true; members[N-1].anchorValue = 2.0;
          members[150].isAnchor = true; members[150].anchorValue = 4.0;

          const start = performance.now();
          const result = redistributeMTA(members, DEFAULT_CONSTRAINTS);
          const end = performance.now();

          // Note: In a test runner environment, overhead can be significant.
          // The core requirement is < 16ms in a browser.
          // We set a slightly looser bound here to avoid flakiness in CI/Test env.
          expect(end - start).toBeLessThan(50);
          expect(result.isFeasible).toBe(true);
      });
  });
});
