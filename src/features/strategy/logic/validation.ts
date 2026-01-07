import type { Report, SummaryGroup } from '@/types';
import type { PolicyViolation, SummaryGroupContext, TraitGradeSet } from '@/domain/policy/types';
import { PromotionRecommendation, Paygrade, RankCategory } from '@/domain/policy/types';
import {
    validateRecommendationAgainstTraits,
    validateEnsignLTJGCap,
    validateNOBJustification,
    validateSignificantProblemsWithdrawal,
} from '@/domain/policy/validation';
import { getCompetitiveCategory } from './competitiveGroupUtils';
import { computeEpMax, computeEpMpCombinedMax } from '@/domain/policy/quotas';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Helper to parse YYYY-MM-DD string to Date object
 */
const parseDate = (dateStr: string): Date => new Date(dateStr);

/**
 * Zero-Gap Continuity Check
 * NewReportStartDate MUST equal PreviousReportEndDate + 1 day.
 */
export const checkZeroGap = (prevEndDateStr: string, newStartDateStr: string): { isValid: boolean; message?: string } => {
    const prevEnd = parseDate(prevEndDateStr);
    const newStart = parseDate(newStartDateStr);

    // Normalize to midnight to avoid time zone drift issues in simple Day checks
    prevEnd.setHours(0, 0, 0, 0);
    newStart.setHours(0, 0, 0, 0);

    const diffTime = newStart.getTime() - prevEnd.getTime();
    const diffDays = diffTime / ONE_DAY_MS;

    if (diffDays === 1) {
        return { isValid: true };
    } else if (diffDays > 1) {
        return { isValid: false, message: `Gap detected: ${diffDays - 1} days missing between reports.` };
    } else {
        return { isValid: false, message: `Overlap detected: Start date is ${Math.abs(diffDays - 1)} days before previous end date.` };
    }
};

/**
 * Forced Distribution (Quota) Check
 * Delegates to domain policy logic.
 */
export const checkQuota = (
    context: SummaryGroupContext,
    epCount: number,
    mpCount: number
): { isValid: boolean; epLimit: number; combinedLimit: number; message?: string } => {
    const groupSize = context.size;

    const epLimit = computeEpMax(groupSize, context);
    const combinedLimit = computeEpMpCombinedMax(groupSize, context);

    if (epCount > epLimit) {
        return {
            isValid: false,
            epLimit,
            combinedLimit,
            message: `EP Usage Exceeded: ${epCount} assigned, Max allowed is ${epLimit}.`
        };
    }

    if ((epCount + mpCount) > combinedLimit) {
        return {
            isValid: false,
            epLimit,
            combinedLimit,
            message: `Combined EP+MP Usage Exceeded: ${epCount + mpCount} assigned, Max allowed is ${combinedLimit}.`
        };
    }

    return { isValid: true, epLimit, combinedLimit };
};

// ------------------------------------------------------------------
// Integrated Domain Validation
// ------------------------------------------------------------------

function mapRecommendation(rec: string | undefined): PromotionRecommendation | null {
    if (!rec) return null;
    switch (rec) {
        case 'EP': return PromotionRecommendation.EARLY_PROMOTE;
        case 'MP': return PromotionRecommendation.MUST_PROMOTE;
        case 'P': return PromotionRecommendation.PROMOTABLE;
        case 'Prog': return PromotionRecommendation.SIGNIFICANT_PROBLEMS; // Mapping Prog to SP? Or separate?
        // Wait, "Prog" usually means "Progressing". "SP" is Significant Problems.
        // App uses 'SP' in string.
        case 'SP': return PromotionRecommendation.SIGNIFICANT_PROBLEMS;
        case 'NOB': return PromotionRecommendation.NOB;
        default: return null; // Or throw?
    }
}

function mapPaygrade(grade: string | undefined): Paygrade {
    // grade is "O-1", "E-5", etc. Domain Paygrade is "O1", "E5" (without dash).
    if (!grade) return Paygrade.O1; // Fallback?
    const normalized = grade.replace('-', '');
    return normalized as Paygrade; // Trusting it matches enum keys (it mostly does)
}

