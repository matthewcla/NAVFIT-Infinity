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
}

export interface RedistributionParams {
  group: CompetitiveGroup;
  constraints: Constraints;
  targetRSCA?: number;
}

export interface AuditEvent {
  timestamp: Date;
  message: string;
  details?: unknown;
  severity: 'info' | 'warning' | 'error';
}

export const RedistributionReasonCode = {
  ANCHOR_CONSTRAINT: 'ANCHOR_CONSTRAINT',
  RSCA_BAND_ENFORCED: 'RSCA_BAND_ENFORCED',
  MONOTONICITY_ENFORCED: 'MONOTONICITY_ENFORCED',
  BOUNDS_CLAMPED: 'BOUNDS_CLAMPED'
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
  anchorSensitivity: {
    anchorIndex: number; // Using index as ID might not be sufficient if not mapped back, but internal engine uses index.
    memberId?: string; // Optional if we can map it back
    impactOnMin: number;
    impactOnMax: number;
    suggestedAdjustment?: number;
  }[];
  minimalAdjustments: {
    memberId: string;
    suggestedValue: number;
  }[];
}

export interface RedistributionResult {
  updatedMembers: Member[];
  rsca: number;
  isFeasible: boolean;
  auditTrail: AuditEvent[];
  // New fields
  changedMembers: ChangedMember[];
  reasonCodes: RedistributionReasonCode[];
  infeasibilityReport?: InfeasibilityReport;
}
