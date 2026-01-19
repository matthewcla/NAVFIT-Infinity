# Phase 4: Performance Audit

## Section 1: Thread Safety
**Status:** ⚠️ **Main Thread Blocking Detected**

While the web worker infrastructure (`redistribution.worker.ts`) is correctly set up to handle `redistributeMTA`, there is a significant "Main Thread Leak" in the central store.

1.  **Direct Execution in Store:**
    In `src/store/useNavfitStore.ts`, the actions `reorderMembers` and `updateProjection` directly import and execute heavy optimization logic:
    ```typescript
    import { calculateOptimizedTrajectory, distributeMtaByRank } from '@/features/strategy/logic/optimizer';
    // ...
    reorderMembers: (groupId, draggedId, targetIdOrOrder) => set((state) => {
        // ...
        // BLOCKING CALL: Calculates trajectory for ALL groups
        const trajectory = calculateOptimizedTrajectory(workingGroups, state.rsConfig.targetRsca);
        // ...
        // BLOCKING CALL: Iterates over reports to distribute scores
        const distributedScores = distributeMtaByRank(g.reports, targetMta);
        // ...
    })
    ```
    For a roster of 5,000+ sailors, executing `calculateOptimizedTrajectory` (which iterates over all summary groups) synchronously during a drag-and-drop event will cause noticeable frame drops and UI jank.

2.  **Worker Verification:**
    The worker files (`redistribution.worker.ts` and `workerLogic.ts`) are implemented correctly and perform the heavy `redistributeMTA` math off-thread. However, this worker is currently bypassed for the "Cascade" logic in `reorderMembers`.

**Recommendation:** Move the "Cascade" logic (trajectory calculation and multi-group updates) into a worker or an asynchronous process that does not block the UI interaction.

---

## Section 2: Render Waste
**Status:** 🚨 **High Render Frequency**

Analysis of `src/features/strategy/components/StrategyWorkspace.tsx` reveals several performance anti-patterns:

1.  **Inefficient Store Subscription:**
    The component subscribes to the entire store state object, causing it to re-render on *any* unrelated change (e.g., auth state, sidebar toggle, or unrelated group updates).
    ```typescript
    // Bad: Subscribes to everything
    const { roster, ... } = useNavfitStore();
    ```
    **Fix:** Use specific selectors:
    ```typescript
    const roster = useNavfitStore(state => state.roster);
    const viewMode = useNavfitStore(state => state.viewMode);
    ```

2.  **Inline Filtering (Missing `useMemo`):**
    The `summaryGroups` list is filtered inside the JSX return statement, creating a new array on every render.
    ```typescript
    summaryGroups={
        useNavfitStore.getState().selectedCycleId
            ? summaryGroups.filter(...) // New array every render
            : summaryGroups
    }
    ```

3.  **Expensive Inline Calculations:**
    The `RscaHeadsUpDisplay` props use Immediately Invoked Function Expressions (IIFEs) that trigger `calculateCumulativeRSCA` (an O(N) operation over groups) on every single render frame.
    ```typescript
    currentRsca={(() => { ... calculateCumulativeRSCA(...) })()}
    ```

**Recommendation:** Wrap expensive derived state in `useMemo` and break down store subscriptions.

---

## Section 3: Complexity Report
**Status:** ✅ **Acceptable (O(N log N))**

We analyzed the sorting and distribution logic. Note: `distributeMtaByRank` resides in `optimizer.ts`, while `optimizeGroup` is in `rankOptimization.ts`.

1.  **`optimizeGroup` (in `rankOptimization.ts`):**
    *   **Sorting:** Uses `Array.prototype.sort` with a Map lookup for rank. This is **O(N log N)**.
    *   **Water-filling:** Uses a `while` loop capped at 100 iterations, processing the list linearly. This is effectively **O(N)**.
    *   **Total:** **O(N log N)**.

2.  **`distributeMtaByRank` (in `optimizer.ts`):**
    *   Performs sequential mappings (Linear Scan) over the reports array.
    *   **Total:** **O(N)**.

**Verdict:** The algorithms are efficient enough for N=5,000. The bottleneck is not the algorithmic complexity of these functions, but rather their **synchronous execution on the main thread** (identified in Section 1) and the **excessive re-rendering** (Section 2) calling them too frequently. No refactoring to O(N log N) is required as the current implementation already meets or exceeds that target.
