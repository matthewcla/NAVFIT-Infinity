import { describe, it, expect } from 'vitest';
import { computeRSCA, validateMonotonicity, computeFeasibleRanges } from './functions';
import type { Member, Constraints } from './types';
import { DEFAULT_CONSTRAINTS } from './constants';

describe('RSCA Domain Functions', () => {
  const constraints: Constraints = DEFAULT_CONSTRAINTS;

  const member1: Member = { id: '1', rank: 1, mta: 4.5, isAnchor: false };
  const member2: Member = { id: '2', rank: 2, mta: 4.0, isAnchor: false };
  const member3: Member = { id: '3', rank: 3, mta: 3.5, isAnchor: false };

  describe('computeRSCA', () => {
    it('should compute the correct mean', () => {
      const members = [member1, member2, member3];
      const rsca = computeRSCA(members);
      expect(rsca).toBeCloseTo(4.0, 2);
    });

    it('should return 0 for empty list', () => {
      expect(computeRSCA([])).toBe(0);
    });
  });

  describe('validateMonotonicity', () => {
    it('should return true for strictly monotonic decreasing MTAs', () => {
      const members = [member1, member2, member3];
      expect(validateMonotonicity(members)).toBe(true);
    });

    it('should return true for equal adjacent MTAs', () => {
      const members = [
        { ...member1, mta: 4.0 },
        { ...member2, mta: 4.0 },
      ];
      expect(validateMonotonicity(members)).toBe(true);
    });

    it('should return false if a lower ranked member has higher MTA', () => {
      const members = [
        { ...member1, mta: 3.0 },
        { ...member2, mta: 4.0 }, // Rank 2 has higher MTA than Rank 1
      ];
      expect(validateMonotonicity(members)).toBe(false);
    });

    it('should handle unsorted input', () => {
      const members = [member2, member1]; // Rank 2 then Rank 1
      // Sorted: Rank 1 (4.5), Rank 2 (4.0) -> Monotonic
      expect(validateMonotonicity(members)).toBe(true);
    });
  });

  describe('computeFeasibleRanges', () => {
    it('should compute ranges based on neighbors', () => {
      const members = [member1, member2, member3];
      // Rank 1 (4.5): Max=5.0 (Global), Min=4.0 (Rank 2)
      // Rank 2 (4.0): Max=4.5 (Rank 1), Min=3.5 (Rank 3)
      // Rank 3 (3.5): Max=4.0 (Rank 2), Min=2.0 (Global)

      const ranges = computeFeasibleRanges(members, constraints);

      expect(ranges['1']).toEqual({ min: 4.0, max: 5.0 });
      expect(ranges['2']).toEqual({ min: 3.5, max: 4.5 });
      expect(ranges['3']).toEqual({ min: 2.0, max: 4.0 });
    });

    it('should respect anchors', () => {
      const anchoredMember2 = { ...member2, isAnchor: true, anchorValue: 4.0 };
      const members = [member1, anchoredMember2, member3];

      const ranges = computeFeasibleRanges(members, constraints);

      expect(ranges['2']).toEqual({ min: 4.0, max: 4.0 });
      // Rank 1 should be min 4.0 (anchored neighbor)
      expect(ranges['1']).toEqual({ min: 4.0, max: 5.0 });
      // Rank 3 should be max 4.0 (anchored neighbor)
      expect(ranges['3']).toEqual({ min: 2.0, max: 4.0 });
    });

    it('should handle boundary cases', () => {
      // Only one member
      const single = [member1];
      const ranges = computeFeasibleRanges(single, constraints);
      expect(ranges['1']).toEqual({ min: 2.0, max: 5.0 });
    });
  });
});
