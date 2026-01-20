import type { RedistributionEngineResult, Member, RedistributionResult } from '@/domain/rsca/types';
import { redistributeMTA } from '@/domain/rsca/redistribution';
import { calculateOptimizedTrajectory, distributeMtaByRank, type TrajectoryPoint } from '../logic/optimizer';
import { type WorkerInput, type WorkerOutput, REDISTRIBUTE, CALCULATE_STRATEGY, type StrategyResult } from './types';
import type { SummaryGroup } from '@/types';

export function processWorkerMessage(data: WorkerInput): WorkerOutput {
    if (data.type === CALCULATE_STRATEGY) {
        return handleCalculateStrategy(data);
    }
    // Default to REDISTRIBUTE for backwards compatibility
    return handleRedistribute(data);
}

function handleRedistribute(data: import('./types').RedistributionInput): WorkerOutput {
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

        return { success: true, result, requestId, type: REDISTRIBUTE };

    } catch (error) {
        return { success: false, error: (error as Error).message, requestId, type: REDISTRIBUTE };
    }
}

function handleCalculateStrategy(data: import('./types').CalculateStrategyInput): WorkerOutput {
    const { summaryGroups, targetRsca, requestId } = data;

    try {
        // 1. Group by Competitive Key to ensure independent RSCA calculations
        const groupsByKey = new Map<string, SummaryGroup[]>();
        summaryGroups.forEach(g => {
            const key = g.competitiveGroupKey || 'Uncategorized';
            if (!groupsByKey.has(key)) groupsByKey.set(key, []);
            groupsByKey.get(key)!.push(g);
        });

        const allTrajectories: TrajectoryPoint[] = [];

        // 2. Calculate Trajectory for each Key
        groupsByKey.forEach((groups) => {
            const traj = calculateOptimizedTrajectory(groups, targetRsca);
            allTrajectories.push(...traj);
        });

        // 3. Apply Strategy to Projected Groups (Cascade)
        // We iterate through all groups and update them based on the calculated trajectory
        const optimizedGroups = summaryGroups.map(g => {
            // Find the trajectory point corresponding to this group
            // ID lookup is safe across keys
            const point = allTrajectories.find(p => p.groupId === g.id);

            // If no point or already Final, return as is.
            if (!point || !point.isProjected) return g;

            // It is a projected group. Distribute MTA based on optimalMta.
            const targetMta = point.optimalMta;

            // distributeMtaByRank expects the reports array and a target average.
            const distributedScores = distributeMtaByRank(g.reports, targetMta);

            const optimizedReports = g.reports.map((r, i) => ({
                ...r,
                traitAverage: distributedScores[i] || 0.00
            }));

            return {
                ...g,
                reports: optimizedReports
            };
        });

        const result: StrategyResult = {
            trajectory: allTrajectories,
            optimizedGroups
        };

        return { success: true, result, requestId, type: CALCULATE_STRATEGY };

    } catch (error) {
        return { success: false, error: (error as Error).message, requestId, type: CALCULATE_STRATEGY };
    }
}
