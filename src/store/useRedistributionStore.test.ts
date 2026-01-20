/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRedistributionStore } from './useRedistributionStore';
import { useNavfitStore } from './useNavfitStore';
import type { Member } from '@/domain/rsca/types';
import { WorkerMock } from '@/test/mocks/workerMock';
import { REDISTRIBUTE } from '@/features/strategy/workers/types';

describe('useRedistributionStore', () => {
    beforeEach(() => {
        // Reset Store State
        useRedistributionStore.setState({
            worker: null,
            latestResult: {},
            isCalculating: false,
            error: null
        });

        useNavfitStore.setState({
            summaryGroups: [{
                id: 'group1',
                reports: [
                    { id: '1', traitAverage: 4.2, isLocked: false, firstName: 'A', lastName: 'B', rank: 'O3', designator: '1110', dateReported: '2023-01-01', prd: '2024-01-01' },
                    { id: '2', traitAverage: 4.0, isLocked: false, firstName: 'C', lastName: 'D', rank: 'O3', designator: '1110', dateReported: '2023-01-01', prd: '2024-01-01' }
                ],
                title: 'Test Group',
                period: '2023',
                promotionStatus: 'REGULAR',
                billetSubcategory: 'ALL',
                memberIds: ['1', '2']
            } as any]
        } as any);

        useRedistributionStore.getState().initWorker();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize worker', () => {
        const store = useRedistributionStore.getState();
        expect(store.worker).toBeDefined();
        // Check if mock captured it
        expect(WorkerMock.instances.length).toBeGreaterThan(0);
    });

    it('should request redistribution and update state', async () => {
        const store = useRedistributionStore.getState();
        const members: Member[] = [
            { id: '1', rank: 1, mta: 4.5, isAnchor: false },
            { id: '2', rank: 2, mta: 4.0, isAnchor: false }
        ];

        store.requestRedistribution('group1', members, {
            controlBandLower: 3.8,
            controlBandUpper: 4.2,
            mtaLowerBound: 2.0,
            mtaUpperBound: 5.0,
            tolerance: 0.005,
            maxIterations: 30
        });

        // Advance timers for debounce (100ms)
        await new Promise(r => setTimeout(r, 150));

        const worker = WorkerMock.latest;
        expect(worker).toBeDefined();

        // Verify message sent
        const lastMsg = worker!.getLastMessage();
        expect(lastMsg).toBeDefined();
        expect(lastMsg.type).toBe(REDISTRIBUTE);
        expect(lastMsg.requestId).toBeDefined();

        // Simulate Worker Response
        worker!.triggerMessage({
            requestId: lastMsg.requestId,
            type: REDISTRIBUTE,
            success: true,
            result: {
                updatedMembers: members.map(m => ({ ...m, mta: m.mta })),
                rsca: 4.0,
                isFeasible: true,
                auditTrail: [],
                changedMembers: [],
                reasonCodes: [],
                infeasibilityReport: null
            }
        });

        const result = useRedistributionStore.getState().latestResult['group1'];
        expect(result).toBeDefined();
        expect(result?.isFeasible).toBe(true);
    });

    it('setRankOrder should update NavfitStore and trigger redistribution', async () => {
        const store = useRedistributionStore.getState();
        const newMembers: Member[] = [
            { id: '2', rank: 1, mta: 4.0, isAnchor: false },
            { id: '1', rank: 2, mta: 4.2, isAnchor: false }
        ];

        store.setRankOrder('group1', newMembers);

        // Check NavfitStore update
        const navfitState = useNavfitStore.getState();
        const group = navfitState.summaryGroups.find(g => g.id === 'group1');
        expect(group?.reports[0].id).toBe('2');
        expect(group?.reports[1].id).toBe('1');

        // Wait for potential debounce in setRankOrder if any (it calls requestRedistribution)
        await new Promise(r => setTimeout(r, 150));

        const worker = WorkerMock.latest;

        // It might send both REDISTRIBUTE and CALCULATE_STRATEGY.
        // We just verify REDISTRIBUTE was sent.
        const redistributeMsg = worker!.sentMessages.find(m => m.type === REDISTRIBUTE);

        expect(redistributeMsg).toBeDefined();
    });

    it('setAnchorMTA should update NavfitStore and trigger redistribution', async () => {
        const store = useRedistributionStore.getState();
        store.setAnchorMTA('group1', '1', 4.8);

        const navfitState = useNavfitStore.getState();
        const group = navfitState.summaryGroups.find(g => g.id === 'group1');
        const member = group?.reports.find(r => r.id === '1');

        expect(member?.isLocked).toBe(true);
        expect(member?.traitAverage).toBe(4.8);

        await new Promise(r => setTimeout(r, 150));
        const worker = WorkerMock.latest;
        const lastMsg = worker!.getLastMessage();
        expect(lastMsg).toBeDefined();
        expect(lastMsg.type).toBe(REDISTRIBUTE);
    });
});
