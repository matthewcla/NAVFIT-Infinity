deb# NAVFIT-Infinity: Architecture & Standards

## 1. Core Technology Stack
* **Framework:** React 19 + Vite (Type: Module)
* **Language:** TypeScript (Strict Mode)
* **State Management:** Zustand (`src/store/`)
* **Styling:** Tailwind CSS + Headless UI + clsx/tailwind-merge
* **Animation:** Framer Motion
* **Drag & Drop:** @dnd-kit (Core, Sortable, Utilities)
* **Charts:** Recharts
* **Testing:** Vitest + React Testing Library

## 2. State Management Rules (The "Nervous System")
* **Global State:** All application data (Roster, SummaryGroups, User Context) MUST be managed via `src/store/useNavfitStore.ts`.
* **No Redux / No Context for Data:** Do NOT use Redux. Do NOT use React Context for data flow (Context is reserved for UI themes/Scaling only).
* **Action-Based Updates:** State mutations must occur via defined actions in the Store (e.g., `updateSummaryGroup`, `commitOptimization`), never directly in components.
* **Computed State:** Use Zustand selectors or derived variables for computed values to prevent unnecessary re-renders.

## 3. Worker Protocol (The "Heavy Lifting")
* **Mandatory Offloading:** All RSCA calculations, genetic algorithms, and heavy mathematical redistributions MUST run in `src/features/strategy/workers/redistribution.worker.ts`.
* **Non-Blocking:** The main thread must never block for optimization tasks. Use `postMessage` / `onmessage` patterns.
* **Logic Isolation:** Worker logic resides in `workerLogic.ts` and strictly imports pure functions from `src/domain/`.

## 4. Business Logic & Policy (The "Law")
* **Source of Truth:** Logic must adhere strictly to `docs/bupers1610-policy-traceability.md`.
* **Conflict Resolution:** If the code contradicts the Policy Document, the CODE is wrong.
* **Domain Isolation:** Business rules (e.g., Quota math, Trait validation) must live in `src/domain/` or `src/features/strategy/logic/`. UI components should only display data, not calculate rules.
* **Rounding Rules:** Quota calculations (EP/MP limits) must strictly follow BUPERS rounding rules (typically `Math.ceil` for limits, unless specified otherwise in the traceability doc).

## 5. Anti-Patterns (Strictly Forbidden)
* **Ghost State:** Do not duplicate Store data into local `useState` unless it is strictly ephemeral UI state (e.g., form input before save).
* **Prop Drilling:** Do not pass props more than 2 layers deep. Use a Store selector instead.
* **useEffect Sync:** Avoid using `useEffect` to "sync" state props to internal state. Use derived state during render or Event Handlers.

## 6. Testing Standards
* **Tooling:** Vitest is the runner.
* **Mocking:** Web Workers must be mocked in test environments.
* **Coverage:** Logic in `src/domain/` requires high unit test coverage (Edge cases, Policy limits).
