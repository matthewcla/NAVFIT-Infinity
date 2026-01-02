import { describe, it, expect, beforeEach } from 'vitest';
import { useNavfitStore } from './useNavfitStore';
import { INITIAL_ROSTER, INITIAL_RS_CONFIG } from '../data/initialRoster';
import type { SummaryGroup, Report } from '@/types';

// Helper to reset the store
const resetStore = () => {
    useNavfitStore.setState({
        roster: INITIAL_ROSTER,
        projections: {},
        summaryGroups: [],
        rsConfig: INITIAL_RS_CONFIG,
    });
};

describe('NavfitStore', () => {
    beforeEach(() => {
        resetStore();
    });

    describe('reorderMember (Legacy Roster)', () => {
        it('should reorder members in the roster', () => {
            // Setup: Create a mock roster
            const mockRoster = [
                { ...INITIAL_ROSTER[0], id: '1', rankOrder: 1, lastName: 'A' },
                { ...INITIAL_ROSTER[0], id: '2', rankOrder: 2, lastName: 'B' },
                { ...INITIAL_ROSTER[0], id: '3', rankOrder: 3, lastName: 'C' },
            ];

            useNavfitStore.setState({ roster: mockRoster });

            // Action: Move member '3' (index 2) to index 0
            useNavfitStore.getState().reorderMember('3', 0);

            // Verification
            const updatedRoster = useNavfitStore.getState().roster;
            expect(updatedRoster[0].id).toBe('3');
            expect(updatedRoster[1].id).toBe('1');
            expect(updatedRoster[2].id).toBe('2');
        });

        it('should not update projections', () => {
            const mockRoster = [
                { ...INITIAL_ROSTER[0], id: '1', rankOrder: 1 },
                { ...INITIAL_ROSTER[0], id: '2', rankOrder: 2 },
            ];
            useNavfitStore.setState({ roster: mockRoster, projections: {} });

            useNavfitStore.getState().reorderMember('2', 0);

            // reorderMember does not calculate projections
            expect(useNavfitStore.getState().projections).toEqual({});
        });
    });

    describe('reorderMembers (Summary Group & Projections)', () => {
        const createMockReport = (id: string, traitAverage: number, isAdverse = false): Report => ({
            id,
            memberId: id,
            traitAverage,
            isAdverse,
            reportsRemaining: 1,
            isLocked: false,
            promotionRecommendation: 'MP',
            firstName: `Member`,
            lastName: id,
            // Added required fields
            periodEndDate: '2023-01-01',
            type: 'Periodic',
            traitGrades: {}
        });

        it('should reorder reports in a summary group and update projections', () => {
            // Setup: Create a summary group with reports
            const group1: SummaryGroup = {
                id: 'group1',
                name: 'Test Group',
                competitiveGroupKey: 'group1-key',
                periodEndDate: '2023-12-31',
                reports: [
                    createMockReport('1', 3.0),
                    createMockReport('2', 3.0),
                    createMockReport('3', 3.0),
                ]
            };

            useNavfitStore.setState({
                summaryGroups: [group1],
                projections: {},
                rsConfig: {
                    ...INITIAL_RS_CONFIG,
                    targetRsca: 4.00,
                    // Ensure strategy config matches what we expect for calculation
                    // We assume defaults in autoPlan are used or rsConfig doesn't override them unless specified
                }
            });

            // Action: Move Report '3' (index 2) to index 0
            // This is the "Legacy Single-Item Move" path in reorderMembers
            useNavfitStore.getState().reorderMembers('group1', '3', '1'); // targetId '1' (which is at index 0 initially)

            // Wait, reorderMembers(groupId, draggedId, targetIdOrOrder)
            // If targetIdOrOrder is a string, it finds targetIndex.
            // If targetId is '1', index of '1' is 0. So '3' moves to 0.

            // Verification: Order
            const updatedGroups = useNavfitStore.getState().summaryGroups;
            const updatedReports = updatedGroups[0].reports;

            expect(updatedReports[0].id).toBe('3');
            expect(updatedReports[1].id).toBe('1');
            expect(updatedReports[2].id).toBe('2');

            // Verification: Projections
            // Based on autoPlan logic:
            // #1 (Member 3) gets Ceiling.
            // Formula: rscaTarget (4.00) + breakoutBonus (0.30) - (reportsRemainingFactor (0.10) * 1) = 4.20
            // (assuming defaults in autoPlan.ts)

            const projections = useNavfitStore.getState().projections;
            const proj3 = projections['3'];

            // Check if projection was calculated and stored
            expect(proj3).toBeDefined();
            expect(proj3).toBeGreaterThan(4.00);
            expect(proj3).toBeCloseTo(4.20, 2); // 4.20 ideally

            // Check if state reports are also updated with new trait averages
            expect(updatedReports[0].traitAverage).toBe(proj3);
        });

        it('should handle bulk reorder (array of IDs)', () => {
            const group1: SummaryGroup = {
                id: 'group1',
                name: 'Test Group',
                competitiveGroupKey: 'group1-key',
                periodEndDate: '2023-12-31',
                reports: [
                    createMockReport('1', 3.0),
                    createMockReport('2', 3.0),
                    createMockReport('3', 3.0),
                ]
            };

            useNavfitStore.setState({
                summaryGroups: [group1],
                projections: {},
                rsConfig: { ...INITIAL_RS_CONFIG, targetRsca: 4.00 }
            });

            // Action: Bulk reorder to [3, 2, 1]
            useNavfitStore.getState().reorderMembers('group1', '3', ['3', '2', '1']);

            // Verification: Order
            const updatedGroups = useNavfitStore.getState().summaryGroups;
            const updatedReports = updatedGroups[0].reports;

            expect(updatedReports[0].id).toBe('3');
            expect(updatedReports[1].id).toBe('2');
            expect(updatedReports[2].id).toBe('1');

            // Verification: Projections updated
            const projections = useNavfitStore.getState().projections;
            expect(projections['3']).toBeDefined(); // #1
            expect(projections['1']).toBeDefined(); // #3 (last)

            // #1 should be highest
            expect(projections['3']).toBeGreaterThan(projections['1']);
        });
    });
});
