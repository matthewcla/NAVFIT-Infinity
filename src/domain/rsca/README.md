# RSCA Redistribution Algorithm

This module implements a redistribution engine for Reporting Senior Cumulative Average (RSCA) management. It ensures that Member Trait Averages (MTAs) are assigned such that:

1.  **Monotonicity**: Rank 1 >= Rank 2 >= ... >= Rank N.
2.  **Anchors**: Specific members can have fixed MTA values.
3.  **Bounds**: All MTAs are within [L, H].
4.  **Target RSCA**: The mean of all MTAs falls within a target band [Min, Max].

## Algorithm Overview

The engine uses a combination of **Bounded Isotonic Regression (PAVA)** and **Iterative Mean-Shift**.

### 1. Feasibility Detection
Before redistributing, the engine checks if the target RSCA is mathematically achievable given the constraints.
-   **Pass 1 (Min)**: Sets all non-anchors to Lower Bound `L`, runs PAVA with anchors, computes `MinMean`.
-   **Pass 2 (Max)**: Sets all non-anchors to Upper Bound `H`, runs PAVA with anchors, computes `MaxMean`.
-   If the target RSCA band does not intersect `[MinMean, MaxMean]`, the request is infeasible.

### 2. Core Redistribution Loop
1.  Initialize MTAs (using baseline or current values).
2.  Apply fixed anchor values.
3.  Run **Bounded Isotonic Regression with Anchors**:
    -   Splits the problem into segments between anchors.
    -   Runs PAVA (Pool Adjacent Violators Algorithm) on each segment.
    -   Clamps values to bounds implied by anchors (e.g., between Anchor A and Anchor B, values must be `<= A` and `>= B`).
4.  Iterate:
    -   Calculate current RSCA.
    -   Calculate `TotalDelta` needed to reach target RSCA.
    -   Distribute `TotalDelta` to non-anchor members (weighted).
    -   Re-run Bounded Isotonic Regression to restore monotonicity.
    -   Repeat until convergence or max iterations.

### Complexity
-   **Time Complexity**: `O(K * N)`, where `N` is number of members and `K` is number of iterations (typically small, < 50). PAVA is `O(N)`.
-   **Space Complexity**: `O(N)`.
