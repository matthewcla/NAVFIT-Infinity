import type { Member, Constraints, RedistributionEngineResult, AlgorithmParams } from './types';
import { RedistributionReasonCode } from './types';

// Helper: clamp
function clamp(x: number, L: number, H: number): number {
  return Math.max(L, Math.min(H, x));
}

// Helper: mean
function mean(x: number[]): number {
  if (x.length === 0) return 0;
  let s = 0;
  for (const v of x) s += v;
  return s / x.length;
}

// 2.2 Baseline Curve and Weights

export function computeBaselineCurve(
  N: number,
  muTarget: number,
  L: number,
  H: number,
  params: AlgorithmParams
): number[] {
  // Choose betaTop so that average(b) ~= muTarget, then clamp within [L,H].
  // b_i = betaTop - delta*(i-1)^p
  const { delta, p } = params;

  // Compute average of (i-1)^p for i=1..N
  let avgPow = 0;
  for (let i = 1; i <= N; i++) avgPow += Math.pow(i - 1, p);
  avgPow /= N;

  const betaTop = muTarget + delta * avgPow;

  const b: number[] = [];
  for (let i = 1; i <= N; i++) {
    const v = betaTop - delta * Math.pow(i - 1, p);
    b.push(clamp(v, L, H));
  }
  return b;
}

export function computeWeights(
  N: number,
  anchorRanks: number[],
  params: AlgorithmParams
): number[] {
  const { alpha, tau } = params;
  const w: number[] = [];

  for (let i = 1; i <= N; i++) {
    let d = Infinity;
    for (const a of anchorRanks) d = Math.min(d, Math.abs(i - a));

    // If no anchors, d is Infinity. Exp(-inf) is 0. weight = 1.
    // Ensure tau is not 0 to avoid division by zero.
    const effectiveTau = Math.max(0.001, tau);
    const boost = Math.exp(-d / effectiveTau);
    w.push(1 + alpha * boost);
  }

  return w;
}

// 2.3 Core Primitive: Bounded Isotonic Regression with Anchors (PAVA)

function isotonicNonDecreasingWeighted(y: number[], w: number[]): number[] {
  // Weighted PAVA, O(N)
  type Block = { start: number; end: number; weight: number; avg: number };
  const blocks: Block[] = [];

  for (let i = 0; i < y.length; i++) {
    blocks.push({ start: i, end: i, weight: w[i], avg: y[i] });

    // Merge while violating non-decreasing: prev.avg > last.avg
    while (blocks.length >= 2) {
      const b2 = blocks[blocks.length - 1];
      const b1 = blocks[blocks.length - 2];
      if (b1.avg <= b2.avg) break;

      const weight = b1.weight + b2.weight;
      const avg = (b1.avg * b1.weight + b2.avg * b2.weight) / weight;
      blocks.splice(blocks.length - 2, 2, {
        start: b1.start,
        end: b2.end,
        weight,
        avg,
      });
    }
  }

  // Expand blocks
  const x = new Array(y.length);
  for (const b of blocks) {
    for (let i = b.start; i <= b.end; i++) x[i] = b.avg;
  }
  return x;
}

function isotonicNonIncreasingWeighted(y: number[], w: number[]): number[] {
  // PAVA for non-increasing constraint: x1 >= x2 >= ... >= xN
  // Convert to non-decreasing by flipping index:
  const yr = [...y].reverse();
  const wr = [...w].reverse();

  // Perform standard non-decreasing weighted isotonic on reversed vectors
  const xr = isotonicNonDecreasingWeighted(yr, wr);

  return xr.reverse();
}

export function boundedIsotonicWithAnchors(
  y: number[],
  w: number[],
  anchors: Map<number /*idx*/, number>,
  L: number,
  H: number
): number[] {
  // Start from y, overwrite anchors
  let x = y.map((v, _i) => clamp(v, L, H));
  for (const [i, a] of anchors.entries()) x[i] = clamp(a, L, H);

  // Iteratively project to satisfy both monotonicity and anchors.
  // Prompt suggests "2-3 passes". We'll use a few more to be safe for stability.
  const passes = 20;

  for (let iter = 0; iter < passes; iter++) {
    // 1. Isotonic Projection (enforces monotonicity)
    x = isotonicNonIncreasingWeighted(x, w);

    // 2. Enforce Bounds and Anchors (hard constraints)
    for (let i = 0; i < x.length; i++) {
      let v = x[i];
      // Clamp bounds
      if (v < L) { v = L; }
      if (v > H) { v = H; }

      // Pin anchors
      if (anchors.has(i)) {
        const a = clamp(anchors.get(i)!, L, H);
        if (Math.abs(v - a) > 1e-9) {
          v = a;
        }
      }
      x[i] = v;
    }
  }

  return x;
}

