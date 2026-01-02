import { describe, it, expect } from 'vitest';
import { redistributeMTA, boundedIsotonicRegressionWithAnchors, computeFeasibleMeanRange } from './redistribution';
import { computeRSCA, validateMonotonicity } from './core';
import { Member, Constraints, AnchorSet } from './types';

// Helper to create members
const createMembers = (count: number, startMta: number = 4.0): Member[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `m-${i + 1}`,
    rankOrder: i + 1,
    mta: startMta,
    isAnchor: false,
    name: `Member ${i + 1}`
  }));
};

describe('RSCA Core Logic', () => {
  it('computes RSCA correctly', () => {
    const members = createMembers(3);
    members[0].mta = 4.0;
    members[1].mta = 3.5;
    members[2].mta = 3.0;
    expect(computeRSCA(members)).toBeCloseTo(3.5);
  });

  it('validates monotonicity', () => {
    const members = createMembers(3);
    members[0].mta = 4.0;
    members[1].mta = 3.9;
    members[2].mta = 3.8;
    expect(validateMonotonicity(members)).toBe(true);

    members[1].mta = 4.1; // Violation: rank 2 has higher score than rank 1
    expect(validateMonotonicity(members)).toBe(false);
  });
});

describe('Redistribution Engine', () => {
  const constraints: Constraints = {
    mtaLower: 2.0,
    mtaUpper: 5.0,
    rscaMin: 3.8,
    rscaMax: 4.2
  };

  it('performs basic PAVA (decreasing)', () => {
    // Test helper directly
    // Values: [3, 4, 2, 5] -> Monotone decreasing should be roughly [4, 4, 3.5, 2.5] wait.
    // Monotone decreasing means x0 >= x1 >= x2 >= x3.
    // If input is [3, 4, 2, 5]
    // 3 < 4 (violation) -> pool -> [3.5, 3.5, 2, 5]
    // 3.5 >= 2 (ok)
    // 2 < 5 (violation) -> pool 2,5 -> [3.5, 3.5, 3.5, 3.5]?
    // Let's trace.
    // [3, 4, 2, 5]
    // 1. Process 4: 4 > 3? No, we want decreasing.
    // Decreasing means previous value must be >= current.
    // input[0]=3. input[1]=4. 3 < 4. Violation.
    // Pool (0,1) -> 3.5, 3.5.
    // input[2]=2. 3.5 >= 2. Ok.
    // input[3]=5. 2 < 5. Violation.
    // Pool (2,3) -> 3.5.
    // Now we have blocks [3.5 (len 2)], [3.5 (len 2)].
    // 3.5 >= 3.5. Ok.
    // Result: [3.5, 3.5, 3.5, 3.5].

    // Let's try [5, 4, 6, 2]
    // 5 >= 4. Ok.
    // 4 < 6. Violation. Pool (1,2) -> 5.
    // Blocks: [5 (1)], [5 (2)]. 5 >= 5. Ok.
    // 5 >= 2. Ok.
    // Result: [5, 5, 5, 2].

    // Test with function
    const anchors = new Map<number, number>();
    const res = boundedIsotonicRegressionWithAnchors([5, 4, 6, 2], anchors, 0, 10);
    expect(res).toEqual([5, 5, 5, 2]);
  });

  it('respects anchors in PAVA', () => {
    // [5, 4, 6, 2]. Anchor index 1 to 3.0.
    // x1 is fixed to 3.0.
    // Segments:
    // 0: [0, 1). Bound: [3.0, 10]. Val: 5. Result: 5.
    // 1: Anchor 3.0.
    // 2: [2, 4). Bound: [0, 3.0]. Vals: 6, 2.
    // PAVA on [6, 2] -> [6, 2] is monotone.
    // Clamp [6, 2] to [0, 3.0] -> [3.0, 2].
    // Result: [5, 3.0, 3.0, 2].

    const anchors = new Map<number, number>();
    anchors.set(1, 3.0);
    const res = boundedIsotonicRegressionWithAnchors([5, 4, 6, 2], anchors, 0, 10);
    expect(res).toEqual([5, 3.0, 3.0, 2]);
  });

  it('redistributes to meet RSCA target', () => {
    const members = createMembers(5, 3.0); // Mean 3.0
    // Target 4.0
    const result = redistributeMTA({
      members,
      anchors: {},
      constraints: { ...constraints, rscaMin: 4.0, rscaMax: 4.0 }
    });

    expect(result.status).toBe('FEASIBLE');
    expect(result.finalRSCA).toBeCloseTo(4.0);
    expect(validateMonotonicity(result.members)).toBe(true);
    // Should be all 4.0
    expect(result.members.every(m => Math.abs(m.mta - 4.0) < 0.01)).toBe(true);
  });

  it('detects infeasibility due to bounds', () => {
    const members = createMembers(5, 3.0);
    // Target 6.0 (impossible, max is 5.0)
    const result = redistributeMTA({
      members,
      anchors: {},
      constraints: { ...constraints, rscaMin: 6.0, rscaMax: 6.5 }
    });

    expect(result.status).toBe('INFEASIBLE_BOUNDS');
  });

  it('respects fixed anchors during redistribution', () => {
    const members = createMembers(5, 3.0);
    const anchors: AnchorSet = { [members[2].id]: 4.0 }; // Rank 3 fixed at 4.0

    // We want mean 3.5.
    // Rank 3 is 4.0.
    // Rank 1, 2 must be >= 4.0.
    // Rank 4, 5 must be <= 4.0.

    const result = redistributeMTA({
      members,
      anchors,
      constraints: { ...constraints, rscaMin: 3.5, rscaMax: 3.5 }
    });

    expect(result.status).toBe('FEASIBLE');
    expect(result.members[2].mta).toBe(4.0); // Anchor preserved
    expect(result.members[0].mta).toBeGreaterThanOrEqual(result.members[1].mta);
    expect(result.members[1].mta).toBeGreaterThanOrEqual(4.0);
    expect(4.0).toBeGreaterThanOrEqual(result.members[3].mta);
  });

  it('performance check (N=300)', () => {
    const N = 300;
    const members = createMembers(N, 3.0);
    const start = performance.now();

    redistributeMTA({
      members,
      anchors: {},
      constraints
    });

    const end = performance.now();
    const duration = end - start;
    // console.log(`Duration for N=${N}: ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(50); // Generous buffer for test environment overhead
  });
});
