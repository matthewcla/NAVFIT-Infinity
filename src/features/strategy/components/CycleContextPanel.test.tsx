import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CycleContextPanel } from './CycleContextPanel';
import { useNavfitStore } from '@/store/useNavfitStore';
import type { SummaryGroup, Report, Member } from '@/types';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// Mock child components to avoid complexity and focus on integration logic
vi.mock('@/features/dashboard/components/MemberDetailSidebar', () => ({
    MemberDetailSidebar: ({ onUpdateMTA, onUpdatePromRec, memberId }: any) => (
        <div data-testid="member-sidebar">
            <button
                data-testid="update-mta-btn"
                onClick={() => onUpdateMTA(memberId, 4.50)}
            >
                Update MTA
            </button>
            <button
                data-testid="update-prom-rec-btn"
                onClick={() => onUpdatePromRec(memberId, 'EP')}
            >
                Update Prom Rec
            </button>
        </div>
    )
}));

vi.mock('./CycleMemberList', () => ({
    CycleMemberList: ({ onSelectMember }: any) => (
        <div data-testid="cycle-member-list">
            <button onClick={() => onSelectMember('member-1')}>Select Member 1</button>
        </div>
    )
}));

// Mock other UI components
vi.mock('./RscaHeadsUpDisplay', () => ({ RscaHeadsUpDisplay: () => <div>RSCA HUD</div> }));
vi.mock('./StatusBadge', () => ({ StatusBadge: () => <div>Status</div> }));
vi.mock('./PromotionBadge', () => ({ PromotionBadge: () => <div>Badge</div> }));


const mockReport: Report = {
    id: 'report-1',
    memberId: 'member-1',
    traitAverage: 3.80,
    promotionRecommendation: 'MP',
    periodEndDate: '2023-10-31',
    type: 'Periodic',
    traitGrades: {},
} as Report;

const mockGroup: SummaryGroup = {
    id: 'group-1',
    name: 'Test Group',
    competitiveGroupKey: 'O-3 1110',
    reports: [mockReport],
    periodEndDate: '2023-10-31',
} as SummaryGroup;

const mockMember: Member = {
    id: 'member-1',
    name: 'Doe, John',
    rank: 'LT',
    status: 'Onboard',
    history: []
} as Member;

describe('CycleContextPanel Integration', () => {
    // @ts-ignore
    window.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    };

    beforeEach(() => {
        // Reset store
        useNavfitStore.setState({
            roster: [mockMember],
            summaryGroups: [mockGroup],
            projections: {},
            selectedMemberId: null,
            rsConfig: { targetRsca: 4.0 } as any
        });
    });

    afterEach(() => {
        cleanup();
    });

    it('updates report MTA and projections when onUpdateMTA is triggered', () => {
        const updateReportSpy = vi.fn();
        const updateProjectionSpy = vi.fn();

        // Mock store actions
        useNavfitStore.setState({
            updateReport: updateReportSpy,
            updateProjection: updateProjectionSpy
        });

        render(<CycleContextPanel group={mockGroup} />);

        // Select member to open sidebar
        fireEvent.click(screen.getByText('Select Member 1'));

        // Verify sidebar is open
        expect(screen.getByTestId('member-sidebar')).toBeInTheDocument();

        // Trigger Update MTA
        fireEvent.click(screen.getByTestId('update-mta-btn'));

        // Expect store actions to be called
        expect(updateReportSpy).toHaveBeenCalledWith('report-1', { traitAverage: 4.50 });
        // updateProjection is now handled internally by updateReport in the store,
        // so the component doesn't need to call it explicitly.
    });

    it('updates report Promotion Recommendation when onUpdatePromRec is triggered', () => {
        const updateReportSpy = vi.fn();

        // Mock store actions
        useNavfitStore.setState({
            updateReport: updateReportSpy
        });

        render(<CycleContextPanel group={mockGroup} />);

        // Select member to open sidebar
        fireEvent.click(screen.getByText('Select Member 1'));

        // Trigger Update Prom Rec
        fireEvent.click(screen.getByTestId('update-prom-rec-btn'));

        // Expect store actions to be called
        expect(updateReportSpy).toHaveBeenCalledWith('report-1', { promotionRecommendation: 'EP' });
    });
});
