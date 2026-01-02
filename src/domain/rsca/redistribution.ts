import { Member, Constraints, AnchorSet, RedistributionParams, RedistributionResult, FeasibilityStatus } from './types';
import { computeRSCA, validateMonotonicity, validateBounds } from './core';

// --- Helpers ---

/**
 * Standard Pool Adjacent Violators Algorithm (PAVA) for monotonically DECREASING sequence.
 * In-place modification of values array.
 * Complexity: O(N)
 */
function pavaDecreasing(values: number[]): void {
  const n = values.length;
  if (n <= 1) return;

  // Implementation of PAVA for Decreasing:
  // Convert to increasing problem: negate values, solve increasing, negate back.
  // Increasing PAVA: v[i] <= v[i+1]. If v[i] > v[i+1], merge.

  const negValues = values.map(v => -v);

  const stackVal: number[] = [];
  const stackWeight: number[] = [];

  for (let i = 0; i < n; i++) {
    let val = negValues[i];
    let w = 1;

    while (stackVal.length > 0 && stackVal[stackVal.length - 1] > val) {
      const prevVal = stackVal.pop()!;
      const prevW = stackWeight.pop()!;
      val = (prevVal * prevW + val * w) / (prevW + w);
      w += prevW;
    }
    stackVal.push(val);
    stackWeight.push(w);
  }

  // Expand back
  let k = n - 1;
  for (let i = stackVal.length - 1; i >= 0; i--) {
    const val = -stackVal[i]; // negate back
    const w = stackWeight[i];
    for (let j = 0; j < w; j++) {
      values[k--] = val;
    }
  }
}

/**
 * Clamps value between min and max.
 */
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// --- Exported Functions ---

export function computeBaselineCurve(count: number, constraints: Constraints): number[] {
  // Simple linear distribution from Upper to Lower
  if (count === 0) return [];
  if (count === 1) return [(constraints.mtaUpper + constraints.mtaLower) / 2];

  const result: number[] = [];
  const step = (constraints.mtaUpper - constraints.mtaLower) / (count - 1);
  for (let i = 0; i < count; i++) {
    result.push(constraints.mtaUpper - i * step);
  }
  return result;
}

export function computeWeights(members: Member[]): number[] {
  // Default equal weights for now.
  // Could be customized to favor stability of certain ranks.
  return new Array(members.length).fill(1);
}

/**
 * Performs Isotonic Regression (Decreasing) respecting Anchors and Bounds.
 * Anchors are treated as hard fixed points.
 * Bounds [L, H] are hard constraints.
 */
export function boundedIsotonicRegressionWithAnchors(
  values: number[],
  anchors: Map<number, number>, // index -> value
  globalL: number,
  globalH: number
): number[] {
  const n = values.length;
  const result = [...values];

  // 1. Identify segments between anchors
  const anchorIndices = Array.from(anchors.keys()).sort((a, b) => a - b);

  // Add virtual anchors at ends if not present, to simplify loop?
  // Actually, better to just iterate segments.

  let startIndex = 0;

  // Segments: [start, end)
  const segments: { start: number, end: number, low: number, high: number }[] = [];

  // Pre-check anchor monotonicity
  for (let i = 0; i < anchorIndices.length - 1; i++) {
    if (anchors.get(anchorIndices[i])! < anchors.get(anchorIndices[i+1])!) {
      // Violation of decreasing monotonicity by anchors themselves.
      // In this case, we can't satisfy strict conditions.
      // But we should probably just proceed and let the result reflect the conflict
      // or throw. For robust engine, we proceed but the result will just be what it is.
      // However, the anchor values are FIXED in the output.
    }
  }

  // Define segments
  let prevAnchorIndex = -1;
  let prevAnchorValue = globalH; // effectively infinity for decreasing

  for (const anchorIndex of anchorIndices) {
    const anchorValue = anchors.get(anchorIndex)!;

    // Segment before this anchor
    if (anchorIndex > prevAnchorIndex + 1) {
      segments.push({
        start: prevAnchorIndex + 1,
        end: anchorIndex,
        low: Math.max(globalL, anchorValue), // Must be >= next anchor
        high: Math.min(globalH, prevAnchorValue) // Must be <= prev anchor
      });
    }

    // Set the anchor value itself
    result[anchorIndex] = anchorValue;

    prevAnchorIndex = anchorIndex;
    prevAnchorValue = anchorValue;
  }

  // Final segment after last anchor
  if (prevAnchorIndex < n - 1) {
    segments.push({
      start: prevAnchorIndex + 1,
      end: n,
      low: globalL,
      high: Math.min(globalH, prevAnchorValue)
    });
  }

  // 2. Process each segment
  for (const seg of segments) {
    // Extract subarray
    const subLen = seg.end - seg.start;
    const subArr = new Array(subLen);
    for (let i = 0; i < subLen; i++) {
      subArr[i] = result[seg.start + i];
    }

    // Run PAVA (Decreasing)
    pavaDecreasing(subArr);

    // Clamp and write back
    for (let i = 0; i < subLen; i++) {
      result[seg.start + i] = clamp(subArr[i], seg.low, seg.high);
    }
  }

  return result;
}

