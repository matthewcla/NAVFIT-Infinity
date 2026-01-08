
import { describe, it, expect, beforeEach } from 'vitest';
import { useNavfitStore } from './useNavfitStore';
import type { SummaryGroup, Report } from '@/types';

// Mock Data Helper
const createMockReport = (id: string, mta: number): Report => ({
    id,
    memberId: `member-${id}`,
    memberName: `Member ${id}`,
    traitAverage: mta,
    promotionRecommendation: 'P',
    isLocked: false,
    periodEndDate: '2024-01-01',
    // ... other required fields mocked minimally
    reportType: 'Regular',
    paygrade: 'O-3',
    seniority: 0,
    rsvp: 0,
    earlyPromote: false,
    isEval: false
} as any);

const createMockGroup = (id: string, reports: Report[]): SummaryGroup => ({
    id,
    name: `Group ${id}`,
    reports,
    status: 'Draft',
    // ... minimal fields
    paygrade: 'O-3',
    designator: '1110',
    rsca: 3.5,
    periodEndDate: '2024-01-01',
    promotionStatus: 'Regular'
} as any);

describe('Report Locking Logic', () => {
    beforeEach(() => {
        useNavfitStore.setState({
            summaryGroups: [],
            roster: [],
            rsConfig: { name: 'Test', targetRsca: 3.6, rsca: 3.5, totalReports: 100, changeOfCommandDate: '2025-01-01' } as any
        });
    });

    it('toggles lock specifically for the target report ID', () => {
        const r1 = createMockMockReport('r1', 4.0);
        const r2 = createMockMockReport('r2', 3.8);
        const group = createMockGroup('g1', [r1, r2]);

        useNavfitStore.getState().setSummaryGroups([group]);

        // Toggle r2
        useNavfitStore.getState().toggleReportLock('g1', 'r2');

        const updatedGroup = useNavfitStore.getState().summaryGroups[0];
        const updatedR1 = updatedGroup.reports.find(r => r.id === 'r1');
        const updatedR2 = updatedGroup.reports.find(r => r.id === 'r2');

        expect(updatedR1?.isLocked).toBe(false);
        expect(updatedR2?.isLocked).toBe(true);

        // Toggle r2 again
        useNavfitStore.getState().toggleReportLock('g1', 'r2');
        expect(useNavfitStore.getState().summaryGroups[0].reports.find(r => r.id === 'r2')?.isLocked).toBe(false);
    });

    it('handles sorting/reordering simulation via store updates', () => {
        const r1 = createMockMockReport('r1', 4.0);
        const r2 = createMockMockReport('r2', 3.8);
        const r3 = createMockMockReport('r3', 3.9);
        // Initial order: r1, r2, r3
        const group = createMockGroup('g1', [r1, r2, r3]);
        useNavfitStore.getState().setSummaryGroups([group]);

        // "Reorder" simply means the array in the store changes order
        const reorderedReports = [r2, r3, r1];
        useNavfitStore.setState({
            summaryGroups: [{ ...group, reports: reorderedReports }]
        });

        // Lock 'r3' (which is now at index 1)
        useNavfitStore.getState().toggleReportLock('g1', 'r3');

        const updatedGroup = useNavfitStore.getState().summaryGroups[0];
        const lockedReport = updatedGroup.reports.find(r => r.isLocked);
        expect(lockedReport?.id).toBe('r3');
        expect(updatedGroup.reports[1].id).toBe('r3'); // Confirm position
    });

    it('sets lock state for all reports in a group', () => {
        const r1 = createMockMockReport('r1', 4.0);
        const r2 = createMockMockReport('r2', 3.8);
        const group = createMockGroup('g1', [r1, r2]);
        useNavfitStore.getState().setSummaryGroups([group]);

        // Lock All
        useNavfitStore.getState().setGroupLockState('g1', true);
        let updatedGroup = useNavfitStore.getState().summaryGroups[0];
        expect(updatedGroup.reports.every(r => r.isLocked)).toBe(true);

        // Unlock All
        useNavfitStore.getState().setGroupLockState('g1', false);
        updatedGroup = useNavfitStore.getState().summaryGroups[0];
        expect(updatedGroup.reports.every(r => !r.isLocked)).toBe(true);
    });

    it('commits a specific value when locking (Commit-on-Lock)', () => {
        const r1 = createMockMockReport('r1', 4.0);
        const group = createMockGroup('g1', [r1]);
        useNavfitStore.getState().setSummaryGroups([group]);

        // Lock with value 4.20 (e.g. from preview)
        useNavfitStore.getState().toggleReportLock('g1', 'r1', 4.20);

        let updatedGroup = useNavfitStore.getState().summaryGroups[0];
        expect(updatedGroup.reports[0].isLocked).toBe(true);
        expect(updatedGroup.reports[0].traitAverage).toBe(4.20); // Should be updated

        // Unlock (should not change value)
        useNavfitStore.getState().toggleReportLock('g1', 'r1');
        updatedGroup = useNavfitStore.getState().summaryGroups[0];
        expect(updatedGroup.reports[0].isLocked).toBe(false);
        expect(updatedGroup.reports[0].traitAverage).toBe(4.20);
    });

    it('commits batch values when locking all', () => {
        const r1 = createMockMockReport('r1', 4.0);
        const r2 = createMockMockReport('r2', 3.8);
        const group = createMockGroup('g1', [r1, r2]);
        useNavfitStore.getState().setSummaryGroups([group]);

        const valueMap = {
            'r1': 4.50,
            'r2': 3.90
        };

        // Lock All with committed values
        useNavfitStore.getState().setGroupLockState('g1', true, valueMap);

        const updatedGroup = useNavfitStore.getState().summaryGroups[0];
        expect(updatedGroup.reports[0].isLocked).toBe(true);
        expect(updatedGroup.reports[0].traitAverage).toBe(4.50);
        expect(updatedGroup.reports[1].isLocked).toBe(true);
        expect(updatedGroup.reports[1].traitAverage).toBe(3.90);
    });

    it('debugs rank jumping in tight clusters', () => {
        // Scenario: Reports with very close values.
        // Locking one shouldn't unexpectedly swap the others if their relative order is clear.
        // However, if locking commits a projected value that is slightly different, it might cause a swap.

        const r1 = createMockMockReport('r1', 4.00);
        const r2 = createMockMockReport('r2', 4.01);
        const r3 = createMockMockReport('r3', 3.99);

        // Initial setup: r2 (4.01) > r1 (4.00) > r3 (3.99)
        const group = createMockGroup('g1', [r2, r1, r3]);
        useNavfitStore.getState().setSummaryGroups([group]);

        // Commit-on-Lock r1 at 4.02 (user dragged it above r2)
        useNavfitStore.getState().toggleReportLock('g1', 'r1', 4.02);

        let updatedGroup = useNavfitStore.getState().summaryGroups[0];
        // Expected: r1 (4.02) > r2 (4.01) > r3 (3.99)
        expect(updatedGroup.reports[0].id).toBe('r1');
        expect(updatedGroup.reports[0].traitAverage).toBe(4.02);

        // Now Unlock r1. Ideally it stays at 4.02 (rank 1), unless redistribution moves it.
        // If sorting is unstable or precision errors occur, it might flip.
        useNavfitStore.getState().toggleReportLock('g1', 'r1');

        updatedGroup = useNavfitStore.getState().summaryGroups[0];
        // Even unlocked, the value should persist until redistribution changes it.
        expect(updatedGroup.reports[0].id).toBe('r1');
    });

    it('re-sorts correctly when setGroupLockState commits new values', () => {
        const r1 = createMockMockReport('r1', 4.00); // 2nd
        const r2 = createMockMockReport('r2', 4.01); // 1st
        const group = createMockGroup('g1', [r2, r1]);
        useNavfitStore.getState().setSummaryGroups([group]);

        // Commit r1 to 4.05 via lock all (should became 1st)
        const valueMap = { 'r1': 4.05, 'r2': 4.01 };
        useNavfitStore.getState().setGroupLockState('g1', true, valueMap);

        const updatedGroup = useNavfitStore.getState().summaryGroups[0];
        expect(updatedGroup.reports[0].id).toBe('r1'); // Should now be first
        expect(updatedGroup.reports[0].traitAverage).toBe(4.05);
    });
});

// Helper within the file since I can't import easily if not exported, or just duplicate
function createMockMockReport(id: string, mta: number): Report {
    return createMockReport(id, mta);
}
