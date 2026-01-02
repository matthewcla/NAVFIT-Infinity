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

export interface RedistributionResult {
  updatedMembers: Member[];
  rsca: number;
  isFeasible: boolean;
  auditTrail: AuditEvent[];
}
