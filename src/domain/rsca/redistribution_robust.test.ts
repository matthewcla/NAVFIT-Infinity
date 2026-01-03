import { describe, it, expect } from 'vitest';
import { redistributeMTA } from './redistribution';
import type { Member, Constraints } from './types';
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
};

describe('Redistribution Engine Robustness', () => {

  describe('Property-style Tests', () => {
    const NUM_ITERATIONS = 50;
    const MAX_N = 50;

    it('should always satisfy monotonicity, bounds, and anchor constraints for random valid inputs', () => {
      for (let iter = 0; iter < NUM_ITERATIONS; iter++) {
        // Random N between 2 and MAX_N
        const n = Math.floor(Math.random() * (MAX_N - 2)) + 2;

        // Random bounds (valid ones)
        const L = 2.0;
        const H = 5.0;

        // Random initial MTAs
        const mtas = Array.from({ length: n }, () => L + Math.random() * (H - L));
        // Sort descending to give a reasonable starting point, though not strictly required
        mtas.sort((a, b) => b - a);

        // Randomly assign anchors
        const anchors: { index: number; value: number }[] = [];
        const numAnchors = Math.floor(Math.random() * (n / 3)); // up to ~1/3 anchors

        // Pick unique indices
        const indices = Array.from({ length: n }, (_, i) => i);
        for (let k = 0; k < numAnchors; k++) {
            if (indices.length === 0) break;
            const idxPos = Math.floor(Math.random() * indices.length);
            const idx = indices.splice(idxPos, 1)[0];

            // Assign a random valid value for the anchor
            // To ensure initial feasibility of anchors w.r.t each other is possible (though not guaranteed globally with band),
            // we will check consistency later. But for this test let's try to generate consistent anchors.
            // Actually, let's just assign random values and if redistributeMTA returns infeasible due to anchor inconsistency, skip or expect it.
            // But here we want to test *when feasible*, constraints hold.
            // So let's pick anchor values from the sorted mtas to ensure they are at least monotonic relative to each other if we picked them from a monotonic sequence.

            anchors.push({ index: idx, value: mtas[idx] });
        }

        // Sort anchors by index
        anchors.sort((a, b) => a.index - b.index);

        // Verify anchor monotonicity (since we picked from sorted MTAs, should be fine)
        let anchorsConsistent = true;
        for(let k=0; k<anchors.length-1; k++) {
            if(anchors[k].value < anchors[k+1].value) anchorsConsistent = false;
        }

        if (!anchorsConsistent) continue; // Skip bad random generation

        const members = createMembers(mtas, anchors);

        // Run redistribution
        const result = redistributeMTA(members, DEFAULT_CONSTRAINTS);

        if (result.isFeasible) {
             const resVec = result.mtaVector;

             // 1. Monotonicity
             for (let i = 0; i < n - 1; i++) {
                 expect(resVec[i]).toBeGreaterThanOrEqual(resVec[i+1] - 1e-9);
             }

             // 2. Bounds
             for (let i = 0; i < n; i++) {
                 expect(resVec[i]).toBeGreaterThanOrEqual(L - 1e-9);
                 expect(resVec[i]).toBeLessThanOrEqual(H + 1e-9);
             }

             // 3. Anchors
             anchors.forEach(a => {
                 expect(resVec[a.index]).toBeCloseTo(a.value, 5);
             });

             // 4. Band (if feasible)
             // The result mean should be within the band OR closer to it than start?
             // Actually if feasible, it MUST be within band (or very close if target was edge).
             // However, redistributeMTA logic: if effectiveMin > effectiveMax => Infeasible.
             // If feasible, finalMean should be close to target (which is inside band).
             expect(result.finalRSCA).toBeGreaterThanOrEqual(DEFAULT_CONSTRAINTS.controlBandLower - 1e-3);
             expect(result.finalRSCA).toBeLessThanOrEqual(DEFAULT_CONSTRAINTS.controlBandUpper + 1e-3);

        } else {
            // If infeasible, ensure reason is valid
            expect(result.explanation).toBeDefined();
        }
      }
    });
  });

  describe('Regression Tests', () => {

    it('should handle small N (N=2..9)', () => {
        for (let n = 2; n < 10; n++) {
            const mtas = Array(n).fill(3.0);
            const members = createMembers(mtas);
            // Target 4.0
            const result = redistributeMTA(members, DEFAULT_CONSTRAINTS, 4.0);
            expect(result.isFeasible).toBe(true);
            expect(result.finalRSCA).toBeCloseTo(4.0, 3);
            expect(result.mtaVector).toHaveLength(n);
        }
    });

    it('should handle many anchors', () => {
        // N=10, 8 anchors
        const n = 10;
        const mtas = Array(n).fill(3.0);
        const anchors: { index: number; value: number }[] = [];
        // Anchors at 0, 1, 3, 4, 5, 7, 8, 9
        // Values descending
        const anchorIndices = [0, 1, 3, 4, 5, 7, 8, 9];
        anchorIndices.forEach(idx => {
            anchors.push({ index: idx, value: 4.5 - idx * 0.1 });
        });

        const members = createMembers(mtas, anchors);
        const result = redistributeMTA(members, DEFAULT_CONSTRAINTS);

        // It might be feasible or not depending on band.
        // Mean of anchors is approx 4.5 - 4.5 * 0.1 ~ 4.05.
        // Band 3.8-4.2. Should be feasible.
        if (result.isFeasible) {
             result.mtaVector.forEach((v, i) => {
                 const anchor = anchors.find(a => a.index === i);
                 if (anchor) {
                     expect(v).toBeCloseTo(anchor.value, 5);
                 }
             });
             // Check monotonicity for non-anchors too
             for (let i = 0; i < n - 1; i++) {
                 expect(result.mtaVector[i]).toBeGreaterThanOrEqual(result.mtaVector[i+1]);
             }
        }
    });

    it('should handle anchors forcing infeasibility', () => {
        // Anchors forcing mean > 4.2
        // N=5. Anchors all 5.0.
        const n = 5;
        const mtas = Array(n).fill(5.0);
        const anchors = Array.from({length: n}, (_, i) => ({ index: i, value: 5.0 }));

        const members = createMembers(mtas, anchors);
        const result = redistributeMTA(members, DEFAULT_CONSTRAINTS);

        expect(result.isFeasible).toBe(false);
        expect(result.infeasibilityReport).toBeDefined();
        // Min mean should be 5.0
        expect(result.infeasibilityReport?.meanMin).toBeCloseTo(5.0);
    });

    it('should handle tight bounds', () => {
        // Bounds [3.9, 4.0], Band [3.9, 4.0]
        const constraints: Constraints = {
            mtaLowerBound: 3.9,
            mtaUpperBound: 4.0,
            controlBandLower: 3.9,
            controlBandUpper: 4.0
        };
        const members = createMembers([4.0, 3.9, 4.0]); // mixed
        const result = redistributeMTA(members, constraints);

        expect(result.isFeasible).toBe(true);
        result.mtaVector.forEach(v => {
            expect(v).toBeGreaterThanOrEqual(3.9);
            expect(v).toBeLessThanOrEqual(4.0);
        });
    });

    it('should handle equal anchors causing flat segments', () => {
        // N=5. Anchor 1 (idx 1) = 4.0. Anchor 3 (idx 3) = 4.0.
        // This forces index 2 to be 4.0 (monotonicity 4.0 >= x >= 4.0).
        const members = createMembers([4.0, 4.0, 3.0, 4.0, 3.0], [
            { index: 1, value: 4.0 },
            { index: 3, value: 4.0 }
        ]);

        const result = redistributeMTA(members, DEFAULT_CONSTRAINTS);

        expect(result.isFeasible).toBe(true);
        expect(result.mtaVector[1]).toBe(4.0);
        expect(result.mtaVector[2]).toBe(4.0);
        expect(result.mtaVector[3]).toBe(4.0);
    });
  });
});
