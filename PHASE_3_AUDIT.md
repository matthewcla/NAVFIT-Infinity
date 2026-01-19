# Phase 3: Algorithm Audit

## 1. Policy Violations (Critical vs. Minor)

We reviewed `quotas.ts`, `validation.ts`, and `table1_2.ts` against `bupers1610-policy-traceability.md`.

*   **Compliant (Pass):**
    *   **Rounding:** `quotas.ts` correctly uses `Math.ceil` for EP and EP+MP limits (`computeEpMax`, `computeEpMpCombinedMax`), adhering to the "Round Up" policy.
    *   **Summary Group of 2:** The "1 EP / 1 MP" exception is correctly implemented via `TABLE_1_2` (Row `size: 2`) and utilized in `computeMpMax`.
    *   **Paygrade Variances:** `getMpColumnKey` correctly maps E1-E4 to "No Limit" (low) and applies 60%/50%/40% caps respectively.

*   **Violations (Fail):**
    *   **Worker Isolation (Critical):** `src/features/strategy/components/CommandDeck/RscaScatterPlot.tsx` imports `calculateOptimizedTrajectory` and `analyzeGroupRisk` directly from `optimizer.ts`. This executes heavy mathematical logic on the **Main Thread**, violating the architectural requirement to isolate strategy math to `redistribution.worker.ts`.
    *   **Validation Gap (Minor):** While `validation.ts` checks for 1.0/2.0 trait blocks, `distributeMtaByRank` in `optimizer.ts` does not perform these checks. It blindly assigns scores (potentially EP/MP) without verifying if the underlying member has a blocking trait grade, theoretically allowing an invalid optimization suggestion.

## 2. The "Killer Test" Scenarios (Logic Gaps)

These tests are designed to break `optimizer.ts` and `redistribution.ts`.

### Scenario A: The Starvation (Negative MTA)
*   **Concept:** A user has already consumed their entire RSCA budget in finalized groups, but plans a new group.
*   **Input:** `accumulatedScore` > `targetRsca * totalCount`.
*   **Expected Behavior:** The system should floor at a minimum viable MTA (e.g., 2.0 or 0.0) and flag "Infeasible".
*   **Actual Logic:** `calculateOptimizedTrajectory` calculates `optimalMta = (Max - Current) / N`. If Current > Max, `optimalMta` becomes **negative** (e.g., -2.50).
*   **Result:** The trajectory plot will likely crash or draw lines off the chart. `distributeMtaByRank` may produce nonsense values before its final clamp.

### Scenario B: The Mutiny (Lock Override)
*   **Concept:** A user manually "Locks" a specific sailor's MTA/Recommendation, implying it must not change.
*   **Input:** `reports` array containing a member with `isLocked: true`, `mta: 4.0`. `targetRsca` for the group is low (e.g., 3.0).
*   **Expected Behavior:** The optimizer should treat the Locked member as a fixed constraint (Anchor) and distribute the remaining budget among others, or error if impossible.
*   **Actual Logic:** `calculateOptimizedTrajectory` ignores locks completely. `distributeMtaByRank` applies a flat shift to *all* members to hit the target average.
*   **Result:** The Locked member is shifted down (e.g., to 3.2), violating the user's explicit command.

### Scenario C: The Conflict (Oscillation/Broken Sort)
*   **Concept:** Conflicting constraints between "Monotonicity" (Sort Order) and "Anchors" (Fixed Values).
*   **Input:** `redistributeMTA` is given Member A (Rank 1) anchored at 3.0, and Member B (Rank 2) anchored at 4.0.
*   **Invariant:** Rank 1 MTA >= Rank 2 MTA.
*   **Actual Logic:** `boundedIsotonicWithAnchors` runs 20 passes.
    *   Pass N (Isotonic): Enforces A >= B (sets both to 3.5).
    *   Pass N (Anchor): Resets A=3.0, B=4.0.
*   **Result:** The algorithm fails to converge on a valid solution. After 20 iterations, it outputs the state of the last pass (likely the Anchor pass), returning a result where Rank 1 < Rank 2. This breaks the "Master Rank List" strict sort invariant, potentially causing UI glitches in the roster.

## 3. Worker Safety Analysis

*   **Main Thread Leak:** As noted in Section 1, `RscaScatterPlot.tsx` is a confirmed leak of business logic into the UI layer. This risks freezing the browser during heavy optimization cycles (large rosters).
*   **Serialization:** The `WorkerInput` and `WorkerOutput` types in `redistribution.worker.ts` appear safe (JSON-serializable). However, the complex logic in `redistribution.ts` (helper functions) is imported by both the Worker and the Main Thread (via `RscaScatterPlot`), creating a "Dual-Stack" maintenance risk where changes to math affect both async and sync paths differently if the worker build diverges.

**Recommendation:**
1.  Refactor `RscaScatterPlot` to consume pre-calculated data from the Store or request it via the Worker.
2.  Add a `Math.max(0, ...)` clamp to `calculateOptimizedTrajectory`.
3.  Update `distributeMtaByRank` to respect `isLocked` flags.
4.  Add a "Sanity Check" post-pass in `redistribution.ts` to flag Infeasible Anchor configurations.
