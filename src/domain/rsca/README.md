# RSCA Redistribution Algorithm

## Overview
The RSCA redistribution engine calculates Member Trait Averages (MTA) for a rank-ordered list of members, subject to strict constraints:
1.  **Monotonicity**: MTA must be non-increasing with rank (Rank 1 >= Rank 2 >= ...).
2.  **Anchors**: Specific members may have fixed MTA values.
3.  **Global Bounds**: All MTAs must fall within a defined range $[L, H]$.
4.  **Target RSCA**: The weighted average of MTAs must match a target value (or fall within a band).

## Algorithm
The solution utilizes an **Iterative Mean-Shift with Bounded Isotonic Regression**:

1.  **Feasibility Check**:
    *   Compute the minimum possible RSCA by initializing non-anchors to $L$ and running regression.
    *   Compute the maximum possible RSCA by initializing non-anchors to $H$ and running regression.
    *   If the target band does not overlap with $[RSCA_{min}, RSCA_{max}]$, the configuration is infeasible.

2.  **Iterative Solver**:
    *   Initialize MTAs with current values or a baseline.
    *   Loop (until convergence):
        1.  **Bounded Isotonic Regression (PAVA)**:
            *   The problem is decomposed into segments separated by anchors.
            *   For each segment, a standard **Pool Adjacent Violators Algorithm (PAVA)** is run to enforce monotonicity.
            *   The result is clipped to the effective bounds imposed by neighboring anchors and global limits.
        2.  **Check RSCA**: Calculate the weighted mean of the resulting vector.
        3.  **Mean Shift**: If the mean differs from the target, a uniform shift $\Delta = \mu_{target} - \mu_{current}$ is applied to the *inputs* of the non-anchor members.
        4.  **Repeat**: The shifted inputs are fed back into the bounded regression.

## Complexity
*   **Time Complexity**: $O(K \cdot N)$, where $N$ is the number of members and $K$ is the number of iterations (typically < 10). The PAVA step is $O(N)$.
*   **Space Complexity**: $O(N)$ to store member data and auxiliary arrays.
*   **Performance**: Capable of processing N=300 in < 1ms in modern environments, meeting the < 16ms frame budget.
