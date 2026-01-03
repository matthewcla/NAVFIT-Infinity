import { Paygrade, PromotionRecommendation, type SummaryGroupContext, type TraitGradeSet, type PolicyViolation, TraitId } from './types';

const EO_TRAIT_IDS = [TraitId.COMMAND_CLIMATE_EO, 'EO', 'CLIMATE']; // Handle variations if needed
const CHARACTER_TRAIT_IDS = [TraitId.MILITARY_BEARING_CHARACTER, 'CHARACTER'];

const isEO = (traitId: string) => EO_TRAIT_IDS.some(id => traitId.toUpperCase().includes(id) || traitId.toUpperCase() === 'EO' || traitId.toUpperCase() === 'CLIMATE');
const isCharacter = (traitId: string) => CHARACTER_TRAIT_IDS.some(id => traitId.toUpperCase().includes(id) || traitId.toUpperCase() === 'CHARACTER');

// Helpers for Paygrade
const isO1O2 = (p: Paygrade) => p === Paygrade.O1 || p === Paygrade.O2;

export function validateRecommendationAgainstTraits(
  traits: TraitGradeSet,
  rec: PromotionRecommendation,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  _context: SummaryGroupContext
): PolicyViolation[] {
  const violations: PolicyViolation[] = [];
  const grades = Object.values(traits);
  // const traitKeys = Object.keys(traits);

  // Any 1.0 blocks Promotable/MP/EP
  const has1_0 = grades.some(g => g === 1.0);
  if (has1_0 && ([PromotionRecommendation.PROMOTABLE, PromotionRecommendation.MUST_PROMOTE, PromotionRecommendation.EARLY_PROMOTE] as PromotionRecommendation[]).includes(rec)) {
    violations.push({
      code: 'BLOCKS_PROMOTABLE_PLUS_ON_1_0',
      message: 'Any trait grade of 1.0 prevents Promotable, Must Promote, or Early Promote recommendations.',
      severity: 'ERROR',
      affectedFields: ['recommendation', 'traits']
    });
  }

  // Any 2.0 blocks MP/EP
  const has2_0 = grades.some(g => g === 2.0);
  if (has2_0 && ([PromotionRecommendation.MUST_PROMOTE, PromotionRecommendation.EARLY_PROMOTE] as PromotionRecommendation[]).includes(rec)) {
    violations.push({
      code: 'BLOCKS_MP_EP_ON_2_0',
      message: 'Any trait grade of 2.0 prevents Must Promote or Early Promote recommendations.',
      severity: 'ERROR',
      affectedFields: ['recommendation', 'traits']
    });
  }

  // Promotable allows up to two 2.0 (excluding Character/EO)
  // Meaning if you have more than two 2.0s in OTHER traits, you can't be Promotable?
  // Or: "A Promotable recommendation... may not be assigned with any trait graded 1.0. A Must Promote or Early Promote... may not be assigned with any trait assessed as 2.0."
  // Wait, the prompt says: "Promotable allows up to two 2.0 (excluding Character/EO)".
  // This implies if you have 3 or more 2.0s, you can't be Promotable.
  // And "excluding Character/EO" implies Character/EO 2.0s might be treated differently or not count towards the "up to two".
  // Let's assume Character/EO rules are handled separately or stricter.
  // "Climate/EO must be >= 3.0" is a separate rule.

  let count2_0_non_restricted = 0;
  for (const [key, grade] of Object.entries(traits)) {
    if (grade === 2.0 && !isEO(key) && !isCharacter(key)) {
      count2_0_non_restricted++;
    }
  }

  if (rec === PromotionRecommendation.PROMOTABLE && count2_0_non_restricted > 2) {
    violations.push({
      code: 'MAX_TWO_2_0_FOR_PROMOTABLE',
      message: 'Promotable recommendation allows at most two 2.0 grades (excluding Character/EO).',
      severity: 'ERROR',
      affectedFields: ['recommendation', 'traits']
    });
  }

  // Also check if any grade is < 1.0 or > 5.0 just in case? Assuming valid inputs 1.0-5.0.

  // Climate/EO must be >= 3.0
  // "climate/EO must be >= 3.0" -> Applies to ALL recommendations? Or just Promotable+?
  // BUPERS 1610.10 says: "2.0 in Command or Organizational Climate/Equal Opportunity or Character... requires a recommendation of Significant Problems."
  // So if Climate/EO < 3.0 (i.e. 1.0 or 2.0), Rec MUST be Significant Problems (or NOB?).
  // If Rec is NOT Significant Problems (and not NOB), and EO < 3.0, it's a violation.

  // Let's find the EO trait grade.
  for (const [key, grade] of Object.entries(traits)) {
    if (isEO(key) && grade < 3.0) {
      // If grade < 3.0, Rec MUST be SP. (NOB doesn't have grades usually, but if it did...)
      if (rec !== PromotionRecommendation.SIGNIFICANT_PROBLEMS && rec !== PromotionRecommendation.NOB) {
        violations.push({
          code: 'EO_MUST_BE_3_0_OR_SP',
          message: 'Command Climate/Equal Opportunity grade below 3.0 requires a Significant Problems recommendation.',
          severity: 'ERROR',
          affectedFields: ['recommendation', key]
        });
      }
    }
  }

  return violations;
}

export function validateNOBJustification(isPartialNOB: boolean, justificationText?: string): PolicyViolation[] {
  const violations: PolicyViolation[] = [];
  if (isPartialNOB && (!justificationText || justificationText.trim().length === 0)) {
    violations.push({
      code: 'NOB_REQUIRES_JUSTIFICATION',
      message: 'Partial NOB evaluations require justification text.',
      severity: 'ERROR',
      affectedFields: ['justification']
    });
  }
  return violations;
}

export function validateEnsignLTJGCap(context: SummaryGroupContext, rec: PromotionRecommendation): PolicyViolation[] {
  const violations: PolicyViolation[] = [];
  // Ensign (O1) and LTJG (O2)
  if (isO1O2(context.paygrade) && !context.isLDO) {
    if (([PromotionRecommendation.MUST_PROMOTE, PromotionRecommendation.EARLY_PROMOTE] as PromotionRecommendation[]).includes(rec)) {
      violations.push({
        code: 'O1_O2_MAX_PROMOTABLE',
        message: 'Ensign and LTJG (non-LDO) cannot receive higher than Promotable.',
        severity: 'ERROR',
        affectedFields: ['recommendation']
      });
    }
  }
  return violations;
}

export function validateSignificantProblemsWithdrawal(
  previousRec: PromotionRecommendation | null,
  newRec: PromotionRecommendation,
  withdrawalRecorded: boolean
): PolicyViolation[] {
  const violations: PolicyViolation[] = [];

  const promotableOrHigher = [
    PromotionRecommendation.PROMOTABLE,
    PromotionRecommendation.MUST_PROMOTE,
    PromotionRecommendation.EARLY_PROMOTE
  ] as PromotionRecommendation[];

  const isPreviousPromotableOrHigher = previousRec && promotableOrHigher.includes(previousRec);

  if (isPreviousPromotableOrHigher && newRec === PromotionRecommendation.SIGNIFICANT_PROBLEMS) {
    if (!withdrawalRecorded) {
      violations.push({
        code: 'SP_REQUIRES_WITHDRAWAL',
        message: 'A Significant Problems recommendation following a previous Promotable or higher recommendation requires a formal withdrawal.',
        severity: 'ERROR',
        affectedFields: ['withdrawalRecorded', 'recommendation']
      });
    }
  }

  return violations;
}
