// Types specific to the redistribution engine - Member is defined locally below

// Types specific to the redistribution engine

export interface AlgorithmParams {
  delta: number;           // baseline slope
  p: number;               // baseline exponent (1..1.5)
  alpha: number;           // weight boost near anchors
  tau: number;             // decay distance
  lambdaSmooth?: number;    // optional (used if you extend beyond isotonic)
}

export interface RedistributionEngineResult {
  mtaVector: number[];
  finalRSCA: number;
  isFeasible: boolean;
  deltas: number[];
  explanation: string;
  diagnostics?: {
    meanMin: number;
    meanMax: number;
    band: { muMin: number; muMax: number };
    iterations?: number;
    suggestedAnchorEdits?: Array<{ id: string; suggestedMta: number; note: string }>;
  };
  changedMembers?: ChangedMember[];
  reasonCodes?: RedistributionReasonCode[];
  infeasibilityReport?: InfeasibilityReport;
}

export const RedistributionReasonCode = {
  ANCHOR_CONSTRAINT: 'ANCHOR_CONSTRAINT',
  RSCA_BAND_ENFORCED: 'RSCA_BAND_ENFORCED',
  MONOTONICITY_ENFORCED: 'MONOTONICITY_ENFORCED',
  BOUNDS_ENFORCED: 'BOUNDS_ENFORCED',
  RSCA_TARGETED: 'RSCA_TARGETED',
  BOUNDS_CLAMPED: 'BOUNDS_CLAMPED',
  INFEASIBLE_RSCA_BAND: 'INFEASIBLE_RSCA_BAND',
  REDISTRIBUTED: 'REDISTRIBUTED'
} as const;

export type RedistributionReasonCode = typeof RedistributionReasonCode[keyof typeof RedistributionReasonCode];

export interface ChangedMember {
  id: string;
  oldMta: number;
  newMta: number;
  delta: number;
}

export interface InfeasibilityReport {
  meanMin: number;
  meanMax: number;
  targetBand: [number, number];
  anchorSensitivity?: {
    anchorIndex: number;
    memberId?: string;
    impactOnMin: number;
    impactOnMax: number;
    suggestedAdjustment?: number;
  }[];
  minimalAdjustments?: {
    memberId: string;
    suggestedValue: number;
  }[];
}

export interface RedistributionResult {
  updatedMembers: Member[];
  rsca: number;
  isFeasible: boolean;
  auditTrail: AuditEvent[];
  changedMembers: ChangedMember[];
  reasonCodes: RedistributionReasonCode[];
  infeasibilityReport?: InfeasibilityReport;
}

export interface Member {
  id: string;
  rank: number; // 1 to N, where 1 is the highest rank
  mta: number;
  isAnchor: boolean;
  anchorValue?: number;
  name?: string;
}

export interface CompetitiveGroup {
  id: string;
  members: Member[];
  reportingSeniorId?: string;
}

export interface AnchorSet {
  // A map of memberId to their locked anchor value
  anchors: Record<string, number>;
}

export interface Constraints {
  controlBandLower: number;
  controlBandUpper: number;
  mtaLowerBound: number;
  mtaUpperBound: number;
  tolerance: number;
  maxIterations: number;
}

export interface RedistributionParams {
  group: CompetitiveGroup;
  constraints: Constraints;
  algorithmParams: AlgorithmParams;
  targetRSCA?: number;
}

export interface AuditEvent {
  timestamp: Date;
  message: string;
  details?: unknown;
  severity: 'info' | 'warning' | 'error';
}
