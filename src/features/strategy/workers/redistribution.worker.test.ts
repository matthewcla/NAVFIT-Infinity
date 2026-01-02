import { describe, it, expect, vi } from 'vitest';
import { processWorkerMessage } from './workerLogic';
import { WorkerInput } from './types';
import { Member } from '@/domain/rsca/types';
import { DEFAULT_CONSTRAINTS } from '@/domain/rsca/constants';
// Import the mocked module so we can control it
import { redistributeMTA } from '@/domain/rsca/redistribution';

// Mock the domain logic to isolate worker logic test
vi.mock('@/domain/rsca/redistribution', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        // @ts-ignore
        ...actual,
        redistributeMTA: vi.fn((members) => {
            // Simple mock implementation
            return {
                mtaVector: members.map((m: Member) => m.mta),
                finalRSCA: 4.0,
                isFeasible: true,
                deltas: [],
                explanation: "Mocked Success"
            };
        })
    };
});

describe('Worker Logic', () => {
    it('processes valid input correctly', () => {
        const input: WorkerInput = {
            members: [
                { id: '1', rank: 1, mta: 4.2, isAnchor: false }
            ],
            anchors: {},
            params: { ...DEFAULT_CONSTRAINTS, targetRSCA: 4.0 },
            requestId: 'req-1'
        };

        const output = processWorkerMessage(input);

        expect(output.success).toBe(true);
        if (output.success) {
            expect(output.requestId).toBe('req-1');
            expect(output.result.rsca).toBe(4.0);
            expect(output.result.updatedMembers[0].mta).toBe(4.2);
        }
    });

    it('merges anchors correctly before processing', () => {
        const input: WorkerInput = {
            members: [
                { id: '1', rank: 1, mta: 4.2, isAnchor: false }
            ],
            anchors: { '1': 4.5 },
            params: { ...DEFAULT_CONSTRAINTS, targetRSCA: 4.0 },
            requestId: 'req-2'
        };

        const output = processWorkerMessage(input);

        expect(output.success).toBe(true);
        if (output.success) {
            expect(output.result.updatedMembers[0].mta).toBe(4.5); // Should have been updated by anchor map
            expect(output.result.updatedMembers[0].isAnchor).toBe(true);
        }
    });

    it('handles errors gracefully', () => {
        // Mock implementation to throw error
        vi.mocked(redistributeMTA).mockImplementationOnce(() => {
            throw new Error("Calculation failed");
        });

        const input: WorkerInput = {
            members: [],
            anchors: {},
            params: { ...DEFAULT_CONSTRAINTS },
            requestId: 'req-3'
        };

        const output = processWorkerMessage(input);

        expect(output.success).toBe(false);
        if (!output.success) {
            expect(output.error).toBe("Calculation failed");
            expect(output.requestId).toBe('req-3');
        }
    });
});
