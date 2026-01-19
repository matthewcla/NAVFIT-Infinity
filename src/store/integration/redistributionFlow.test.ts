import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkerMock } from '../../test/mocks/workerMock';

// 1. Mock the Worker Module Import FIRST
vi.mock('@/features/strategy/workers/redistribution.worker?worker', () => ({
    default: WorkerMock
}));

// 2. Import stores after mocking
import { useNavfitStore } from '../useNavfitStore';
import { useRedistributionStore } from '../useRedistributionStore';
import { INITIAL_RS_CONFIG } from '@/domain/rsca/constants';

describe('Integration: Redistribution Flow (Store -> Worker -> Store)', () => {

    beforeEach(() => {
        // Stub global Worker for `initWorker` check
        vi.stubGlobal('Worker', WorkerMock);

        // Reset Stores
        useNavfitStore.setState({
            summaryGroups: [],
            projections: {},
            rsConfig: INITIAL_RS_CONFIG
        });

        useRedistributionStore.getState().reset();
        WorkerMock.instances = []; // Clear mock registry
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    it('should trigger loading state and update projections via worker response', async () => {
        // 1. Initialize Worker
        useRedistributionStore.getState().initWorker();
        expect(WorkerMock.instances.length).toBe(1);
        const worker = WorkerMock.latest;

        // 2. Setup Data (Summary Group)
        const group = {
            id: 'g1',
            reports: [
                { id: 'r1', memberId: 'm1', traitAverage: 3.0, name: 'Sailor A' },
                { id: 'r2', memberId: 'm2', traitAverage: 3.0, name: 'Sailor B' }
            ]
        } as any;
        useNavfitStore.getState().addSummaryGroup(group);

        // Ensure r2 is unlocked so it accepts projections
        // (addSummaryGroup might lock it via default anchors)
        useNavfitStore.getState().toggleReportLock('g1', 'r2');
        // Note: toggleReportLock might be a toggle.
        // To be safe, let's force unlock via setGroupLockState or checking first.
        const r2 = useNavfitStore.getState().summaryGroups[0].reports.find(r => r.id === 'r2');
        if (r2?.isLocked) {
             useNavfitStore.getState().toggleReportLock('g1', 'r2');
        }

        // 3. Dispatch Action (Simulate User Input)
        // updateProjection triggers requestRedistribution
        vi.useFakeTimers(); // debounce control
        useNavfitStore.getState().updateProjection('g1', 'r1', 4.0);

        // Fast-forward debounce
        vi.runAllTimers();

        // 4. Assert Loading State
        expect(useRedistributionStore.getState().isCalculating).toBe(true);

        // 5. Simulate Worker Response
        // We need the requestId that was generated internally.
        // In a real test, we might ignore it or capture it via spy,
        // but the store checks `latestRequestId`.
        const requestId = useRedistributionStore.getState().latestRequestId;
        expect(requestId).toBeTruthy();

        const mockResult = {
            success: true,
            requestId: requestId,
            result: {
                updatedMembers: [
                    { id: 'r1', mta: 4.0, isAnchor: true },
                    { id: 'r2', mta: 3.5, isAnchor: false } // Calculated value
                ],
                rsca: 3.75,
                isFeasible: true
            }
        };

        // Fire response
        worker.processMessage(mockResult);

        // 6. Assert Final State
        expect(useRedistributionStore.getState().isCalculating).toBe(false);

        const projections = useNavfitStore.getState().projections;
        // r1 is anchor. It was set in projections by updateProjection (optimistic).
        // The redistribution logic skips overwriting it, so it remains as the user set it (4.0).
        expect(projections['r1']).toBe(4.0);

        // r2 should be updated by the worker result
        expect(projections['r2']).toBe(3.5);
    });
});
