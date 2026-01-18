import { Paygrade, type SummaryGroupContext } from './types';
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
 * Used primarily for large groups (N > 30) but logic applies generally for % limits.
 */
export function computeEpMpCombinedMax(groupSize: number, context: SummaryGroupContext): number {
  if (groupSize <= 0) return 0;

  const mpKey = getMpColumnKey(context.paygrade, context.isLDO);

  if (mpKey === null) {
    return 0;
  }

  if (mpKey === 'low') {
    // No Limit for MP.
    return groupSize;
  }

  let combinedPct = 0.60; // Default for 'mid' (E5-E6, O3)

  if (mpKey === 'high') {
    // E7-E9, W3-W5, O4 -> 50%
    combinedPct = 0.50;
  } else if (mpKey === 'top') {
    // O5-O6 -> 40%
    combinedPct = 0.40;
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

    // "No Limit" case for E1-E4, W1-W2, LDO O1-O2
    // Although Table 1-2 says "No Limit", we still apply the combined EP+MP 60% limit
    // to ensure some members receive P recommendations (BUPERS requirement).
    // Without this cap, all non-EP members would get MP, leaving zero P's.
    if (baseMp === null) {
      const combinedLimit = Math.ceil(groupSize * 0.60);
      return Math.max(0, combinedLimit - epUsed);
    }

    // Standard calculation for N<=30 (including size 2 logic via table values):
    // Table 1-2 Note: "MP limits may be increased by one for each unused EP allocation."
    const epMax = computeEpMax(groupSize, context);
    const unusedEp = Math.max(0, epMax - epUsed);

    return baseMp + unusedEp;
  }

  // N > 30
  const epMpMax = computeEpMpCombinedMax(groupSize, context);

  // Note: The variable epMaxForCalc was removed because it was unused in this scope
  // If the policy requires MP = Combined - EP_Max (static), we would use it.
  // But we are using the dynamic MP = Combined - EP_Used rule.

  return Math.max(0, epMpMax - epUsed);
}
