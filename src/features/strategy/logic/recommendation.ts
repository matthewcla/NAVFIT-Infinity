import type { Report, SummaryGroup } from '@/types';
import { Paygrade, PromotionRecommendation, RankCategory } from '@/domain/policy/types';
import type { SummaryGroupContext } from '@/domain/policy/types';
import { computeEpMax, computeMpMax } from '@/domain/policy/quotas';
import { validateRecommendationAgainstTraits, validateEnsignLTJGCap } from '@/domain/policy/validation';
import { getCompetitiveCategory } from './competitiveGroupUtils';

/**
 * Maps UI paygrade string (e.g. "O-3") to Domain Paygrade (e.g. "O3").
 */
export function mapUiPaygradeToDomain(uiPaygrade?: string): Paygrade | null {
    if (!uiPaygrade) return null;
    const clean = uiPaygrade.replace('-', '');
    // Check if valid Paygrade key
    if (Object.values(Paygrade).includes(clean as Paygrade)) {
        return clean as Paygrade;
    }
    return null;
}

/**
 * Constructs the SummaryGroupContext from the UI SummaryGroup.
 * Uses getCompetitiveCategory for proper LDO/CWO detection based on designator patterns.
 */
export function getContextFromGroup(group: SummaryGroup): SummaryGroupContext | null {
    const paygrade = mapUiPaygradeToDomain(group.paygrade);
    if (!paygrade) return null;

    // Use proper competitive category logic for LDO/CWO detection
    const designator = group.designator || '';
    const category = getCompetitiveCategory(designator);

    // LDO includes both Active and Reserve LDO
    const isLDO = category.code === 'LDO_ACTIVE' || category.code === 'LDO_CWO_RESERVE';
    // CWO includes Active CWO and W paygrades
    const isCWO = category.code === 'CWO_ACTIVE' ||
        category.code === 'LDO_CWO_RESERVE' ||
        ['W1', 'W2', 'W3', 'W4', 'W5'].includes(paygrade);

    // Rank Category
    let rankCategory: RankCategory = RankCategory.OFFICER;
    if (paygrade.startsWith('E')) rankCategory = RankCategory.ENLISTED;
    if (paygrade.startsWith('W')) rankCategory = RankCategory.WARRANT;

    return {
        size: group.reports.length,
        paygrade,
        rankCategory,
        isLDO,
        isCWO
    };
}

/**
 * Checks if a specific recommendation is blocked by traits for a given report.
 */
function isBlocked(report: Report, rec: PromotionRecommendation, context: SummaryGroupContext): boolean {
    const traits = report.traitGrades || {};

    // 1. Check Trait Validation
    const traitViolations = validateRecommendationAgainstTraits(traits, rec, context);
    if (traitViolations.length > 0) {
        console.warn(`[BLOCK DEBUG] ${report.id} blocked for ${rec} due to traits:`, traitViolations);
        return true;
    }

    // 2. Check Rank/Paygrade specific caps (e.g. O1/O2)
    const capViolations = validateEnsignLTJGCap(context, rec);
    if (capViolations.length > 0) {
        console.warn(`[BLOCK DEBUG] ${report.id} blocked for ${rec} due to O1/O2 cap:`, capViolations);
        return true;
    }

    return false;
}

/**
 * Assigns EP/MP/P recommendations based on rank order and quotas.
 * Respects trait blocking rules.
 */
