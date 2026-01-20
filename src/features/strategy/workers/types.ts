import type { Member, Constraints, RedistributionResult, AlgorithmParams } from '@/domain/rsca/types';
import type { SummaryGroup } from '@/types';
import type { TrajectoryPoint } from '../logic/optimizer';

export type AnchorMap = Record<string, number>;

export interface StrategyParams extends Constraints {
    targetRSCA?: number;
    algorithmParams: AlgorithmParams;
}

// Use string literal constants instead of enum for erasableSyntaxOnly compatibility
export const REDISTRIBUTE = 'REDISTRIBUTE' as const;
export const CALCULATE_STRATEGY = 'CALCULATE_STRATEGY' as const;

export type WorkerActionType = typeof REDISTRIBUTE | typeof CALCULATE_STRATEGY;

export interface RedistributionInput {
    type: typeof REDISTRIBUTE;
    members: Member[];
    anchors: AnchorMap;
    params: StrategyParams;
    requestId: string;
}

export interface CalculateStrategyInput {
    type: typeof CALCULATE_STRATEGY;
    summaryGroups: SummaryGroup[];
    targetRsca: number;
    requestId: string;
}

export type WorkerInput = RedistributionInput | CalculateStrategyInput;

export interface StrategyResult {
    trajectory: TrajectoryPoint[];
    optimizedGroups: SummaryGroup[];
}

export type WorkerOutput =
    | { success: true; result: RedistributionResult; requestId: string; type: typeof REDISTRIBUTE }
    | { success: true; result: StrategyResult; requestId: string; type: typeof CALCULATE_STRATEGY }
    | { success: false; error: string; requestId: string; type: WorkerActionType };
