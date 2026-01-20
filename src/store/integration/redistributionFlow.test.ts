import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useNavfitStore } from '../useNavfitStore';
import { useRedistributionStore } from '../useRedistributionStore';
import { WorkerMock } from '../../test/mocks/workerMock';
import { CALCULATE_STRATEGY, type StrategyResult } from '@/features/strategy/workers/types';

describe('Integration: Redistribution Flow', () => {
    beforeEach(() => {
        // Reset stores
        useNavfitStore.setState({
            summaryGroups: [{
                id: 'g1',
                reports: [
                    { id: 'r1', traitAverage: 3.5, isLocked: false, memberName: 'M1', rank: 'O3', designator: '1110', dateReported: '2023-01-01' },
                    { id: 'r2', traitAverage: 4.0, isLocked: false, memberName: 'M2', rank: 'O3', designator: '1110', dateReported: '2023-01-01' }
                ],
                title: 'G1',
                memberIds: ['r1', 'r2'],
                // Add minimal required fields to avoid runtime errors if accessed
                period: '2023',
                promotionStatus: 'REGULAR',
                billetSubcategory: 'ALL'
            } as any],
            projections: {},
            trajectoryCache: []
        } as any);

        useRedistributionStore.setState({
            worker: null,
            latestResult: {},
            isCalculating: false,
            error: null,
            latestStrategyRequestId: null
        });

        useRedistributionStore.getState().initWorker();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('Redistribution Flow via Worker', async () => {
        const navfitStore = useNavfitStore.getState();

        // Dispatch updateProjection
        // This optimistically updates NavfitStore and triggers calculateStrategy
        navfitStore.updateProjection('g1', 'r1', 4.5);

        // Assert optimistic update
        const updatedGroup = useNavfitStore.getState().summaryGroups[0];
        const report = updatedGroup.reports.find(r => r.id === 'r1');
        expect(report?.traitAverage).toBe(4.5);
        expect(report?.isLocked).toBe(true);

        // Wait for debounce (100ms) and setTimeout(0)
        await new Promise(r => setTimeout(r, 200));

        // Assert isCalculating is true
        expect(useRedistributionStore.getState().isCalculating).toBe(true);

        // Verify worker received message
        const worker = WorkerMock.latest;
        expect(worker).toBeDefined();

        const lastMsg = worker!.getLastMessage();
        expect(lastMsg).toBeDefined();
        expect(lastMsg.type).toBe(CALCULATE_STRATEGY);

        // Trigger response
        const dummyResult: StrategyResult = {
            optimizedGroups: [
                {
                    ...updatedGroup,
                    reports: updatedGroup.reports.map(r => ({ ...r, violations: [] }))
                }
            ],
            trajectory: [{
                date: Date.now(),
                rsca: 3.8,
                target: 4.2,
                margin: 0.4,
                groupName: 'G1',
                groupId: 'g1',
                compKey: 'O3 1110',
                isProjected: false,
                optimalMta: 4.0,
                memberCount: 2
            }]
        };

        worker!.triggerMessage({
            requestId: lastMsg.requestId,
            type: CALCULATE_STRATEGY,
            success: true,
            result: dummyResult
        });

        // Assert isCalculating is false
        expect(useRedistributionStore.getState().isCalculating).toBe(false);

        // Assert store updated with result
        const finalNavfit = useNavfitStore.getState();
        expect(finalNavfit.trajectoryCache).toEqual(dummyResult.trajectory);
    });
});
