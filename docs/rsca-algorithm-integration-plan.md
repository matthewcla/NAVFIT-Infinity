# RSCA Algorithm Integration Plan

## Tech Stack Identification

*   **Framework**: React 19 (Functional Components, Hooks)
*   **Language**: TypeScript (Strict typing)
*   **Build Tooling**: Vite (Fast HMR, optimized build)
*   **State Management**: Zustand (Global store, simple actions)
*   **Test Framework**: Vitest (Unit testing logic and hooks)
*   **Styling**: Tailwind CSS (Utility-first styling) with `clsx` and `tailwind-merge`
*   **Icons**: Lucide React
*   **Drag & Drop**: Native HTML5 Drag and Drop API

## Core Concepts & Definitions

### 1. Competitive Group (The Filter / RSCA Tracker)
A classification attribute inherent to the individual Service member. It defines who determines the Reporting Senior's Cumulative Average (RSCA).
*   **Role**: Acts as the "Pool" or "Filter" for RSCA tracking.
*   **Officer Definition**: Defined by **Competitive Designator Category** (Block 3).
    *   *Example*: "O-3 11XX".
*   **Enlisted Definition**: Defined by **Paygrade** AND **Duty Status** (Block 5).
    *   *Example*: "E-6 ACT/TAR" is one group; "E-6 INACT" is a separate group.
    *   *Note*: Enlisted members in the same paygrade compete together regardless of rating.
*   **Handling**: 

### 2. Summary Group (The Calculation Bucket)
The specific collection of reports processed together for a specific event (e.g., Periodic Cycle). It is a subset of a Competitive Group.
*   **Role**: The "Event" level where ranking and quota calculations happen.
*   **Matching Criteria**:
    *   **Reporting Senior** (Block 22) - *Must be top-level property.*
    *   **End Date** (Block 15)
    *   **Period of Report**
    *   **Paygrade** (Block 2)
    *   **Promotion Status** (Block 8) - *Separates Regular from Frocked/Selected.*
    *   **Duty Status** (Block 5)
    *   **Billet Subcategory** (Block 21)
*   **Relationship**: Optimizing a *Summary Group* impacts the RSCA of the parent *Competitive Group*.

## Architecture Map & Integration Points

### 1. Data Structure Refinement
*   **Location**: `src/types/index.ts`
*   **Changes**:
    *   **SummaryGroup Interface**:
        *   Add `reportingSeniorId` as a top-level required property.
        *   Ensure `competitiveGroupKey` logic supports the detailed Enlisted definition (Rank + Duty Status).
    *   **Enlisted Logic**: Ensure `SummaryGroupGenerator` creates separate groups for "ACT/TAR" vs "INACT".

### 2. Rank Ordering UI
*   **Location**: `src/features/strategy/components/CycleMemberList.tsx`
*   **Integration**:
    *   **Action**: Refactor `onDrop` to trigger the **RSCA Projection Engine**.
    *   **Context**: The UI displays a *Summary Group*, but the feedback must show the impact on the *Reporting Senior's* cumulative RSCA.

### 3. Algorithm & Math Engine
*   **Location**: `src/features/strategy/logic/optimizationEngine.ts`
*   **Scope**: The engine is no longer just a "Distribution Solver" for a single group. It is a **Time-Series Projection Engine**.
*   **Inputs**:
    *   Last Summary Group (Trait Avgs for each member in current Summary Group).
    *   Current Summary Group (Members, Trait Avgs).
    *   Reporting Senior's Historical RSCA (for this Competitive Group).
    *   Projected Future Events (Member Rotations/Gains).
*   **Logic**:
    *   **Step 1**: Calculate outcomes for the current Summary Group.
    *   **Step 2**: Update the cumulative RSCA.
    *   **Step 3**: Project this new RSCA forward to all future reports the Senior is expected to write assuming a 0.05 to 0.10 MTA progression per report.
    *   **Step 4**: Apply "Rotation Logic":
        *   *Departures*: Remaining members linearly improve ranking.
        *   *Gains*: New members assume lower ranks (bottom of pile).

### 4. Validation Rules
*   **Location**: `src/features/strategy/logic/validation.ts`
*   **Enhancement**:
    *   **Strict**: Quota limits (EP <= 20%).
    *   **Cross-Check**: Ensure officers of different designators are strictly separated.

## Incremental PR Plan

### PR 1: Core Algorithm - Time-Series Projection
*   **Scope**: Create `optimizationEngine.ts`. Implement the logic to calculate Summary Group averages AND project the impact on future RSCA based on member rotation.
*   **Key Logic**:
    *   `calculateGroupAverage(reports)`
    *   `projectFutureRSCA(currentRSCA, currentGroup, futureRosterEvents)`
*   **Tests**: Unit tests for rotation scenarios (member leaving improves remaining ranks).
*   **Files**: `optimizationEngine.ts`, `optimizationEngine.test.ts`.

### PR 2: Data Layer - Structure & Enlisted Logic
*   **Scope**: Update `SummaryGroup` type to include `reportingSeniorId`. Update `SummaryGroupGenerator` to split Enlisted groups by Duty Status (ACT/TAR vs INACT) and correctly format `competitiveGroupKey`.
*   **Tests**: Verify "E-6 ACT" and "E-6 INACT" generate separate groups.
*   **Files**: `types/index.ts`, `services/summaryGroupGenerator.ts`, `services/summaryGroupGenerator.test.ts`.

### PR 3: Validation Engine
*   **Scope**: strict vs soft validation. Ensure Promotion Status separation (Regular vs Frocked) is enforced at the Summary Group level but linked at the Competitive Group level for RSCA.
*   **Files**: `validation.ts`, `validation.test.ts`.

### PR 4: Store Integration & Persistence
*   **Scope**: Integrate the new engine into `useNavfitStore`. Add `persistenceService` (LocalStorage) to save/load these complex groups.
*   **Files**: `store/useNavfitStore.ts`, `services/persistenceService.ts`.

### PR 5: UI - Real-time Constraints
*   **Scope**: Update drag-and-drop to call the new Validation Engine.
*   **Files**: `CycleMemberList.tsx`.

### PR 6: UI - Projections & Feedback
*   **Scope**: Display the "Projected RSCA" impact. When a user changes a rank in the current group, show how it affects the *future* RSCA for the Senior.
*   **Files**: `RscaHeadsUpDisplay.tsx`, `StrategyWorkspace.tsx`.
