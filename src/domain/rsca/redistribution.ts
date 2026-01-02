import { Member, Constraints } from './types';

// Types specific to the redistribution engine
export interface RedistributionEngineResult {
  mtaVector: number[];
  finalRSCA: number;
  isFeasible: boolean;
  deltas: number[];
  explanation: string;
  diagnostics?: {
    meanMin: number;
    meanMax: number;
    iterations: number;
  };
}

/**
 * Computes a baseline curve (b_i).
 * Defaults to a linear distribution between the bounds if no better heuristic is available,
 * or simply returns the current MTAs if they exist.
 */
export function computeBaselineCurve(
  count: number,
  bounds: [number, number],
  currentMtas?: number[]
): number[] {
  if (currentMtas && currentMtas.length === count) {
    return [...currentMtas];
  }

  // Linear decay from H to L
  const [L, H] = bounds;
  if (count <= 1) return [H];

  const step = (H - L) / (count - 1);
  return Array.from({ length: count }, (_, i) => H - i * step);
}

/**
 * Computes weights (w_i).
 * Defaults to uniform weights (1.0).
 */
export function computeWeights(count: number): number[] {
  return new Array(count).fill(1.0);
}

/**
 * Core PAVA implementation for Monotone Non-Increasing sequence.
 * Supports weighted data.
 * Returns the isotonic regression of y.
 */
function pavaMonotoneNonIncreasing(y: number[], weights: number[]): number[] {
  const n = y.length;
  if (n === 0) return [];

  // specific implementation for non-increasing (x1 >= x2 >= ... >= xn)
  // Blocks structure: value, weight, indices
  const val = [...y];
  const w = [...weights];
  // We use a stack of blocks. Each block covers a range of indices.
  // Since we only need the final values, we can just store the block value and total weight
  // and track how many original elements are in the block to reconstruct the array.

  // Stack stores: { value, weight, count }
  const stack: { value: number; weight: number; count: number }[] = [];

  for (let i = 0; i < n; i++) {
    let currentVal = val[i];
    let currentWeight = w[i];
    let currentCount = 1;

    // While strict monotonicity is violated (previous block value < current block value)
    // We want decreasing, so violation is prev < curr.
    // e.g. 3.0, 4.0 -> violation. Merge to 3.5.
    while (stack.length > 0 && stack[stack.length - 1].value < currentVal) {
      const prev = stack.pop()!;
      // Merge
      const totalW = prev.weight + currentWeight;
      currentVal = (prev.value * prev.weight + currentVal * currentWeight) / totalW;
      currentWeight = totalW;
      currentCount += prev.count;
    }

    stack.push({ value: currentVal, weight: currentWeight, count: currentCount });
  }

  // Unroll stack to result array
  const result: number[] = [];
  for (const block of stack) {
    for (let k = 0; k < block.count; k++) {
      result.push(block.value);
    }
  }

  return result;
}

/**
 * Bounded Isotonic Regression with Anchors.
 * Enforces:
 * 1. x_i = anchors[i] if i is anchor
 * 2. x_1 >= x_2 >= ... >= x_N
 * 3. L <= x_i <= H
 */