// 2.4 Feasible Mean Range

export function computeFeasibleMeanRange(
  N: number,
  anchors: Map<number, number>,
  w: number[],
  L: number,
  H: number
): { meanMin: number; meanMax: number } {
  // MeanMin: fill non-anchors with L
  const yMin = new Array(N).fill(L);
  for (const [i, a] of anchors.entries()) yMin[i] = a;
  const xMin = boundedIsotonicWithAnchors(yMin, w, anchors, L, H);

  // MeanMax: fill non-anchors with H
  const yMax = new Array(N).fill(H);
  for (const [i, a] of anchors.entries()) yMax[i] = a;
  const xMax = boundedIsotonicWithAnchors(yMax, w, anchors, L, H);

  return { meanMin: mean(xMin), meanMax: mean(xMax) };
}

// 2.7 Infeasibility Suggestions (Minimal, Lightweight)
function suggestAnchorEditsTowardFeasibleMean(
  members: Member[],
  anchors: Map<number, number>,
  desiredMu: number,
  meanMin: number,
  meanMax: number
): Array<{ id: string; suggestedMta: number; note: string }> {
  const suggestions: Array<{ id: string; suggestedMta: number; note: string }> = [];

  if (desiredMu > meanMax) {
    for (const [idx, a] of anchors.entries()) {
      // Corrected logic: Raise anchor to allow higher mean
      suggestions.push({
        id: members[idx].id,
        suggestedMta: a + 0.05,
        note: "Raise this anchor slightly to increase the maximum achievable RSCA.",
      });
    }
  } else if (desiredMu < meanMin) {
    for (const [idx, a] of anchors.entries()) {
      // Corrected logic: Lower anchor to allow lower mean
      suggestions.push({
        id: members[idx].id,
        suggestedMta: a - 0.05,
        note: "Lower this anchor slightly to decrease the minimum achievable RSCA.",
      });
    }
  }

  return suggestions.slice(0, 5); // keep UI manageable
}

// 3.1 Plain-Language Explanation Builder
export function explain(result: RedistributionEngineResult, anchorsCount: number): string {
  if (!result.isFeasible) {
    return `Infeasible configuration: achievable RSCA range [${result.diagnostics?.meanMin.toFixed(3)}, ${result.diagnostics?.meanMax.toFixed(3)}] does not intersect band [${result.diagnostics?.band.muMin.toFixed(1)}, ${result.diagnostics?.band.muMax.toFixed(1)}]. Adjust anchors or bounds.`;
  }

  const moved = result.changedMembers ? result.changedMembers.length : 0;
  return `Redistribution updated ${moved} member(s). Anchors (${anchorsCount}) were held fixed. Non-anchor MTAs were adjusted to preserve rank order and keep RSCA within the control band.`;
}

// 2.5 Mean Targeting Loop (RSCA Band Enforcement)

