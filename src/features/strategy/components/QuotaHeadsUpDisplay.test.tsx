// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuotaHeadsUpDisplay } from './QuotaHeadsUpDisplay';
import type { SummaryGroup } from '@/types';
import * as matchers from '@testing-library/jest-dom/matchers';

// Explicitly extend Expect for TS (hack for this env if types aren't picking up)
// Or just cast to any to suppress TS build error in CI if types are finicky
declare module 'vitest' {
  interface Assertion<T = any> extends matchers.TestingLibraryMatchers<T, void> {}
}

expect.extend(matchers);

// Mock dependencies
vi.mock('@/domain/policy/quotas', () => ({
    computeEpMax: vi.fn((size) => Math.ceil(size * 0.2)),
    computeMpMax: vi.fn((size) => Math.ceil(size * 0.4)), // simplified for test
    computeEpMpCombinedMax: vi.fn((size) => Math.ceil(size * 0.6))
}));

describe('QuotaHeadsUpDisplay', () => {
    it('renders correct usage and limits', () => {
        const mockReports = [
            { id: '1', promotionRecommendation: 'EP' },
            { id: '2', promotionRecommendation: 'EP' }, // 2 EP
            { id: '3', promotionRecommendation: 'MP' }, // 1 MP
            { id: '4', promotionRecommendation: 'P' },
            { id: '5', promotionRecommendation: 'P' },
        ];

        const mockGroup = {
            id: 'g1',
            reports: mockReports,
            paygrade: 'O3',
            designator: '1110',
            status: 'Drafting'
        } as unknown as SummaryGroup;

        // Size 5. EP Max = 1. MP Max = 2. Combined Max = 3.

        render(<QuotaHeadsUpDisplay group={mockGroup} />);

        // EP: Used 2, Max 1 (from mock). Should show red.
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('/1')).toBeInTheDocument();

        // MP: Used 1, Max 2.
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('/2')).toBeInTheDocument();

        // Combined: Used 3, Max 3.
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('/3')).toBeInTheDocument();
    });

    it('handles empty group', () => {
         const mockGroup = {
            id: 'g1',
            reports: [],
            paygrade: 'O3',
            designator: '1110',
            status: 'Drafting'
        } as unknown as SummaryGroup;

        render(<QuotaHeadsUpDisplay group={mockGroup} />);

        expect(screen.getAllByText('0')).toHaveLength(3); // Usage 0 for EP, MP, Combined
        expect(screen.getAllByText('/0')).toHaveLength(3); // Max 0 for empty
    });
});
