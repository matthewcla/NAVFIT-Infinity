import { Member, Constraints } from './types';

/**
 * Computes the Reporting Senior Cumulative Average (RSCA) for a group of members.
 * RSCA is the arithmetic mean of the Member Trait Averages (MTA).
 */
export function computeRSCA(members: Member[]): number {
  if (members.length === 0) return 0;
  const sum = members.reduce((acc, member) => acc + member.mta, 0);
  return sum / members.length;
}

/**
 * Validates that the MTAs are monotonic with respect to rank.
 * Rank 1 is the highest rank and should have the highest MTA.
 * Returns true if mta[rank i] >= mta[rank i+1] for all i.
 */
export function validateMonotonicity(members: Member[]): boolean {
  if (members.length <= 1) return true;

  // Sort by rank to ensure we check in order
  const sortedMembers = [...members].sort((a, b) => a.rank - b.rank);

  for (let i = 0; i < sortedMembers.length - 1; i++) {
    // If a higher ranked member (lower index) has a lower MTA than the next, it's invalid.
    if (sortedMembers[i].mta < sortedMembers[i + 1].mta) {
      return false;
    }
  }
  return true;
}

/**
 * Computes the feasible MTA range for each member, constrained by:
 * 1. Hard bounds (mtaLowerBound, mtaUpperBound).
 * 2. Strict rank order (Member at Rank i must be <= Member at Rank i-1 and >= Member at Rank i+1).
 * 3. Anchor status (if anchored, min=max=anchorValue).
 *
 * The range is calculated based on the *current* values of the immediate neighbors.
 */
export function computeFeasibleRanges(
  members: Member[],
  constraints: Constraints
): Record<string, { min: number; max: number }> {
  const sortedMembers = [...members].sort((a, b) => a.rank - b.rank);
  const ranges: Record<string, { min: number; max: number }> = {};

  sortedMembers.forEach((member, index) => {
    if (member.isAnchor && member.anchorValue !== undefined) {
      ranges[member.id] = { min: member.anchorValue, max: member.anchorValue };
      return;
    }

    // Determine upper bound (Maximum possible value)
    // Bounded by global upper bound AND the member ranked immediately above
    let maxVal = constraints.mtaUpperBound;
    if (index > 0) {
      // Must be <= the person ranked above
      // We take the minimum of the global bound and the neighbor's value
      maxVal = Math.min(maxVal, sortedMembers[index - 1].mta);
    }

    // Determine lower bound (Minimum possible value)
    // Bounded by global lower bound AND the member ranked immediately below
    let minVal = constraints.mtaLowerBound;
    if (index < sortedMembers.length - 1) {
      // Must be >= the person ranked below
      // We take the maximum of the global bound and the neighbor's value
      minVal = Math.max(minVal, sortedMembers[index + 1].mta);
    }

    ranges[member.id] = { min: minVal, max: maxVal };
  });

  return ranges;
}