export function boundedIsotonicRegressionWithAnchors(
  inputValues: number[],
  weights: number[],
  anchors: Map<number, number>, // index -> value
  bounds: [number, number]
): number[] {
  const n = inputValues.length;
  const [L, H] = bounds;
  const result = new Array(n).fill(0);

  // 1. Identify segments between anchors
  // Anchors act as fixed boundary conditions.
  // Add implicit anchors at -1 (value H) and n (value L) if we consider bounds as virtual anchors,
  // but strictly speaking, bounds are inequalities.

  // Sorted anchor indices
  const anchorIndices = Array.from(anchors.keys()).sort((a, b) => a - b);

  // We process segments separated by anchors.
  // Segment 0: 0 to anchorIndices[0] - 1
  // Segment k: anchorIndices[k-1] + 1 to anchorIndices[k] - 1
  // Segment last: anchorIndices[last] + 1 to n - 1

  let start = 0;

  // Helper to process a segment
  const processSegment = (s: number, e: number, upperLimit: number, lowerLimit: number) => {
    if (s > e) return;

    const segLen = e - s + 1;
    const segVals = inputValues.slice(s, e + 1);
    const segWeights = weights.slice(s, e + 1);

    // Run PAVA
    const monotonicVals = pavaMonotoneNonIncreasing(segVals, segWeights);

    // Clip to segment bounds
    // The segment is constrained by the anchor to the left (upperLimit) and right (lowerLimit).
    // Also constrained by global bounds [L, H].
    // So effective range is [max(L, lowerLimit), min(H, upperLimit)]
    const effMin = Math.max(L, lowerLimit);
    const effMax = Math.min(H, upperLimit);

    for (let i = 0; i < segLen; i++) {
      let v = monotonicVals[i];
      if (v > effMax) v = effMax;
      if (v < effMin) v = effMin;
      result[s + i] = v;
    }
  };

  // Iterate through anchors
  for (const idx of anchorIndices) {
    const anchorVal = anchors.get(idx)!;

    // Set anchor value in result
    result[idx] = anchorVal;

    // Process segment before this anchor
    // Upper limit comes from previous anchor or global H
    let upperLimit = H;
    if (start > 0 && anchors.has(start - 1)) {
       upperLimit = anchors.get(start - 1)!;
    }

    // Lower limit is the current anchor value
    const lowerLimit = anchorVal;

    processSegment(start, idx - 1, upperLimit, lowerLimit);

    start = idx + 1;
  }

  // Process final segment after last anchor
  if (start < n) {
    let upperLimit = H;
    if (start > 0 && anchors.has(start - 1)) {
        upperLimit = anchors.get(start - 1)!;
    }
    const lowerLimit = L;

    processSegment(start, n - 1, upperLimit, lowerLimit);
  }

  return result;
}

/**
 * Computes feasible mean range given anchors and bounds.
 */
export function computeFeasibleMeanRange(
  count: number,
  anchors: Map<number, number>,
  weights: number[],
  bounds: [number, number]
): [number, number] {
  const [L, H] = bounds;

  // Compute Min Possible Mean: Set non-anchors to L, run PAVA
  const minInputs = new Array(count).fill(L);
  const minResult = boundedIsotonicRegressionWithAnchors(minInputs, weights, anchors, bounds);
  const totalW = weights.reduce((a, b) => a + b, 0);
  const minMean = minResult.reduce((sum, v, i) => sum + v * weights[i], 0) / totalW;

  // Compute Max Possible Mean: Set non-anchors to H, run PAVA
  const maxInputs = new Array(count).fill(H);
  const maxResult = boundedIsotonicRegressionWithAnchors(maxInputs, weights, anchors, bounds);
  const maxMean = maxResult.reduce((sum, v, i) => sum + v * weights[i], 0) / totalW;

  return [minMean, maxMean];
}

/**
 * Main Redistribution Function
 */
