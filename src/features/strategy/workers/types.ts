import type { Member, Constraints, RedistributionResult } from '@/domain/rsca/types';

export type AnchorMap = Record<string, number>;

import type { AlgorithmParams } from '@/domain/rsca/types';

export interface StrategyParams extends Constraints {
    targetRSCA?: number;
    algorithmParams: AlgorithmParams;
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
