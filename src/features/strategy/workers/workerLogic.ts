import type { RedistributionEngineResult, Member, RedistributionResult } from '@/domain/rsca/types';
import { redistributeMTA } from '@/domain/rsca/redistribution';
import type { WorkerInput, WorkerOutput } from './types';

export function processWorkerMessage(data: WorkerInput): WorkerOutput {
    const { members, anchors, params, requestId } = data;

    try {
        const effectiveMembers: Member[] = members.map(m => {
            const anchorVal = anchors[m.id];
            if (anchorVal !== undefined) {
                return {
                    ...m,
                    isAnchor: true,
                    anchorValue: anchorVal,
                    mta: anchorVal
                };
            }
            return m;
        });

        const engineResult: RedistributionEngineResult = redistributeMTA(
            effectiveMembers,
            params,
            params.algorithmParams
        );

        const updatedMembers = effectiveMembers.map((m, i) => ({
            ...m,
            mta: engineResult.mtaVector[i]
        }));

        const result: RedistributionResult = {
            updatedMembers,
            rsca: engineResult.finalRSCA,
            isFeasible: engineResult.isFeasible,
            auditTrail: [{
                timestamp: new Date(),
                message: engineResult.explanation,
                severity: engineResult.isFeasible ? 'info' : 'warning',
                details: engineResult.diagnostics
            }],
            changedMembers: engineResult.changedMembers || [],
            reasonCodes: engineResult.reasonCodes || [],
            infeasibilityReport: engineResult.infeasibilityReport
        };

        return { success: true, result, requestId };

    } catch (error) {
        return { success: false, error: (error as Error).message, requestId };
    }
}
