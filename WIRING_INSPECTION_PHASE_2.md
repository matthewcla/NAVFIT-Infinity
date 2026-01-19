# Phase 2: Wiring Inspection Report

## Section 1: Critical Path Analysis (The "Promotion" Flow)

**Status: PASS (with caveats)**

*   **Start Point Discrepancy:** The requested starting point `src/features/dashboard/components/RankChangeModal.tsx` appears to be **dead code** (unused in the codebase). The actual promotion flow begins in `src/features/dashboard/components/MemberDetailSidebar.tsx`.
*   **Execution Path:**
    1.  **User Action:** User changes "Recommendation" in `MemberDetailSidebar`.
    2.  **Local State:** `handleRecChange` updates local `simulatedRec` state.
    3.  **Commit:** User clicks "Apply". `handleApply` calls `onUpdatePromRec` prop.
    4.  **Parent Handler:** `CycleContextPanel` receives the call and invokes `updateReport` from `useNavfitStore`.
    5.  **Store Action:** `useNavfitStore` updates `summaryGroups` immutably.
    6.  **Reaction:** `CycleContextPanel` is subscribed to `summaryGroups`. It re-renders, recalculating `contextData` (including `distribution`).
    7.  **HUD Update:** `QuotaHeadsUpDisplay` receives the new `distribution` via props.
*   **Risk Assessment:**
    *   **Stale Closures:** Low risk. `CycleContextPanel` correctly subscribes to the store. `QuotaHeadsUpDisplay` is a pure component relying on props passed from the subscriber.
    *   **Recommendation:** Remove unused `RankChangeModal.tsx` to avoid confusion.

## Section 2: Ghost State Candidates

**Status: FAIL (One Critical Issue Found)**

*   **File:** `src/features/strategy/components/StrategyWorkspace.tsx`
*   **Issue:** **Stale Read via `getState()` in Render**
    *   **Location:** Lines 83-90 (approximate, inside `RscaHeadsUpDisplay` props).
    *   **Code:**
        ```typescript
        currentRsca={(() => {
            const selectedId = useNavfitStore.getState().selectedCycleId; // RISK
            // ...
        })()}
        ```
    *   **Why it's a problem:** The component does **not** subscribe to `selectedCycleId` via the hook (it is not destructured from `useNavfitStore()`). If the selected cycle changes in the store (e.g., via a sidebar action), this component will **not re-render**, and the HUD will display stale or incorrect data until something else triggers a render.
*   **Other Findings:**
    *   `useSummaryGroups` hook is **clean** (uses `useMemo` derived from store subscription).
    *   `PageShell.tsx` is **clean** (presentational only).

## Section 3: Prop Drilling Audit

**Status: PASS**

*   **Analysis:**
    *   `App.tsx` -> `AppLayout`: Clean.
    *   `StrategyWorkspace` -> `ManningWaterfall` (Layer 1) -> `WaterfallGroup` (Layer 2) -> `MemberCard` (Layer 3).
        *   *Verdict:* Acceptable. `ManningWaterfall` derives a `members` list from `roster`. `WaterfallGroup` renders a list of `MemberCard`. `MemberCard` receives a specific member object, not the entire store state. This is standard list rendering, not prop drilling of large store objects.
    *   `StrategyWorkspace` -> `StrategyScattergram`: Clean (uses store fallback if props missing).
    *   `CycleContextPanel` -> `DistributionPanel`: Clean (Layer 1).
*   **Conclusion:** No violations of the "Max 2 Layers" rule for raw `roster` or `summaryGroups` objects were found. Most components correctly connect directly to `useNavfitStore`.
