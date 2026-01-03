import { describe, it, expect } from 'vitest';
import {
  validateRecommendationAgainstTraits,
  validateNOBJustification,
  validateEnsignLTJGCap,
  validateSignificantProblemsWithdrawal
} from './validation';
import {
  PromotionRecommendation,
  Paygrade,
  TraitId,
  SummaryGroupContext,
  RankCategory
} from './types';

describe('BUPERS 1610 Policy Validation', () => {

  const baseContext: SummaryGroupContext = {
    size: 1,
    paygrade: Paygrade.E5,
    rankCategory: RankCategory.ENLISTED,
    isLDO: false,
    isCWO: false
  };

  describe('validateRecommendationAgainstTraits', () => {
    it('blocks Promotable/MP/EP if any trait is 1.0', () => {
      const traits = { [TraitId.PROFESSIONAL_KNOWLEDGE]: 1.0, [TraitId.LEADERSHIP]: 3.0 };
      const recs = [PromotionRecommendation.PROMOTABLE, PromotionRecommendation.MUST_PROMOTE, PromotionRecommendation.EARLY_PROMOTE];

      recs.forEach(rec => {
        const violations = validateRecommendationAgainstTraits(traits, rec, baseContext);
        expect(violations).toHaveLength(1);
        expect(violations[0].code).toBe('BLOCKS_PROMOTABLE_PLUS_ON_1_0');
      });

      // Should allow NOB or SP
      expect(validateRecommendationAgainstTraits(traits, PromotionRecommendation.SIGNIFICANT_PROBLEMS, baseContext)).toHaveLength(0);
    });

    it('blocks MP/EP if any trait is 2.0', () => {
      const traits = { [TraitId.PROFESSIONAL_KNOWLEDGE]: 2.0, [TraitId.LEADERSHIP]: 3.0 };
      const recs = [PromotionRecommendation.MUST_PROMOTE, PromotionRecommendation.EARLY_PROMOTE];

      recs.forEach(rec => {
        const violations = validateRecommendationAgainstTraits(traits, rec, baseContext);
        expect(violations).toHaveLength(1);
        expect(violations[0].code).toBe('BLOCKS_MP_EP_ON_2_0');
      });

      // Should allow Promotable (if count <= 2) or SP
      expect(validateRecommendationAgainstTraits(traits, PromotionRecommendation.PROMOTABLE, baseContext)).toHaveLength(0);
    });

    it('blocks Promotable if more than two 2.0 traits (excluding EO/Character)', () => {
      const traits = {
        [TraitId.PROFESSIONAL_KNOWLEDGE]: 2.0,
        [TraitId.LEADERSHIP]: 2.0,
        [TraitId.TEAMWORK]: 2.0,
        [TraitId.COMMAND_CLIMATE_EO]: 3.0
      };

      const violations = validateRecommendationAgainstTraits(traits, PromotionRecommendation.PROMOTABLE, baseContext);
      expect(violations).toHaveLength(1);
      expect(violations[0].code).toBe('MAX_TWO_2_0_FOR_PROMOTABLE');
    });

    it('allows Promotable with two 2.0 traits', () => {
      const traits = {
        [TraitId.PROFESSIONAL_KNOWLEDGE]: 2.0,
        [TraitId.LEADERSHIP]: 2.0,
        [TraitId.TEAMWORK]: 3.0
      };
      const violations = validateRecommendationAgainstTraits(traits, PromotionRecommendation.PROMOTABLE, baseContext);
      expect(violations).toHaveLength(0);
    });

    it('requires SP if Climate/EO is < 3.0', () => {
      const traits = { [TraitId.COMMAND_CLIMATE_EO]: 2.0, [TraitId.LEADERSHIP]: 3.0 };

      // If Rec is Promotable, it fails
      const violations = validateRecommendationAgainstTraits(traits, PromotionRecommendation.PROMOTABLE, baseContext);
      // It might fail multiple rules (2.0 blocks MP/EP, but here we test the specific EO rule or if it blocks Promotable via general rules?)
      // Wait, 2.0 blocks MP/EP, but allows Promotable generally.
      // But EO < 3.0 SPECIFICALLY requires SP.
      expect(violations.some(v => v.code === 'EO_MUST_BE_3_0_OR_SP')).toBe(true);

      // If Rec is SP, it passes
      expect(validateRecommendationAgainstTraits(traits, PromotionRecommendation.SIGNIFICANT_PROBLEMS, baseContext)).toHaveLength(0);
    });
  });

  describe('validateNOBJustification', () => {
    it('requires justification if partial NOB', () => {
      expect(validateNOBJustification(true, '')).toHaveLength(1);
      expect(validateNOBJustification(true, '   ')).toHaveLength(1);
      expect(validateNOBJustification(true, 'Valid reason')).toHaveLength(0);
    });

    it('passes if not partial NOB', () => {
      expect(validateNOBJustification(false, '')).toHaveLength(0);
    });
  });

  describe('validateEnsignLTJGCap', () => {
    it('blocks MP/EP for O1/O2 non-LDO', () => {
      const contextO1: SummaryGroupContext = { ...baseContext, paygrade: Paygrade.O1, isLDO: false };

      expect(validateEnsignLTJGCap(contextO1, PromotionRecommendation.MUST_PROMOTE)).toHaveLength(1);
      expect(validateEnsignLTJGCap(contextO1, PromotionRecommendation.EARLY_PROMOTE)).toHaveLength(1);
      expect(validateEnsignLTJGCap(contextO1, PromotionRecommendation.PROMOTABLE)).toHaveLength(0);
    });

    it('allows MP/EP for LDO O1/O2', () => {
      const contextO1LDO: SummaryGroupContext = { ...baseContext, paygrade: Paygrade.O1, isLDO: true };
      expect(validateEnsignLTJGCap(contextO1LDO, PromotionRecommendation.MUST_PROMOTE)).toHaveLength(0);
    });

    it('allows MP/EP for O3+', () => {
      const contextO3: SummaryGroupContext = { ...baseContext, paygrade: Paygrade.O3, isLDO: false };
      expect(validateEnsignLTJGCap(contextO3, PromotionRecommendation.EARLY_PROMOTE)).toHaveLength(0);
    });
  });

  describe('validateSignificantProblemsWithdrawal', () => {
    it('requires withdrawalRecorded if moving from Promotable+ to SP', () => {
      expect(validateSignificantProblemsWithdrawal(
        PromotionRecommendation.PROMOTABLE,
        PromotionRecommendation.SIGNIFICANT_PROBLEMS,
        false
      )).toHaveLength(1);

      expect(validateSignificantProblemsWithdrawal(
        PromotionRecommendation.PROMOTABLE,
        PromotionRecommendation.SIGNIFICANT_PROBLEMS,
        true
      )).toHaveLength(0);
    });

    it('does not require withdrawalRecorded if previous was not Promotable+', () => {
      expect(validateSignificantProblemsWithdrawal(
        PromotionRecommendation.NOB,
        PromotionRecommendation.SIGNIFICANT_PROBLEMS,
        false
      )).toHaveLength(0);

      expect(validateSignificantProblemsWithdrawal(
        null,
        PromotionRecommendation.SIGNIFICANT_PROBLEMS,
        false
      )).toHaveLength(0);
    });
  });

});
