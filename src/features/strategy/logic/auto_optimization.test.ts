
import { describe, it, expect } from 'vitest';
import { calculateOptimizedTrajectory } from './optimizer';
import type { SummaryGroup } from '@/types';

// Mock Data Helper
const createMockGroup = (id: string, date: string, status: 'Draft' | 'Planned' | 'Total Members' | 'Final', reports: any[]): SummaryGroup => ({
    id,
    name: 'Test Group',
    periodEndDate: date,
    status: status as any,
    reports,
    competitiveGroupKey: 'O-3 URL',
    paygrade: 'O-3',
    designator: '1110'
});

const createMockReport = (traitAverage: number, type: 'Periodic' | 'Detachment' = 'Periodic'): any => ({
    traitAverage,
    type,
    promotionRecommendation: 'P',
    notObservedReport: false,
    periodEndDate: '2025-01-31'
});

describe('Auto Optimization Logic', () => {

    it('should set isEot flag on the last trajectory point', () => {
        const groups = [
            createMockGroup('g1', '2024-01-31', 'Final', [createMockReport(4.0)]),
            createMockGroup('g2', '2025-01-31', 'Planned', [createMockReport(0.0)]) // Placeholder
        ];

        const trajectory = calculateOptimizedTrajectory(groups, 4.0);

        expect(trajectory).toHaveLength(2);
        expect(trajectory[0].isEot).toBeFalsy();
        expect(trajectory[1].isEot).toBe(true);
    });

    it('should auto-optimize a Planned group to meet target RSCA', () => {
        // G1: Final, 4.0. RSCA = 4.0.
        // G2: Planned. We have 1 report. We want Cumulative <= 4.20.
        // (4.0 * 1 + X * 1) / 2 = 4.20
        // 4.0 + X = 8.4
        // X = 4.40.

        const groups = [
            createMockGroup('g1', '2024-01-31', 'Final', [createMockReport(4.0)]),
            createMockGroup('g2', '2025-01-31', 'Planned', [createMockReport(0.0)])
        ];

        const trajectory = calculateOptimizedTrajectory(groups, 4.20);

        const plannedPoint = trajectory[1];
        expect(plannedPoint.isProjected).toBe(true);
        expect(plannedPoint.optimalMta).toBeCloseTo(4.40);
        // RSCA should be exactly 4.20
        expect(plannedPoint.rsca).toBeCloseTo(4.20);
    });

    it('should clamp optimized MTA to 5.00', () => {
        // G1: Final, 4.0.
        // G2: Planned. Target 5.0 (impossible high average needed? No, let's say target is high enough)
        // Let's say Target is 4.8.
        // (4.0 + X) / 2 = 4.8 => 4.0 + X = 9.6 => X = 5.6. -> Clamped to 5.0.

        const groups = [
            createMockGroup('g1', '2024-01-31', 'Final', [createMockReport(4.0)]),
            createMockGroup('g2', '2025-01-31', 'Planned', [createMockReport(0.0)])
        ];

        const trajectory = calculateOptimizedTrajectory(groups, 4.80);
        const plannedPoint = trajectory[1];

        expect(plannedPoint.optimalMta).toBe(5.00);
        // Resulting RSCA: (4.0 + 5.0) / 2 = 4.5.
        expect(plannedPoint.rsca).toBeCloseTo(4.50);
    });
});
