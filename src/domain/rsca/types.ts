export interface Member {
  id: string;
  rankOrder: number; // 1..N
  mta: number;
  isAnchor: boolean;
  name?: string;
}

export interface CompetitiveGroup {
  id: string;
  members: Member[];
}

export interface AnchorSet {
  [memberId: string]: number;
}

export interface Constraints {
  mtaLower: number;
  mtaUpper: number;
  rscaMin: number;
  rscaMax: number;
}

export interface RedistributionParams {
  members: Member[];
  anchors: AnchorSet;
  constraints: Constraints;
  weights?: number[]; // w_i
  baselineCurve?: number[]; // b_i, optional baseline
  smoothness?: number; // optional parameter
}

export type FeasibilityStatus = 'FEASIBLE' | 'INFEASIBLE_BOUNDS' | 'INFEASIBLE_RSCA' | 'INFEASIBLE_MONOTONICITY';

export interface RedistributionResult {
  members: Member[];
  finalRSCA: number;
  status: FeasibilityStatus;
  deltas: Record<string, number>; // memberId -> delta
  explanation: string;
}

export interface AuditEvent {
  timestamp: number;
  action: string;
  details: string;
  previousState?: any;
  newState?: any;
}
