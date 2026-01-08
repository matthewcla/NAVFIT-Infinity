# BUPERS 1610 Policy Traceability

This document maps BUPERS 1610 policy rules to the current codebase, identifying implementation locations, gaps, and required tests.

## 1. Summary Group Creation (Competitive Groups)

**Policy:**
*   **Officer Competitive Categories:**
    *   Unrestricted Line (URL): 11xx / 13xx / 19xx
    *   Restricted Line (RL): 12xx / 14xx / 15xx / 16xx / 17xx / 18xx
    *   Staff Corps: 210x, 220x, 230x, 250x, 270x, 290x, 310x, 410x, 510x
    *   LDO (Line): 61xx / 62xx / 63xx / 64xx
    *   LDO (Staff): 65xx
    *   CWO: 7xxx
*   **Enlisted:**
    *   Grouped by Duty Status (ACT vs FTS/Res) and Paygrade.

**Codebase Status:**

| Policy Rule | Implementation | Gap/Observation | Test Plan |
| :--- | :--- | :--- | :--- |
| **URL Grouping** | `src/features/strategy/logic/reportGenerator.ts` <br> `getCompetitiveGroup` function maps 11xx, 13xx to 'URL'. | `19xx` is missing from the explicit check. | `it('should group 19xx designators as URL')` |
| **RL Grouping** | `src/features/strategy/logic/reportGenerator.ts` <br> Maps 12xx, 18xx to 'RL'. | Missing codes: 14xx, 15xx, 16xx, 17xx. | `it('should group all RL designators (14xx-18xx) as RL')` |
| **Staff Corps** | `src/features/strategy/logic/reportGenerator.ts` <br> Defaults to 'STAFF'. | Does not separate different Staff Corps (e.g., Medical vs Supply). Policy implies they are distinct competitive categories. | `it('should create separate groups for different Staff Corps (e.g. Supply vs Medical)')` |
| **Enlisted Duty Status** | `src/features/strategy/logic/reportGenerator.ts` <br> `getCompetitiveGroup` | **MISSING**. Currently groups only by Rank (Paygrade). Does not use `dutyStatus` from Member/Report. | `it('should separate Active Duty and Reservist Enlisted members into different groups')` |

**Files to Modify:**
*   `src/features/strategy/logic/reportGenerator.ts`

---

## 2. Quota Logic (EP/MP Limits)

**Policy:**
*   **EP Limit:** Max 20% of summary group, **rounded up**.
*   **EP + MP Limit:** Max 60% (most grades), **rounded up**.
*   **Small Groups:** Summary groups of two may receive one EP and one MP.
*   **Paygrade Variances:** E1-E4 have no limits. E7-E9/W3-W5/O4 have 50% MP limit.

**Codebase Status:**

| Policy Rule | Implementation | Gap/Observation | Test Plan |
| :--- | :--- | :--- | :--- |
| **EP 20% Limit** | `src/features/strategy/logic/validation.ts` <br> `checkQuota` uses `Math.round`. <br> `safeguards.ts` uses `Math.floor`. | **INCORRECT ROUNDING**. Must use `Math.ceil`. | `it('should allow 1 EP for a group of 1 (0.2 -> 1)')` |
| **EP+MP 60% Limit** | `src/features/strategy/logic/validation.ts` <br> `checkQuota` uses `Math.round`. | **INCORRECT ROUNDING**. Must use `Math.ceil`. | `it('should allow 3 EP+MP for a group of 4 (2.4 -> 3)')` |
| **Small Group (Size 2)** | None. | **MISSING**. Code treats size 2 with standard math (2 * 0.2 = 0.4 -> round(0) or ceil(1)). 2 * 0.6 = 1.2 -> ceil(2). Standard math might work if ceil is used, but specific exception "1 EP and 1 MP" should be verified. | `it('should allow 1 EP and 1 MP for a summary group of 2')` |
| **Paygrade Variances** | None. | **MISSING**. `checkQuota` applies flat 20%/60% to all. Needs to accept Paygrade to determine limits (e.g. E1-E4 unlimited). | `it('should return valid for E1-E4 regardless of quota counts')` |

**Files to Modify:**
*   `src/features/strategy/logic/validation.ts`
*   `src/features/strategy/logic/safeguards.ts`

---

## 3. Promotion Recommendations & Validation

**Policy:**
*   **1.0 Trait Grade:** Member cannot receive Promotable, MP, or EP.
*   **2.0 Trait Grade:** Member cannot receive MP or EP.
*   **Ensign/LTJG:** Limited to Promotable (except LDO).
*   **NOB:** Permitted if appropriate (short period).
*   **Significant Problems (SP):** Requires justification. Withdraws advancement rec.

**Codebase Status:**

| Policy Rule | Implementation | Gap/Observation | Test Plan |
| :--- | :--- | :--- | :--- |
| **1.0 Trait Logic** | `src/features/strategy/logic/reportLogic.ts` <br> `checkAdverseConditions` detects 1.0. | `validation.ts` does NOT prevent 'P'/'MP'/'EP' assignment if 1.0 exists. | `it('should return invalid if PromRec is > Prog and trait 1.0 exists')` |
| **2.0 Trait Logic** | None. | **MISSING**. No check preventing MP/EP if a 2.0 grade exists. | `it('should return invalid if PromRec is MP/EP and trait 2.0 exists')` |
| **Ensign/LTJG Cap** | None. | **MISSING**. O-1/O-2 (non-LDO) should be capped at Promotable. | `it('should flag error if O-1/O-2 receives MP or EP (unless LDO)')` |
| **SP Justification** | `src/features/strategy/logic/reportLogic.ts` <br> `checkAdverseConditions` checks for SP. | No programmatic check for comment length or content. | `it('should warn if SP report has empty comments')` |

**Files to Modify:**
*   `src/features/strategy/logic/validation.ts`
*   `src/features/strategy/logic/reportLogic.ts`

---

## 4. Summary

The current codebase has the basic infrastructure (Reports, Members, SummaryGroups) but lacks specific BUPERS 1610 business logic rules, particularly regarding:
1.  **Rounding Logic:** `Math.ceil` is required for quotas.
2.  **Competitive Categories:** Nuanced grouping for Staff Corps and Enlisted Duty Status is missing.
3.  **Paygrade Logic:** Quota limits are currently hardcoded to 20%/60% globally, ignoring paygrade-specific tables (Table 1-2).
4.  **Grade Restrictions:** Logic to prevent EP/MP based on individual trait grades (1.0/2.0) or Rank (O-1/O-2) is not enforced in validation.