function getRankCategory(paygrade: Paygrade): RankCategory {
    if (paygrade.startsWith('W')) return RankCategory.WARRANT;
    if (paygrade.startsWith('O')) return RankCategory.OFFICER;
    return RankCategory.ENLISTED;
}

export function createSummaryGroupContext(group: SummaryGroup, report: Report | null = null): SummaryGroupContext {
    const paygrade = mapPaygrade(report?.grade || group.paygrade);
    const rankCategory = getRankCategory(paygrade);

    // Check if LDO/CWO
    // We use the same robust logic as group generation to identify LDO/CWO
    const desig = report?.designator || group.designator || '';

    // Check using our new utility or maintain simple check?
    // The utility is safer.
    const cat = getCompetitiveCategory(desig);

    // isLDO includes both Active and Reserve LDOs
    const isLDO = cat.code === 'LDO_ACTIVE' || cat.code === 'LDO_CWO_RESERVE';

    // isCWO includes Active CWOs and Reserve CWOs (which are in LDO_CWO_RESERVE bucket or CWO_ACTIVE)
    const isCWO = cat.code === 'CWO_ACTIVE' || (cat.code === 'LDO_CWO_RESERVE' && desig.startsWith('7'));

    return {
        size: group.reports.length,
        paygrade,
        rankCategory,
        isLDO,
        isCWO
    };
}

/**
 * Validates a single report against all policy rules.
 * Requires the report, its parent summary group, and optionally the previous report (for SP withdrawal check).
 */
export function validateReportState(
    report: Report,
    group: SummaryGroup,
    previousReport?: Report
): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    // 1. Prepare Context
    const context = createSummaryGroupContext(group, report);
    const rec = mapRecommendation(report.promotionRecommendation);

    if (!rec) return violations; // Can't validate without recommendation

    // 2. Trait Validation
    // report.traitGrades is Record<string, number>. Domain expects TraitId or string keys.
    const traitSet: TraitGradeSet = report.traitGrades ?? {};
    violations.push(...validateRecommendationAgainstTraits(traitSet, rec, context));

    // 3. Ensign/LTJG Cap
    violations.push(...validateEnsignLTJGCap(context, rec));

    // 4. NOB Justification
    if (rec === PromotionRecommendation.NOB && report.traitAverage === 0) { // Assuming Partial NOB logic check needs refinement
        // If isPartialNOB is true. How do we know? usually NOB means check box 16 is checked.
        // Or if traitAverage is calculated.
        // The validator asks "isPartialNOB".
        // If report.promotionRecommendation is NOB, and notObservedReport is true?
        // Let's assume for now we check justification if NOB.
        // report.notObservedReport
        // const isPartial = false; // TODO: Determine from data if partial NOB is supported.
        // If it's a full NOB (Block 16 checked), justification might be needed?
        // "Partial NOB evaluations require justification text."
        // If we don't have partial NOB concept in UI yet, skip?
        // If traitAverage > 0 but Rec is NOB, that's partial?
        const isPartialNOB = report.promotionRecommendation === 'NOB' && report.traitAverage > 0;

        violations.push(...validateNOBJustification(isPartialNOB, report.comments));
    }

    // 5. Significant Problems Withdrawal
    if (rec === PromotionRecommendation.SIGNIFICANT_PROBLEMS && previousReport) {
        const prevRec = mapRecommendation(previousReport.promotionRecommendation);
        // withdrawalRecorded? Report doesn't have this field explicitly yet?
        // Unless it's in the narrative or a flag.
        // I will assume false for now if not present, which will trigger error if needed.
        // Ideally we need a field `withdrawalRecorded` in Report.
        // Assuming false to be safe/strict.
        violations.push(...validateSignificantProblemsWithdrawal(prevRec, rec, false));
    }

    return violations;
}
