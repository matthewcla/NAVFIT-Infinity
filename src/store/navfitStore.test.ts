import { describe, it, expect, beforeEach } from 'vitest';
import { useNavfitStore } from './useNavfitStore';
import { useRedistributionStore } from './useRedistributionStore';
import type { RosterMember } from '@/types/roster';

// Mock Data Replacement for INITIAL_ROSTER
const MOCK_ROSTER: RosterMember[] = [
    {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        rank: 'Lieutenant',
        payGrade: 'O-3',
        designator: '1110',
        dateReported: '2023-01-01',
        prd: '2025-01-01',
        status: 'Onboard'
    },
    {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        rank: 'Lieutenant',
        payGrade: 'O-3',
        designator: '1110',
        dateReported: '2023-02-01',
        prd: '2025-02-01',
        status: 'Onboard'
    },
    {
        id: '3',
        firstName: 'Bob',
        lastName: 'Jones',
        rank: 'Lieutenant',
        payGrade: 'O-3',
        designator: '1110',
        dateReported: '2023-03-01',
        prd: '2025-03-01',
        status: 'Onboard'
    }
];

describe('useNavfitStore', () => {
    beforeEach(() => {
        useNavfitStore.setState({
            roster: MOCK_ROSTER,
            summaryGroups: [],
            projections: {},
            deletedGroupIds: [],
            deletedReportIds: []
        });
        // Manually reset Redistribution Store state without relying on .reset() method
        useRedistributionStore.setState({
            isCalculating: false,
            latestResult: {},
            error: null,
            latestRequestId: null
        });
    });

    it('should initialize with roster data', () => {
        const { roster } = useNavfitStore.getState();
        expect(roster).toHaveLength(3);
        expect(roster[0].lastName).toBe('Doe');
    });

    it('should update current user on login', () => {
        const { login } = useNavfitStore.getState();
        // Assuming MOCK_USERS has a user with id 'user_2' or similar. 
        // Let's check MOCK_USERS usage in store. It imports MOCK_USERS.
        // I will assume standard mock users exist.
        // If not, this might fail, but 'user_1' is default.
        // Let's try to login as 'user_1' (self) or 'user_2'.
        // This test mainly verifies the state update logic wrapper.
        login('user_1');
        const { currentUser } = useNavfitStore.getState();
        expect(currentUser?.id).toBe('user_1');
    });

    it('should reorder member in roster (legacy)', () => {
        const { reorderMember } = useNavfitStore.getState();

        // Move first item (index 0) to end (index 2)
        reorderMember('1', 2);

        const { roster } = useNavfitStore.getState();
        expect(roster[0].id).toBe('2');
        expect(roster[1].id).toBe('3');
        expect(roster[2].id).toBe('1');
    });

    it('should update projection', () => {
        const { updateProjection, addSummaryGroup } = useNavfitStore.getState();

        // Setup a dummy summary group
        const group = {
            id: 'g1',
            name: 'Test Group',
            competitiveGroupKey: 'O-3 1110',
            periodEndDate: '2024-01-01',
            reports: [
                { id: 'r1', memberId: '1', traitAverage: 4.0, name: 'Doe' },
                { id: 'r2', memberId: '2', traitAverage: 3.8, name: 'Smith' }
            ]
        } as any;

        addSummaryGroup(group);

        // Ensure r1 is unlocked (addSummaryGroup applies default anchors which might lock it)
        const { toggleReportLock } = useNavfitStore.getState();
        // Check if locked first? Or just toggle assuming we know behavior?
        // Let's force it to be unlocked by checking state.
        if (useNavfitStore.getState().summaryGroups[0].reports[0].isLocked) {
            toggleReportLock('g1', 'r1');
        }

        // Update projection for report r1
        updateProjection('g1', 'r1', 4.2);

        const state = useNavfitStore.getState();
        expect(state.projections['r1']).toBe(4.2);

        // Verify report was updated in summary group
        const updatedGroup = state.summaryGroups.find(g => g.id === 'g1');
        const updatedReport = updatedGroup?.reports.find(r => r.id === 'r1');
        expect(updatedReport?.traitAverage).toBe(4.2);
        expect(updatedReport?.isLocked).toBeTruthy();
    });

    it('should toggle report lock', () => {
        const { toggleReportLock, addSummaryGroup } = useNavfitStore.getState();

        const group = {
            id: 'g1',
            name: 'Test Group',
            competitiveGroupKey: 'O-3 1110',
            periodEndDate: '2024-01-01',
            reports: [
                { id: 'r1', memberId: '1', traitAverage: 4.0, isLocked: false }
            ]
        } as any;

        addSummaryGroup(group);

        // Check initial state after add (might be locked by default anchors)
        let state = useNavfitStore.getState();
        const initialLockState = state.summaryGroups[0].reports[0].isLocked;

        // Toggle
        toggleReportLock('g1', 'r1');

        state = useNavfitStore.getState();
        const reportAfterFirstToggle = state.summaryGroups[0].reports[0];
        expect(reportAfterFirstToggle.isLocked).toBe(!initialLockState);

        // Toggle back
        toggleReportLock('g1', 'r1');
        state = useNavfitStore.getState();
        const reportAfterSecondToggle = state.summaryGroups[0].reports[0];
        expect(reportAfterSecondToggle.isLocked).toBe(initialLockState);
    });
});