export function assignRecommendationsByRank(reports: Report[], group: SummaryGroup): Report[] {
    const context = getContextFromGroup(group);
    if (!context) {
        console.warn("Invalid group context for auto-assignment", group);
        return reports;
    }

    // We create a shallow copy of reports to modify
    let updatedReports = reports.map(r => ({ ...r }));

    // 1. Handle Locked Reports & Calculate Usage
    let lockedEPs = 0;
    let lockedMPs = 0;

    updatedReports.forEach(r => {
        if (r.isLocked) {
            // Special Case: Locked NOB should have 0.00 MTA
            if (r.promotionRecommendation === PromotionRecommendation.NOB && r.traitAverage > 0) {
                r.traitAverage = 0.00;
            }

            if (r.promotionRecommendation === PromotionRecommendation.EARLY_PROMOTE) lockedEPs++;
            if (r.promotionRecommendation === PromotionRecommendation.MUST_PROMOTE) lockedMPs++;
        }
    });

    // 2. Determine Scope for Assignment
    // NOB reports are excluded from summary group size for quota purposes
    // We also exclude reports explicitly flagged as notObservedReport, even if the recommendation is stale (e.g. 'P')
    const effectiveReports = updatedReports.filter(r =>
        r.promotionRecommendation !== PromotionRecommendation.NOB && !r.notObservedReport
    );
    const effectiveSize = effectiveReports.length;

    const epLimit = computeEpMax(effectiveSize, context);

    // 3. Identify Assignable Candidates (Unlocked, Non-NOB)
    const candidates = updatedReports.filter(r =>
        !r.isLocked &&
        r.promotionRecommendation !== PromotionRecommendation.NOB &&
        !r.notObservedReport
    );

    // 4. Reset all candidate recommendations to 'P' before re-assignment
    // This ensures the algorithm starts from a clean slate and properly enforces quotas.
    // Without this reset, pre-existing EP/MP recommendations would pass through unchanged
    // even when they exceed quota limits.
    for (const report of candidates) {
        report.promotionRecommendation = PromotionRecommendation.PROMOTABLE;
    }

    // 5. Sort Candidates by MTA Descending (Strict Merit)
    // Stable sort: keep original order if MTA is equal
    candidates.sort((a, b) => b.traitAverage - a.traitAverage);

    // 6. Assign EP
    let availableEP = Math.max(0, epLimit - lockedEPs);

    for (const report of candidates) {
        if (availableEP > 0) {
            if (!isBlocked(report, PromotionRecommendation.EARLY_PROMOTE, context)) {
                report.promotionRecommendation = PromotionRecommendation.EARLY_PROMOTE;
                availableEP--;
            } else {
                // Was not assigned EP due to block
                // Fallthrough to next candidate
            }
        }
    }

    // Recalculate Total EP Assigned (Locked + New)
    const totalEpAssigned = updatedReports.filter(r => r.promotionRecommendation === PromotionRecommendation.EARLY_PROMOTE).length;

    // 7. Assign MP
    // MP limit depends on Total EP assigned
    const mpLimit = computeMpMax(effectiveSize, context, totalEpAssigned);
    let availableMP = Math.max(0, mpLimit - lockedMPs);

    for (const report of candidates) {
        // Skip those who already got EP
        if (report.promotionRecommendation === PromotionRecommendation.EARLY_PROMOTE) continue;

        if (availableMP > 0) {
            if (!isBlocked(report, PromotionRecommendation.MUST_PROMOTE, context)) {
                report.promotionRecommendation = PromotionRecommendation.MUST_PROMOTE;
                availableMP--;
                continue;
            }
        }

        // Fallback: Promotable (or SP if blocked for P)
        if (!isBlocked(report, PromotionRecommendation.PROMOTABLE, context)) {
            report.promotionRecommendation = PromotionRecommendation.PROMOTABLE;
        } else {
            // Force SP if blocked for P
            if (report.promotionRecommendation !== PromotionRecommendation.SIGNIFICANT_PROBLEMS &&
                report.promotionRecommendation !== PromotionRecommendation.PROGRESSING) {
                report.promotionRecommendation = PromotionRecommendation.SIGNIFICANT_PROBLEMS;
            }
        }
    }

    // Return current array (mapped objects are already modified references)
    // Note: The original generic order is preserved because we modified objects within 'updatedReports' derived list.
    // Wait, reference issue: 'candidates' contains references to objects in 'updatedReports'. modifying candidate modifies updatedReport.
    // Yes, correctly implemented.

    return updatedReports;
}
