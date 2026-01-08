import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNavfitStore } from './useNavfitStore';
import { useRedistributionStore } from './useRedistributionStore';
import type { SummaryGroup, Report } from '@/types';

// Mock Data Helper
const createMockReport = (id: string, mta: number, overrides?: Partial<Report>): Report => ({
    id,
    memberId: `member-${id}`,
    memberName: `Member ${id}`,
    traitAverage: mta,
    promotionRecommendation: 'P',
    isLocked: false,
    periodEndDate: '2024-01-01',
    reportType: 'Regular',
    paygrade: 'O-3',
    seniority: 0,
    rsvp: 0,
    earlyPromote: false,
    isEval: false,
    ...overrides
} as Report);

const createMockGroup = (id: string, reports: Report[]): SummaryGroup => ({
    id,
    name: `Group ${id}`,
    reports,
    status: 'Draft',
    paygrade: 'O-3',
    designator: '1110',
    rsca: 3.5,
    periodEndDate: '2024-01-01',
    promotionStatus: 'Regular'
} as SummaryGroup);

describe('MTA Persistence After Optimization', () => {
    beforeEach(() => {
        // Reset stores
        useNavfitStore.setState({
            summaryGroups: [],
            roster: [],
            projections: {},
            rsConfig: { name: 'Test', targetRsca: 3.6, rsca: 3.5, totalReports: 100, changeOfCommandDate: '2025-01-01' } as any
        });
        useRedistributionStore.setState({
            isCalculating: false,
            latestResult: {},
            error: null,
            latestRequestId: null
        });
    });

    it('preserves committed MTA values after lock/unlock cycle (simulated post-optimization)', () => {
        // Setup: Group with reports at "optimized" values
        const r1 = createMockReport('r1', 4.50); // Optimized value
        const r2 = createMockReport('r2', 4.20); // Optimized value
        const r3 = createMockReport('r3', 3.80); // Optimized value
        const group = createMockGroup('g1', [r1, r2, r3]);

        useNavfitStore.getState().setSummaryGroups([group]);

        // Simulate: Projections are CLEARED (as commitOptimization does)
        useNavfitStore.setState({ projections: {} });

        // Verify initial state
        let currentGroup = useNavfitStore.getState().summaryGroups[0];
        expect(currentGroup.reports[0].traitAverage).toBe(4.50);
        expect(currentGroup.reports[1].traitAverage).toBe(4.20);

        // Action: Lock r1
        useNavfitStore.getState().toggleReportLock('g1', 'r1', 4.50);

        // Assert: All MTA values should remain
        currentGroup = useNavfitStore.getState().summaryGroups[0];
        const r1After = currentGroup.reports.find(r => r.id === 'r1');
        const r2After = currentGroup.reports.find(r => r.id === 'r2');
        expect(r1After?.traitAverage).toBe(4.50);
        expect(r1After?.isLocked).toBe(true);
        expect(r2After?.traitAverage).toBe(4.20); // Should not change
    });

    it('locked report MTA not overwritten by projections (non-NOB)', () => {
        // Setup: Group with locked report
        const r1 = createMockReport('r1', 4.50, { isLocked: true });
        const r2 = createMockReport('r2', 4.20, { isLocked: false });
        const group = createMockGroup('g1', [r1, r2]);

        useNavfitStore.getState().setSummaryGroups([group]);

        // Simulate: Redistribution writes stale projections
        useNavfitStore.setState({
            projections: {
                'r1': 3.80, // Stale value that shouldn't override
                'r2': 4.10  // Non-locked can be updated
            }
        });

        // Verify projections were set
        const projections = useNavfitStore.getState().projections;
        expect(projections['r1']).toBe(3.80);
        expect(projections['r2']).toBe(4.10);

        // UI calculation logic (mimicking CycleContextPanel)
        const currentGroup = useNavfitStore.getState().summaryGroups[0];
        const currentProjections = useNavfitStore.getState().projections;

        const getMtaForDisplay = (report: Report) => {
            const isLockedNonNob = report.isLocked && report.promotionRecommendation !== 'NOB';
            return isLockedNonNob
                ? report.traitAverage
                : (currentProjections[report.id] ?? report.traitAverage ?? 0);
        };

        const r1Display = getMtaForDisplay(currentGroup.reports.find(r => r.id === 'r1')!);
        const r2Display = getMtaForDisplay(currentGroup.reports.find(r => r.id === 'r2')!);

        // Assert: Locked report shows committed value, unlocked shows projection
        expect(r1Display).toBe(4.50); // Committed value, NOT projection
        expect(r2Display).toBe(4.10); // Projection value
    });

    it('NOB reports can have MTA updated even when locked', () => {
        // Setup: Locked NOB report
        const r1 = createMockReport('r1', 0.00, { isLocked: true, promotionRecommendation: 'NOB' });
        const group = createMockGroup('g1', [r1]);

        useNavfitStore.getState().setSummaryGroups([group]);

        // Simulate projection update
        useNavfitStore.setState({
            projections: { 'r1': 0.00 }
        });

        // UI calculation logic
        const currentGroup = useNavfitStore.getState().summaryGroups[0];
        const currentProjections = useNavfitStore.getState().projections;

        const getMtaForDisplay = (report: Report) => {
            const isLockedNonNob = report.isLocked && report.promotionRecommendation !== 'NOB';
            return isLockedNonNob
                ? report.traitAverage
                : (currentProjections[report.id] ?? report.traitAverage ?? 0);
        };

        const r1Display = getMtaForDisplay(currentGroup.reports.find(r => r.id === 'r1')!);

        // NOB should use projection (though typically 0)
        expect(r1Display).toBe(0.00);
    });

    it('unlocking a report preserves its MTA value', () => {
        // Setup: Locked report
        const r1 = createMockReport('r1', 4.50, { isLocked: true });
        const group = createMockGroup('g1', [r1]);

        useNavfitStore.getState().setSummaryGroups([group]);

        // Action: Unlock
        useNavfitStore.getState().toggleReportLock('g1', 'r1');

        // Assert: MTA value unchanged, just unlocked
        const currentGroup = useNavfitStore.getState().summaryGroups[0];
        const r1After = currentGroup.reports.find(r => r.id === 'r1');
        expect(r1After?.traitAverage).toBe(4.50);
        expect(r1After?.isLocked).toBe(false);
    });
});