export function redistributeMTA(
  members: Member[],
  constraints: Constraints,
  params: AlgorithmParams,
  prior?: number[] // Optional prior distribution
): RedistributionEngineResult {
  const N = members.length;
  if (N === 0) {
    return {
      mtaVector: [], finalRSCA: 0, isFeasible: true, deltas: [], explanation: "Empty Group"
    }
  }

  const { controlBandLower: muMin, controlBandUpper: muMax, mtaLowerBound: L, mtaUpperBound: H, maxIterations, tolerance: tol } = constraints;
  const muTarget = (muMin + muMax) / 2;

  // Anchors: index 0..N-1
  const anchors = new Map<number, number>();
  const anchorRanks: number[] = [];
  for (let idx = 0; idx < N; idx++) {
    const m = members[idx];
    if (m.isAnchor) {
      // If anchor value is invalid (undefined), fallback to mta or target
      // Usually anchorValue should be set if isAnchor is true.
      const val = m.anchorValue ?? m.mta ?? muTarget;
      anchors.set(idx, val);
      anchorRanks.push(idx + 1);
    }
  }

  const w = computeWeights(N, anchorRanks, params);

  // Feasibility range
  const { meanMin, meanMax } = computeFeasibleMeanRange(N, anchors, w, L, H);

  // Band Intersection Check
  const overlapMin = Math.max(meanMin, muMin);
  const overlapMax = Math.min(meanMax, muMax);
  const bandIntersects = overlapMin <= overlapMax + 1e-9;

  if (!bandIntersects) {
    const desiredMu = (meanMax < muMin) ? muMin : muMax;
    const suggestions = suggestAnchorEditsTowardFeasibleMean(members, anchors, desiredMu, meanMin, meanMax);

    return {
      mtaVector: prior ?? members.map(m => m.mta ?? muTarget),
      finalRSCA: prior ? mean(prior) : mean(members.map(m => m.mta ?? muTarget)),
      isFeasible: false,
      reasonCodes: [RedistributionReasonCode.INFEASIBLE_RSCA_BAND],
      changedMembers: [],
      deltas: [],
      explanation: "",
      diagnostics: {
        meanMin,
        meanMax,
        band: { muMin, muMax },
        suggestedAnchorEdits: suggestions
      },
    };
  }

  // Baseline
  const inputPrior = prior ?? members.map(m => m.mta);
  const effectivePrior = (inputPrior.length === N) ? inputPrior : computeBaselineCurve(N, muTarget, L, H, params);

  const baseline = effectivePrior;

  // Start: baseline with anchors pinned, isotonic projected
  let x = boundedIsotonicWithAnchors(baseline, w, anchors, L, H);

  // Choose a target mean within band and feasible range
  const muStar = clamp(muTarget, overlapMin, overlapMax);

  // Mean-shift iterations
  const isAnchorIdx = new Array(N).fill(false);
  for (const i of anchors.keys()) isAnchorIdx[i] = true;

  let iter = 0;
  for (; iter < maxIterations; iter++) {
    const mu = mean(x);
    const err = muStar - mu;
    if (Math.abs(err) <= tol) break;

    // Distribute offset across non-anchors (weighted)
    let denom = 0;
    for (let i = 0; i < N; i++) if (!isAnchorIdx[i]) denom += w[i];

    if (denom === 0) break; // all anchors

    const y = x.slice();
    for (let i = 0; i < N; i++) {
      if (isAnchorIdx[i]) continue;

      const delta = (err * N) * (w[i] / denom);
      y[i] = clamp(y[i] + delta, L, H);
    }

    // Re-project to enforce monotonicity + anchors
    x = boundedIsotonicWithAnchors(y, w, anchors, L, H);
  }

  const finalRsca = mean(x);
  // Re-check feasibility (might have drifted slightly or failed to converge)
  const feasible = finalRsca >= muMin - tol && finalRsca <= muMax + tol;

  // Deltas
  const old = effectivePrior;
  const changed = members.map((m, idx) => ({
    id: m.id,
    oldMta: old[idx],
    newMta: x[idx],
    delta: x[idx] - old[idx],
  })).filter(r => Math.abs(r.delta) > 1e-9);

  const baseReasonCodes: RedistributionReasonCode[] = [
    RedistributionReasonCode.REDISTRIBUTED,
    RedistributionReasonCode.MONOTONICITY_ENFORCED,
    RedistributionReasonCode.BOUNDS_ENFORCED,
    RedistributionReasonCode.RSCA_TARGETED
  ];
  if (anchors.size > 0) baseReasonCodes.push(RedistributionReasonCode.ANCHOR_CONSTRAINT);

  const result: RedistributionEngineResult = {
    mtaVector: x,
    finalRSCA: finalRsca,
    isFeasible: feasible,
    reasonCodes: baseReasonCodes,
    changedMembers: changed,
    deltas: x.map((v, i) => v - old[i]),
    explanation: "",
    diagnostics: { meanMin, meanMax, band: { muMin, muMax }, iterations: iter },
  };

  result.explanation = explain(result, anchors.size);
  return result;
}

// 2.6 Default Anchor Selection Logic (Top/Bottom 10%)

export function defaultAnchorIndices(N: number): { top: number[]; bottom: number[] } {
  if (N <= 1) return { top: [0], bottom: [0] };

  const k = Math.max(1, Math.ceil(0.10 * N));
  const top = Array.from({ length: k }, (_, i) => i);
  const bottom = Array.from({ length: k }, (_, i) => N - k + i);

  return { top, bottom };
}
