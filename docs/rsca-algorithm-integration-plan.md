# RSCA Algorithm Integration Plan

## Tech Stack Identification

*   **Framework**: React 19 (Functional Components, Hooks)
*   **Language**: TypeScript (Strict typing)
*   **Build Tooling**: Vite (Fast HMR, optimized build)
*   **State Management**: Zustand (Global store, simple actions)
*   **Test Framework**: Vitest (Unit testing logic and hooks)
*   **Styling**: Tailwind CSS (Utility-first styling) with `clsx` and `tailwind-merge`
*   **Icons**: Lucide React
*   **Drag & Drop**: Native HTML5 Drag and Drop API (Replacing/Removing `@dnd-kit`)

## Architecture Map & Integration Points

### 1. Competitive Group Definition / Editing
*   **Location**: `src/types/index.ts` (Data Models), `src/services/summaryGroupGenerator.ts` (Creation Logic)
*   **Integration**:
    *   The concept of `SummaryGroup` already exists.
    *   The "RSCA Algorithm" operates *within* a `SummaryGroup`.
    *   **New**: Need to ensure `SummaryGroup` schema supports "Algorithm Settings" (e.g., specific quotas, target RSCA overrides).

### 2. Rank Ordering UI
*   **Location**: `src/features/strategy/components/CycleMemberList.tsx`, `src/features/strategy/components/MemberReportRow.tsx`
*   **Integration**:
    *   Currently uses HTML5 DnD.
    *   **Action**: Refactor `onDrop` handler in `CycleMemberList` to trigger the **Real-time Adjustment** mode of the new algorithm.
    *   **Constraint**: The UI must prevent drops that violate "Strict" rules (e.g., quotas) by calculating validity *before* committing the move.

### 3. Current MTA / Trait Average Display
*   **Location**: `src/features/strategy/components/RscaHeadsUpDisplay.tsx`, `src/features/strategy/components/MemberReportRow.tsx` (Columns)
*   **Integration**:
    *   These components consume data from `useNavfitStore`.
    *   **Action**: Ensure the algorithm updates the `projections` map in the store, which these components reactively display.

### 4. RSCA or Aggregate Score Calculations
*   **Location**: `src/features/strategy/logic/rsca.ts` (Basic Math), `src/features/strategy/logic/autoPlan.ts` (Current simple logic)
*   **Integration**:
    *   **New Module**: `src/features/strategy/logic/advancedAlgorithm.ts`.
    *   This will house the new "Advanced System" which replaces `autoPlan.ts`.
    *   It will handle "What-If" scenarios and complex distribution curves.

### 5. Validation Rules / Constraint Enforcement
*   **Location**: `src/features/strategy/logic/validation.ts`
*   **Integration**:
    *   **Enhancement**: Add "Strict" vs "Soft" modes.
    *   **Strict**: Quota limits (EP <= 20%). Returns `Blocker`.
    *   **Soft**: Gaps (Under-utilization). Returns `Warning`.
    *   **UI Integration**: `CycleMemberList` shows warnings; Drop handlers reject Blockers.

### 6. Persistence Layer
*   **Location**: `src/services/`
*   **Integration**:
    *   **New**: `src/services/persistenceService.ts`.
    *   **Pattern**: Repository/Adapter pattern.
    *   **Implementation**:
        *   `interface DataProvider { ... }` (Contracts for Roster, Groups, Reports).
        *   `LocalStorageProvider` (Implementation for now).
        *   `ApiProvider` (Future placeholder).

## Algorithm & Math Engine Proposal

Since there is no existing complex distribution engine (only simple linear interpolation in `autoPlan.ts`), we will create a new engine.

**Location**: `src/features/strategy/logic/optimizationEngine.ts`

**Capabilities**:
1.  **Distribution Solver**: Given a roster size and constraints (e.g., max 2 EPs), determine the optimal allocation of quotas.
2.  **Score Interpolator**: Calculate specific Trait Averages (3.0 to 5.0) based on Rank Order, retaining "gaps" between promotion categories.
3.  **Constraint Solver**:
    *   Input: `Current State`, `Move Request`
    *   Output: `New State` OR `Violation Error`

## Incremental PR Plan

### PR 1: Core Algorithm Engine
*   **Scope**: Create `src/features/strategy/logic/optimizationEngine.ts`. Implement the math for distribution curves and score interpolation.
*   **Tests**: Unit tests covering various group sizes, "perfect" distributions, and edge cases (size=1).
*   **Files**: `optimizationEngine.ts`, `optimizationEngine.test.ts`.

### PR 2: Validation Engine Enhancements
*   **Scope**: Enhance `validation.ts` to support Strict vs Warning responses. Implement Quota (EP/MP) checks and Gap checks.
*   **Tests**: Unit tests for valid/invalid scenarios.
*   **Files**: `validation.ts`, `validation.test.ts`, `types/validation.ts`.

### PR 3: Data Layer & Persistence Architecture
*   **Scope**: Create `persistenceService.ts` with API interfaces. Implement `LocalStorage` adapter. Update `useNavfitStore` to load/save from this service.
*   **Tests**: Integration tests ensuring data survives reload.
*   **Files**: `services/persistenceService.ts`, `services/types.ts`, `store/useNavfitStore.ts`.

### PR 4: Cleanup & Dependencies
*   **Scope**: Remove `@dnd-kit` dependencies from `package.json`. Verify `MemberReportRow.tsx` uses only HTML5 DnD. Clean up unused `dnd-kit` imports.
*   **Tests**: Manual verification of build.
*   **Files**: `package.json`, `MemberReportRow.tsx` (cleanup).

### PR 5: Store Integration
*   **Scope**: Integrate the new `optimizationEngine` into `useNavfitStore`. Create actions for `optimizeGroup(groupId)` and `validateMove(from, to)`.
*   **Tests**: Unit tests for Store actions.
*   **Files**: `store/useNavfitStore.ts`, `features/strategy/hooks/useStrategy.ts`.

### PR 6: UI - Wizard & Configuration
*   **Scope**: Create a configuration modal (`OptimizationWizard.tsx`) allowing users to set parameters (e.g., "Target RSCA", "Strategy Aggressiveness") before running the algorithm.
*   **Files**: `features/strategy/components/OptimizationWizard.tsx`, `features/strategy/components/StrategyWorkspace.tsx`.

### PR 7: UI - Real-time Drag-and-Drop Constraints
*   **Scope**: Update `CycleMemberList` `onDrop` handler. Call validation logic *before* state update. If invalid (Strict), block move and show toast. If valid but warning (Soft), allow move and show inline warning.
*   **Files**: `CycleMemberList.tsx`, `useNavfitStore.ts`.

### PR 8: UI - One-Click Optimize & Feedback
*   **Scope**: Connect the "Optimize" button in `CycleContextPanel` or `OptimizationWizard` to the store action. Display results and differences (Before vs After) using a diff view.
*   **Files**: `CycleContextPanel.tsx`, `StrategyWorkspace.tsx`.
