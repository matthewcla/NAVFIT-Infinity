import type { Member, Constraints, RedistributionResult } from '@/domain/rsca/types';

export type AnchorMap = Record<string, number>;

export interface StrategyParams extends Constraints {
    targetRSCA?: number;
}

export interface WorkerInput {
    members: Member[];
    anchors: AnchorMap;
    params: StrategyParams;
    requestId: string;
}

export type WorkerOutput =
    | { success: true; result: RedistributionResult; requestId: string }
    | { success: false; error: string; requestId: string };
