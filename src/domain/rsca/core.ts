import { Member, Constraints } from './types';

/**
 * Computes the Reporting Senior Cumulative Average (RSCA) for a list of members.
 * RSCA is the arithmetic mean of the members' MTAs.
 */
export function computeRSCA(members: Member[]): number {
  if (members.length === 0) return 0;
  const sum = members.reduce((acc, m) => acc + m.mta, 0);
  return sum / members.length;
}

/**
 * Validates that the members' MTAs follow a monotonic non-increasing order based on rank.
 * Assumes members are sorted by rankOrder (1..N).
 * Returns true if valid, false otherwise.
 */
export function validateMonotonicity(members: Member[]): boolean {
  for (let i = 0; i < members.length - 1; i++) {
    // strict rank order 1..N. Lower rank number means higher standing.
    // So mta[i] should be >= mta[i+1]
    if (members[i].mta < members[i+1].mta) {
      return false;
    }
  }
  return true;
}

/**
 * Validates if MTAs are within the hard bounds L/H.
 */
export function validateBounds(members: Member[], constraints: Constraints): boolean {
    return members.every(m => m.mta >= constraints.mtaLower && m.mta <= constraints.mtaUpper);
}

/**
 * Computes the theoretical min and max RSCA possible for a group given simple constraints,
 * ignoring anchors and monotonicity for a moment (naive range), or we could do something smarter.
 *
 * However, the prompt 2 asks for a sophisticated feasible range detection.
 * For Prompt 1's "compute feasible ranges", I will provide a simple calculation
 * based on the bounds, which serves as a loose check.
 */
export function computeNaiveFeasibleRange(count: number, constraints: Constraints): { min: number, max: number } {
    return {
        min: constraints.mtaLower,
        max: constraints.mtaUpper
    };
}
