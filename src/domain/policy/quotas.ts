import { Paygrade, SummaryGroupContext } from './types';
import { TABLE_1_2 } from './table1_2';

/**
 * Determines which MP column in Table 1-2 applies to the given paygrade.
 * Returns 'low', 'mid', 'high', 'top', or null if MP is not applicable (e.g. non-LDO O1/O2).
 */
function getMpColumnKey(paygrade: Paygrade, isLDO: boolean): 'low' | 'mid' | 'high' | 'top' | null {
  // E1–E4, W1–W2, LDO O1–O2 -> 'low'
  if (['E1', 'E2', 'E3', 'E4'].includes(paygrade) || ['W1', 'W2'].includes(paygrade)) {
    return 'low';
  }
  if (isLDO && (paygrade === Paygrade.O1 || paygrade === Paygrade.O2)) {
    return 'low';
  }

  // Non-LDO O1/O2 -> Not in MP columns.
  if (paygrade === Paygrade.O1 || paygrade === Paygrade.O2) {
      return null;
  }

  // E5–E6, O3 -> 'mid'
  if (['E5', 'E6', 'O3'].includes(paygrade)) {
    return 'mid';
  }

  // E7–E9, W3–W5, O4 -> 'high'
  if (['E7', 'E8', 'E9', 'O4'].includes(paygrade) || ['W3', 'W4', 'W5'].includes(paygrade)) {
    return 'high';
  }

  // O5–O6 -> 'top'
  if (['O5', 'O6'].includes(paygrade)) {
    return 'top';
  }

  // Fallback for unexpected paygrades (e.g. O7+)
  // Safest default is to assume they might follow top officer rules or have no quota (handled elsewhere).
  // For safety in this table context, let's return 'top' if it's an Officer O7+, else null?
  // But usually O7+ don't use this table.
  // Returning 'top' was the issue in review.
  // If undefined paygrade, let's return null to be safe (0 MP).
  return null;
}

/**
 * Computes the maximum Early Promote (EP) recommendations allowed.
 */
export function computeEpMax(groupSize: number, context: SummaryGroupContext): number {
  if (groupSize <= 0) return 0;

  // Exception: Non-LDO O1/O2 (EP disallowed)
  const isO1O2 = context.paygrade === Paygrade.O1 || context.paygrade === Paygrade.O2;
  if (isO1O2 && !context.isLDO) {
    return 0;
  }

  // Special case: Group of 2 allows 1 EP.
  if (groupSize === 2) {
      return 1;
  }

  if (groupSize <= 30) {
    const row = TABLE_1_2.rows.find(r => r.size === groupSize);
    return row ? row.ep : 0;
  }

  // N > 30
  // epMax = ceil(N * 0.20)
  return Math.ceil(groupSize * 0.20);
}

/**
 * Computes the combined EP + MP maximum limit.
 * Used primarily for large groups (N > 30).
 */
export function computeEpMpCombinedMax(groupSize: number, context: SummaryGroupContext): number {
  if (groupSize <= 0) return 0;

  const mpKey = getMpColumnKey(context.paygrade, context.isLDO);

  if (mpKey === null) {
      // If MP is not allowed (e.g. non-LDO O1/O2), combined is just EP max?
      // But for non-LDO O1/O2, EP is also 0. So combined is 0.
      // Wait, is Promotable limited? The prompt Table 1-2 has a Promotable column limit for O1-O2.
      // But this function is "computeEpMpCombinedMax". It implies EP+MP.
      // If EP=0, MP=0, then Combined=0.
      return 0;
  }

  if (mpKey === 'low') {
      // No Limit for MP.
      return groupSize;
  }

  let combinedPct = 0.60;
  if (mpKey === 'top') {
      // O5-O6
      combinedPct = 0.50;
  }

  return Math.ceil(groupSize * combinedPct);
}

/**
 * Computes the maximum Must Promote (MP) recommendations allowed.
 */
export function computeMpMax(groupSize: number, context: SummaryGroupContext, epUsed: number): number {
  if (groupSize <= 0) return 0;

  epUsed = Math.min(epUsed, groupSize);

  const mpKey = getMpColumnKey(context.paygrade, context.isLDO);

  // If paygrade is not in MP columns (e.g. non-LDO O1/O2), MP Max is 0.
  if (mpKey === null) {
      return 0;
  }

  if (groupSize <= 30) {
    const row = TABLE_1_2.rows.find(r => r.size === groupSize);
    if (!row) return 0;

    const baseMp = row.mp_groups[mpKey];

    // "No Limit" case
    if (baseMp === null) {
        return groupSize - epUsed;
    }

    // Special case: Group of 2.
    // Table says MP=1 for most categories.
    // "All summary groups of two may receive one Early Promote and one Must Promote."
    // For size 2: EP limit 1. If EP used 0, unused is 1. MP limit = 1 + 1 = 2.

    // Standard calculation for N<=30 (including size 2 logic via table values):
    const epMax = computeEpMax(groupSize, context);
    const unusedEp = Math.max(0, epMax - epUsed);

    return baseMp + unusedEp;
  }

  // N > 30
  const epMpMax = computeEpMpCombinedMax(groupSize, context);
  const epMaxForCalc = Math.ceil(groupSize * 0.20);

  return epMpMax - epMaxForCalc;
}
