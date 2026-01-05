/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRedistributionStore } from './useRedistributionStore';
import { useNavfitStore } from './useNavfitStore';
import type { Member } from '@/domain/rsca/types';

// Mock Worker
class MockWorker {
    onmessage: ((e: any) => void) | null = null;
    postMessage(data: any) {
        // Simulate worker processing
        setTimeout(() => {
            if (this.onmessage) {
                // Mock result
                const { members } = data;
                this.onmessage({
                    data: {
                        requestId: data.requestId,
                        success: true,
                        result: {
                            mtaVector: members.map((m: any) => m.mta), // Return same MTA for simplicity
                            finalRSCA: 4.0,
                            isFeasible: true,
                            deltas: [],
                            explanation: 'Mock Success',
                            updatedMembers: members, // Mock updated members
                            changedMembers: [],
                            reasonCodes: []
                        }
                    }
                });
            }
        }, 50);
    }
    terminate() { }
}

(globalThis as any).Worker = MockWorker as any;

describe('useRedistributionStore', () => {
    beforeEach(() => {
        useRedistributionStore.getState().initWorker();
        // Reset NavfitStore
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
            }]
        } as any);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize worker', () => {
        const store = useRedistributionStore.getState();
        expect(store.worker).toBeDefined();
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
            mtaUpperBound: 5.0
        });

        // Initially calculating
        // Note: debounce might delay this.
        await new Promise(r => setTimeout(r, 400)); // Wait for debounce

        // Wait for worker mock response
        await new Promise(r => setTimeout(r, 100));

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
    });

    it('setAnchorMTA should update NavfitStore and trigger redistribution', async () => {
        const store = useRedistributionStore.getState();
        store.setAnchorMTA('group1', '1', 4.8);

        const navfitState = useNavfitStore.getState();
        const group = navfitState.summaryGroups.find(g => g.id === 'group1');
        const member = group?.reports.find(r => r.id === '1');

        expect(member?.isLocked).toBe(true);
        expect(member?.traitAverage).toBe(4.8);
    });
});