/**
 * Two-pass feasibility detection.
 */
export function computeFeasibleMeanRange(
  params: RedistributionParams
): { minMean: number, maxMean: number, feasible: boolean } {
  const { members, anchors, constraints } = params;
  const n = members.length;
  const anchorMap = new Map<number, number>();

  // Parse anchors (using rankOrder to find index, assuming sorted input or mapping needed)
  // Assuming members are sorted 1..N
  members.forEach((m, i) => {
    if (anchors[m.id] !== undefined) {
      anchorMap.set(i, anchors[m.id]);
    } else if (m.isAnchor) {
       // fallback if passed in member object but not in anchor set,
       // though params.anchors should be source of truth.
       anchorMap.set(i, m.mta);
    }
  });

  // Check anchor monotonicity
  const sortedIndices = Array.from(anchorMap.keys()).sort((a, b) => a - b);
  for (let i = 0; i < sortedIndices.length - 1; i++) {
    if (anchorMap.get(sortedIndices[i])! < anchorMap.get(sortedIndices[i+1])!) {
      // Anchors violate monotonicity -> Infeasible
      // But mathematically we can return empty range or specific error
      return { minMean: NaN, maxMean: NaN, feasible: false };
    }
  }

  // Pass 1: Minimize (fill non-anchors with L)
  const minVals = new Array(n).fill(constraints.mtaLower);
  // Fill anchors
  anchorMap.forEach((v, k) => minVals[k] = v);
  const minResult = boundedIsotonicRegressionWithAnchors(minVals, anchorMap, constraints.mtaLower, constraints.mtaUpper);
  const minMean = minResult.reduce((a, b) => a + b, 0) / n;

  // Pass 2: Maximize (fill non-anchors with H)
  const maxVals = new Array(n).fill(constraints.mtaUpper);
  anchorMap.forEach((v, k) => maxVals[k] = v);
  const maxResult = boundedIsotonicRegressionWithAnchors(maxVals, anchorMap, constraints.mtaLower, constraints.mtaUpper);
  const maxMean = maxResult.reduce((a, b) => a + b, 0) / n;

  // Check intersection with RSCA band
  const feasible = !(minMean > constraints.rscaMax || maxMean < constraints.rscaMin);

  return { minMean, maxMean, feasible };
}

/**
 * Main Redistribution Function
 */
