export const PromotionRecommendation = {
  NOB: 'NOB',
  SIGNIFICANT_PROBLEMS: 'SP',
  PROGRESSING: 'Prog',
  PROMOTABLE: 'P',
  MUST_PROMOTE: 'MP',
  EARLY_PROMOTE: 'EP',
} as const;
export type PromotionRecommendation = typeof PromotionRecommendation[keyof typeof PromotionRecommendation];

export const Paygrade = {
  E1: 'E1', E2: 'E2', E3: 'E3', E4: 'E4', E5: 'E5', E6: 'E6', E7: 'E7', E8: 'E8', E9: 'E9',
  W1: 'W1', W2: 'W2', W3: 'W3', W4: 'W4', W5: 'W5',
  O1: 'O1', O2: 'O2', O3: 'O3', O4: 'O4', O5: 'O5', O6: 'O6', O7: 'O7', O8: 'O8', O9: 'O9', O10: 'O10'
} as const;
export type Paygrade = typeof Paygrade[keyof typeof Paygrade];

export const RankCategory = {
  ENLISTED: 'ENLISTED',
  OFFICER: 'OFFICER',
  WARRANT: 'WARRANT' // Often grouped with Officers, but distinct for CWO flags
} as const;
export type RankCategory = typeof RankCategory[keyof typeof RankCategory];

export interface SummaryGroupContext {
  size: number;
  paygrade: Paygrade;
  rankCategory: RankCategory;
  isLDO: boolean;
  isCWO: boolean;
  // Additional context can be added here
}

export const TraitId = {
  PROFESSIONAL_KNOWLEDGE: 'PROFESSIONAL_KNOWLEDGE',
  LEADERSHIP: 'LEADERSHIP',
  MILITARY_BEARING_CHARACTER: 'MILITARY_BEARING_CHARACTER', // Character
  COMMAND_CLIMATE_EO: 'COMMAND_CLIMATE_EO', // EO
  TEAMWORK: 'TEAMWORK',
  SENIOR_LEADERSHIP: 'SENIOR_LEADERSHIP',
  MISSION_ACCOMPLISHMENT: 'MISSION_ACCOMPLISHMENT', // Example
} as const;
export type TraitId = typeof TraitId[keyof typeof TraitId];

export type TraitGradeSet = Record<string, number>; // key is TraitId or string

export interface PolicyViolation {
  code: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
  affectedFields: string[];
}
