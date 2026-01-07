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

    // DEBUG: Log context to trace O-1/O-2 EP blocking issue
    console.warn('[EP DEBUG] assignRecommendationsByRank called:', {
        groupPaygrade: group.paygrade,
        groupDesignator: group.designator,
        contextPaygrade: context.paygrade,
        isLDO: context.isLDO,
        isCWO: context.isCWO,
        reportsCount: reports.length
    });

    // Calculate Max Quotas
    const totalReports = reports.length;
    const epLimit = computeEpMax(totalReports, context);

    // console.log(`Assigning Recs. Group Size: ${totalReports}, Paygrade: ${context.paygrade}, EP Limit: ${epLimit}`);

    let epAssigned = 0;
    let mpAssigned = 0;

    // We create a shallow copy of reports to modify
    const updatedReports = reports.map(r => ({ ...r }));

    // First Pass: Assign EP
    for (let i = 0; i < updatedReports.length; i++) {
        const report = updatedReports[i];

        if (report.promotionRecommendation === PromotionRecommendation.NOB) continue;

        // Attempt EP
        if (epAssigned < epLimit) {
            if (!isBlocked(report, PromotionRecommendation.EARLY_PROMOTE, context)) {
                report.promotionRecommendation = PromotionRecommendation.EARLY_PROMOTE;
                epAssigned++;
                continue;
            }
        }
    }

    // Calculate MP Limit
    const mpLimit = computeMpMax(totalReports, context, epAssigned);
    // console.log(`MP Limit: ${mpLimit} (EP Used: ${epAssigned})`);

    // Second Pass: Assign MP (to those who didn't get EP)
    for (let i = 0; i < updatedReports.length; i++) {
        const report = updatedReports[i];

        if (report.promotionRecommendation === PromotionRecommendation.NOB) continue;
        if (report.promotionRecommendation === PromotionRecommendation.EARLY_PROMOTE) continue; // Already assigned

        // Attempt MP
        if (mpAssigned < mpLimit) {
            if (!isBlocked(report, PromotionRecommendation.MUST_PROMOTE, context)) {
                report.promotionRecommendation = PromotionRecommendation.MUST_PROMOTE;
                mpAssigned++;
                continue;
            }
        }

        // Fallback: Promotable (or Prog/SP if blocked?)
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

    return updatedReports;
}