export function redistributeMTA(params: RedistributionParams): RedistributionResult {
  const { members, anchors, constraints, weights: inputWeights } = params;
  const n = members.length;

  // 0. Setup
  const anchorMap = new Map<number, number>();
  const memberIndices = new Map<string, number>();

  members.forEach((m, i) => {
    memberIndices.set(m.id, i);
    if (anchors[m.id] !== undefined) {
      anchorMap.set(i, anchors[m.id]);
    }
  });

  const weights = inputWeights || computeWeights(members);

  // 1. Feasibility Check
  const range = computeFeasibleMeanRange(params);
  if (!range.feasible) {
    // Determine why
    if (isNaN(range.minMean)) {
        return {
            members,
            finalRSCA: computeRSCA(members),
            status: 'INFEASIBLE_MONOTONICITY',
            deltas: {},
            explanation: "Anchor values violate monotonicity (Rank 1 must be >= Rank 2, etc)."
        };
    }
    return {
      members,
      finalRSCA: computeRSCA(members),
      status: 'INFEASIBLE_BOUNDS', // or RSCA, usually RSCA if range valid but no overlap
      deltas: {},
      explanation: `Target RSCA band [${constraints.rscaMin.toFixed(2)}, ${constraints.rscaMax.toFixed(2)}] is unreachable. Feasible range: [${range.minMean.toFixed(2)}, ${range.maxMean.toFixed(2)}].`
    };
  }

  // 2. Iterative Mean-Shift
  // Target Mean: Midpoint of intersection
  const targetMin = Math.max(constraints.rscaMin, range.minMean);
  const targetMax = Math.min(constraints.rscaMax, range.maxMean);
  const targetMean = (targetMin + targetMax) / 2;

  // Initialize x
  // If baseline provided, use it. Else use current MTAs.
  let x = members.map(m => m.mta);
  if (params.baselineCurve && params.baselineCurve.length === n) {
    x = [...params.baselineCurve];
  }

  // Apply anchors
  anchorMap.forEach((v, k) => x[k] = v);

  // Initial PAVA to start from a valid state
  x = boundedIsotonicRegressionWithAnchors(x, anchorMap, constraints.mtaLower, constraints.mtaUpper);

  let iterations = 0;
  const maxCtx = 50;
  const tol = 0.001; // RSCA tolerance

  while (iterations < maxCtx) {
    const currentMean = x.reduce((a, b) => a + b, 0) / n;

    if (Math.abs(currentMean - targetMean) < tol) {
      break;
    }

    // Calculate shift
    const diff = targetMean - currentMean;
    const totalNeeded = diff * n;

    // Distribute to non-anchors based on weights
    let totalWeight = 0;
    for (let i = 0; i < n; i++) {
      if (!anchorMap.has(i)) {
        totalWeight += weights[i];
      }
    }

    if (totalWeight === 0) {
      // All anchored or 0 weights? Can't move.
      break;
    }

    // Apply Shift
    for (let i = 0; i < n; i++) {
      if (!anchorMap.has(i)) {
        const delta = (totalNeeded * weights[i]) / totalWeight;
        x[i] += delta;
        // Clamp immediately to global bounds to avoid wild swings,
        // though PAVA will handle it, it's safer for stability
        x[i] = clamp(x[i], constraints.mtaLower, constraints.mtaUpper);
      }
    }

    // Re-apply PAVA
    x = boundedIsotonicRegressionWithAnchors(x, anchorMap, constraints.mtaLower, constraints.mtaUpper);

    // If we are stuck (mean not moving), break
    const newMean = x.reduce((a, b) => a + b, 0) / n;
    if (Math.abs(newMean - currentMean) < 1e-6) {
        break;
    }

    iterations++;
  }

  // 3. Construct Result
  const finalMembers = members.map((m, i) => ({
    ...m,
    mta: Number(x[i].toFixed(2)) // Rounding for display/storage
  }));

  const finalRSCA = computeRSCA(finalMembers);

  // Compute deltas
  const deltas: Record<string, number> = {};
  finalMembers.forEach((m, i) => {
    deltas[m.id] = m.mta - members[i].mta;
  });

  // Verify constraints
  const isMonotonic = validateMonotonicity(finalMembers);
  const isBounded = validateBounds(finalMembers, constraints);
  const isRSCA = finalRSCA >= constraints.rscaMin - 0.01 && finalRSCA <= constraints.rscaMax + 0.01;

  let status: FeasibilityStatus = 'FEASIBLE';
  let explanation = "Redistribution successful.";

  if (!isRSCA) {
      status = 'INFEASIBLE_RSCA'; // Should have been caught by range check, but maybe rounding issues
      explanation = `Could not reach exact target RSCA. Achieved: ${finalRSCA.toFixed(2)}.`;
  }

  return {
    members: finalMembers,
    finalRSCA,
    status,
    deltas,
    explanation
  };
}
