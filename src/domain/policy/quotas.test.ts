import { describe, it, expect } from 'vitest';
import { computeEpMax, computeMpMax, computeEpMpCombinedMax } from './quotas';
import { Paygrade, RankCategory, type SummaryGroupContext } from './types';

const mockContext = (paygrade: Paygrade, isLDO = false): SummaryGroupContext => ({
  size: 0,
  paygrade,
  rankCategory: RankCategory.OFFICER, // Default, not always used
  isLDO,
  isCWO: false
});

describe('Quota Calculations', () => {
  describe('computeEpMax', () => {
    it('returns 0 for group size 0', () => {
      expect(computeEpMax(0, mockContext(Paygrade.E5))).toBe(0);
    });

    it('returns 0 for non-LDO O1/O2', () => {
      expect(computeEpMax(10, mockContext(Paygrade.O1, false))).toBe(0);
      expect(computeEpMax(10, mockContext(Paygrade.O2, false))).toBe(0);
    });

    it('returns valid count for LDO O1/O2', () => {
      // Size 10, Table 1-2 says EP=2
      expect(computeEpMax(10, mockContext(Paygrade.O1, true))).toBe(2);
      expect(computeEpMax(10, mockContext(Paygrade.O2, true))).toBe(2);
    });

    it('handles group of 2 special case (returns 1)', () => {
      // Table says 1, special case says 1.
      expect(computeEpMax(2, mockContext(Paygrade.E5))).toBe(1);
    });

    it('returns correct values from Table 1-2 for N <= 30', () => {
      expect(computeEpMax(1, mockContext(Paygrade.E5))).toBe(1);
      expect(computeEpMax(5, mockContext(Paygrade.E5))).toBe(1);
      expect(computeEpMax(6, mockContext(Paygrade.E5))).toBe(2);
      expect(computeEpMax(20, mockContext(Paygrade.E5))).toBe(4);
      expect(computeEpMax(30, mockContext(Paygrade.E5))).toBe(6);
    });

    it('calculates 20% ceil for N > 30', () => {
      // 31 * 0.20 = 6.2 -> 7
      expect(computeEpMax(31, mockContext(Paygrade.E5))).toBe(7);
      // 100 * 0.20 = 20
      expect(computeEpMax(100, mockContext(Paygrade.E5))).toBe(20);
    });
  });

  describe('computeEpMpCombinedMax', () => {
    it('returns size for low MP columns (E1-E4, etc) -> "No Limit"', () => {
      expect(computeEpMpCombinedMax(40, mockContext(Paygrade.E4))).toBe(40);
      expect(computeEpMpCombinedMax(40, mockContext(Paygrade.W2))).toBe(40);
      expect(computeEpMpCombinedMax(40, mockContext(Paygrade.O2, true))).toBe(40);
    });

    it('returns 60% for E5-E6, O3', () => {
      // 40 * 0.60 = 24
      expect(computeEpMpCombinedMax(40, mockContext(Paygrade.E5))).toBe(24);
      expect(computeEpMpCombinedMax(40, mockContext(Paygrade.O3))).toBe(24);
    });

    it('returns 50% for E7-E9, W3-W5, O4', () => {
      // 40 * 0.50 = 20
      expect(computeEpMpCombinedMax(40, mockContext(Paygrade.E7))).toBe(20);
      expect(computeEpMpCombinedMax(40, mockContext(Paygrade.E8))).toBe(20);
      expect(computeEpMpCombinedMax(40, mockContext(Paygrade.E9))).toBe(20);
      expect(computeEpMpCombinedMax(40, mockContext(Paygrade.W3))).toBe(20);
      expect(computeEpMpCombinedMax(40, mockContext(Paygrade.O4))).toBe(20);
    });

    it('returns 40% for O5-O6', () => {
      // 40 * 0.40 = 16
      expect(computeEpMpCombinedMax(40, mockContext(Paygrade.O5))).toBe(16);
      expect(computeEpMpCombinedMax(40, mockContext(Paygrade.O6))).toBe(16);
    });

    it('returns 0 for non-LDO O1/O2 (No MP allowed)', () => {
      expect(computeEpMpCombinedMax(40, mockContext(Paygrade.O1))).toBe(0);
      expect(computeEpMpCombinedMax(40, mockContext(Paygrade.O2))).toBe(0);
    });
  });

  describe('computeMpMax', () => {
    describe('N <= 30 (Table 1-2)', () => {
      it('handles "No Limit" columns (E1-E4) with 60% combined cap', () => {
        // E1-E4 have "No Limit" in Table 1-2, but we now cap at 60% combined EP+MP
        // Size 10: combined limit = ceil(10 * 0.60) = 6
        // If EP used = 2, MP Max = 6 - 2 = 4
        expect(computeMpMax(10, mockContext(Paygrade.E4), 2)).toBe(4);
        // If EP used = 0, MP Max = 6 - 0 = 6
        expect(computeMpMax(10, mockContext(Paygrade.E4), 0)).toBe(6);
      });

      it('calculates base + unused EP rollover', () => {
        // Size 10, mid (E5)
        // Table: EP=2, MP=4. Combined = 6.
        // If EP used = 2, MP Max = 4 + 0 = 4.
        expect(computeMpMax(10, mockContext(Paygrade.E5), 2)).toBe(4);
        // If EP used = 0, MP Max = 4 + 2 = 6.
        expect(computeMpMax(10, mockContext(Paygrade.E5), 0)).toBe(6);
        // If EP used = 1, MP Max = 4 + 1 = 5.
        expect(computeMpMax(10, mockContext(Paygrade.E5), 1)).toBe(5);
      });

      it('handles Group of 2 special case', () => {
        // Size 2, EP Max 1. MP Max 1.
        expect(computeMpMax(2, mockContext(Paygrade.E5), 1)).toBe(1);
        expect(computeMpMax(2, mockContext(Paygrade.E5), 0)).toBe(2);
      });

      it('returns 0 for non-LDO O1/O2', () => {
        // Should be 0 regardless of size or EP used
        expect(computeMpMax(10, mockContext(Paygrade.O1), 0)).toBe(0);
        expect(computeMpMax(2, mockContext(Paygrade.O1), 0)).toBe(0);
      });
    });

    describe('N > 30', () => {
      it('uses formula epMpMax - epMax', () => {
        // E5 (60%). N=40.
        // epMpMax = 24.
        // If EP used = 8 (which is max 40*0.20), MP = 16.
        expect(computeMpMax(40, mockContext(Paygrade.E5), 8)).toBe(16);
        // If EP used = 0, MP = 24.
        expect(computeMpMax(40, mockContext(Paygrade.E5), 0)).toBe(24);
      });

      it('returns 0 for non-LDO O1/O2', () => {
        expect(computeMpMax(40, mockContext(Paygrade.O1), 0)).toBe(0);
      });
    });
  });
});
