// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { CycleContextPanel } from './CycleContextPanel';
import { useNavfitStore } from '@/store/useNavfitStore';
import { SummaryGroup, Report, Member } from '@/types';
import { PromotionRecommendation } from '@/domain/policy/types';

expect.extend(matchers);

// Mock dependencies if needed
vi.mock('@/features/dashboard/components/MemberDetailSidebar', () => ({
    MemberDetailSidebar: ({ onUpdatePromRec, memberId }: any) => (
        <div data-testid="member-sidebar">
            <button
                data-testid="update-ep"
                onClick={() => onUpdatePromRec(memberId, 'EP')}
            >
                Set EP
            </button>
            <button
                data-testid="update-mp"
                onClick={() => onUpdatePromRec(memberId, 'MP')}
            >
                Set MP
            </button>
        </div>
    )
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

describe('CycleContextPanel Integration', () => {
    const mockReports: Report[] = [
        {
            id: 'r1',
            memberId: 'm1',
            traitAverage: 4.0,
            promotionRecommendation: 'P',
            periodEndDate: '2023-11-30',
            firstName: 'John',
            lastName: 'Doe',
            rank: 'LT',
            paygrade: 'O3',
            reportsRemaining: 1,
            isLocked: false,
            isAdverse: false,
            promotionStatus: 'REGULAR',
            draftStatus: 'Draft',
            traitGrades: {
                performance: 4.0,
                leadership: 4.0,
                militaryBearing: 4.0,
                teamwork: 4.0,
                missionAccomplishment: 4.0,
                tacticalPerformance: 4.0
            }
        },
        {
            id: 'r2',
            memberId: 'm2',
            traitAverage: 3.8,
            promotionRecommendation: 'P',
            periodEndDate: '2023-11-30',
            firstName: 'Jane',
            lastName: 'Smith',
            rank: 'LT',
            paygrade: 'O3',
            reportsRemaining: 2,
            isLocked: false,
            isAdverse: false,
            promotionStatus: 'REGULAR',
            draftStatus: 'Draft',
            traitGrades: {
                performance: 3.0,
                leadership: 4.0,
                militaryBearing: 3.0,
                teamwork: 4.0,
                missionAccomplishment: 4.0,
                tacticalPerformance: 4.0
            }
        }
    ];

    const mockGroup: SummaryGroup = {
        id: 'g1',
        name: 'Test Group',
        reports: mockReports,
        paygrade: 'O3',
        status: 'Draft',
        periodEndDate: '2023-11-30',
        promotionStatus: 'REGULAR',
        reportingSeniorId: 'rs1',
        competitiveGroupKey: 'O3'
    };

    const mockRoster: any[] = [
        { id: 'm1', firstName: 'John', lastName: 'Doe', rank: 'LT', payGrade: 'O-3', designator: '1110' },
        { id: 'm2', firstName: 'Jane', lastName: 'Smith', rank: 'LT', payGrade: 'O-3', designator: '1110' }
    ];

    beforeEach(() => {
        const store = useNavfitStore.getState();
        store.setSummaryGroups([mockGroup]);
        store.setRoster(mockRoster);
        store.selectMember(null);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('updates promotion recommendation via store action and updates UI', async () => {
        // 1. Render Component
        render(<CycleContextPanel group={mockGroup} />);

        // Verify initial state (0 EP)
        // Check badgess
        expect(screen.getAllByText('P').length).toBeGreaterThan(0);

        // 2. Select Member to open Sidebar
        // Act: Select Member 1
        const rows = screen.getAllByText('Doe, John');
        fireEvent.click(rows[0]);

        // 3. Verify Sidebar Open
        expect(await screen.findByTestId('member-sidebar')).toBeInTheDocument();

        // 4. Trigger Update (Set EP)
        fireEvent.click(screen.getByTestId('update-ep'));

        // 5. Verify Store Updated
        const store = useNavfitStore.getState();
        const updatedGroup = store.summaryGroups.find(g => g.id === 'g1');
        const updatedReport = updatedGroup?.reports.find(r => r.id === 'r1');
        expect(updatedReport?.promotionRecommendation).toBe('EP');

        // 6. Verify UI Updates (CycleContextPanel re-renders)
        // Wait for re-render
        await waitFor(() => {
            // "EP" should exist in the document now.
            expect(screen.getByText('EP')).toBeInTheDocument();
        });
    });
});
