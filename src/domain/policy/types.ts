export enum PromotionRecommendation {
  NOB = 'NOB',
  SIGNIFICANT_PROBLEMS = 'SIGNIFICANT_PROBLEMS',
  PROMOTABLE = 'PROMOTABLE',
  MUST_PROMOTE = 'MP',
  EARLY_PROMOTE = 'EP',
}

export enum Paygrade {
  E1 = 'E1', E2 = 'E2', E3 = 'E3', E4 = 'E4', E5 = 'E5', E6 = 'E6', E7 = 'E7', E8 = 'E8', E9 = 'E9',
  W1 = 'W1', W2 = 'W2', W3 = 'W3', W4 = 'W4', W5 = 'W5',
  O1 = 'O1', O2 = 'O2', O3 = 'O3', O4 = 'O4', O5 = 'O5', O6 = 'O6', O7 = 'O7', O8 = 'O8', O9 = 'O9', O10 = 'O10'
}

export enum RankCategory {
  ENLISTED = 'ENLISTED',
  OFFICER = 'OFFICER',
  WARRANT = 'WARRANT' // Often grouped with Officers, but distinct for CWO flags
}

export interface SummaryGroupContext {
  size: number;
  paygrade: Paygrade;
  rankCategory: RankCategory;
  isLDO: boolean;
  isCWO: boolean;
  // Additional context can be added here
}

export enum TraitId {
  PROFESSIONAL_KNOWLEDGE = 'PROFESSIONAL_KNOWLEDGE',
  LEADERSHIP = 'LEADERSHIP',
  MILITARY_BEARING_CHARACTER = 'MILITARY_BEARING_CHARACTER', // Character
  COMMAND_CLIMATE_EO = 'COMMAND_CLIMATE_EO', // EO
  TEAMWORK = 'TEAMWORK',
  SENIOR_LEADERSHIP = 'SENIOR_LEADERSHIP',
  MISSION_ACCOMPLISHMENT = 'MISSION_ACCOMPLISHMENT', // Example
}

export type TraitGradeSet = Record<string, number>; // key is TraitId or string

export interface PolicyViolation {
  code: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
  affectedFields: string[];
}