export function redistributeMTA(
  members: Member[], // Assumed sorted by rank (Rank 1 first)
  constraints: Constraints,
  targetRSCA?: number
): RedistributionEngineResult {
  const n = members.length;
  if (n === 0) {
      return {
          mtaVector: [], finalRSCA: 0, isFeasible: true, deltas: [], explanation: "Empty group"
      };
  }

  // Extract constraints
  const L = constraints.mtaLowerBound;
  const H = constraints.mtaUpperBound;
  const muMin = constraints.controlBandLower;
  const muMax = constraints.controlBandUpper;
  const bounds: [number, number] = [L, H];

  // Setup inputs
  // We assume members are sorted by rank.
  // Map members to indices 0..n-1. Index 0 is Rank 1 (Highest).
  const anchors = new Map<number, number>();
  const initialValues: number[] = [];

  members.forEach((m, i) => {
    if (m.isAnchor && m.anchorValue !== undefined) {
      anchors.set(i, m.anchorValue);
      initialValues.push(m.anchorValue);
    } else {
      initialValues.push(m.mta); // Use current MTA as baseline input
    }
  });

  // Check anchor consistency
  const sortedAnchorIndices = Array.from(anchors.keys()).sort((a, b) => a - b);
  for (let k = 0; k < sortedAnchorIndices.length - 1; k++) {
      const idx1 = sortedAnchorIndices[k];
      const idx2 = sortedAnchorIndices[k + 1];
      if (anchors.get(idx1)! < anchors.get(idx2)!) {
          // Violation: Higher rank (lower index) has lower value.
          return {
              mtaVector: initialValues,
              finalRSCA: 0, // Invalid
              isFeasible: false,
              deltas: new Array(n).fill(0),
              explanation: `Anchor inconsistency: Rank ${members[idx1].rank} (${anchors.get(idx1)}) < Rank ${members[idx2].rank} (${anchors.get(idx2)})`
          };
      }
  }

  const weights = computeWeights(n); // Uniform for now
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Check Feasibility
  const [minPossibleMean, maxPossibleMean] = computeFeasibleMeanRange(n, anchors, weights, bounds);

  // Determine effective target band intersection
  const effectiveMin = Math.max(muMin, minPossibleMean);
  const effectiveMax = Math.min(muMax, maxPossibleMean);

  if (effectiveMin > effectiveMax + 1e-9) {
      return {
          mtaVector: initialValues,
          finalRSCA: 0,
          isFeasible: false,
          deltas: new Array(n).fill(0),
          explanation: `Infeasible: Achievable RSCA range [${minPossibleMean.toFixed(3)}, ${maxPossibleMean.toFixed(3)}] does not overlap with target band [${muMin}, ${muMax}]`,
          diagnostics: { meanMin: minPossibleMean, meanMax: maxPossibleMean, iterations: 0 }
      };
  }

  // Iterative Mean-Shift
  // Use midpoint of effective band as target if no specific target provided
  const targetMean = targetRSCA !== undefined
      ? Math.max(effectiveMin, Math.min(effectiveMax, targetRSCA))
      : (effectiveMin + effectiveMax) / 2;

  let currentInputs = [...initialValues];
  // Ensure initial inputs are within L, H (though baseline might be out, we clamp)
  currentInputs = currentInputs.map(v => Math.max(L, Math.min(H, v)));

  let resultVector: number[] = [];
  let iterations = 0;
  const maxIterations = 20;
  const tolerance = 0.0001; // tolerance for RSCA mean

  let finalMean = 0;

  while (iterations < maxIterations) {
    resultVector = boundedIsotonicRegressionWithAnchors(currentInputs, weights, anchors, bounds);
    finalMean = resultVector.reduce((sum, v, i) => sum + v * weights[i], 0) / totalWeight;

    if (Math.abs(finalMean - targetMean) < tolerance) {
      break;
    }

    // Shift non-anchors
    const diff = targetMean - finalMean;

    // We apply shift to INPUTS of the regression.
    // Heuristic: shift inputs by diff * correction_factor?
    // Simply adding diff is a good Newton step approximation if slope is 1.
    // Slope of Mean(PAVA(y)) vs y is between 0 and 1.
    // So we might need to overshoot slightly or just iterate.
    // Let's just add diff.

    let shiftAmount = diff;

    // Only shift non-anchors
    for (let i = 0; i < n; i++) {
        if (!anchors.has(i)) {
            currentInputs[i] += shiftAmount;
            // Clamp inputs to [L, H] to avoid runway values,
            // but sometimes we need to push inputs against bounds to force PAVA to saturate.
            // However, pushing beyond bounds is effectively same as pushing to bounds for PAVA clipped result?
            // Not necessarily. PAVA takes average.
            // If we have (100, 0) and we want avg 50. PAVA((100+0)/2) = 50.
            // If bounds are [0, 5].
            // If inputs are 2, 2. PAVA=2. Mean=2. Target=4.
            // Shift inputs to 4, 4. PAVA=4.
            // So clamping inputs to [L, H] is safe because output can't exceed bounds anyway.
            currentInputs[i] = Math.max(L, Math.min(H, currentInputs[i]));
        }
    }

    iterations++;
  }

  // Calculate deltas vs original MTAs
  const deltas = resultVector.map((v, i) => v - members[i].mta);

  return {
      mtaVector: resultVector,
      finalRSCA: finalMean,
      isFeasible: true,
      deltas,
      explanation: `Feasible solution found in ${iterations} iterations. RSCA: ${finalMean.toFixed(3)}`,
      diagnostics: { meanMin: minPossibleMean, meanMax: maxPossibleMean, iterations }
  };
}
