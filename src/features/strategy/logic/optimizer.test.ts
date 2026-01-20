
import { describe, it, expect } from 'vitest';
import { calculateOptimizedTrajectory, distributeMtaByRank } from './optimizer';
import type { SummaryGroup, Report } from '@/types';

describe('Optimizer Logic (Phase 3 Remediation)', () => {

    describe('calculateOptimizedTrajectory', () => {
        it('should clamp optimized MTA to 0.00 even if budget is blown', () => {
            // Fix 1: The Starvation
            // Setup a scenario where we are massively over budget
            const summaryGroups: SummaryGroup[] = [
                {
                    id: 'past',
                    periodEndDate: '2023-01-01',
                    status: 'Final',
                    reports: Array(100).fill({ traitAverage: 10.0 } as Report),
                    competitiveGroupKey: 'Test',
                    paygrade: 'O-3',
                    designator: '1110',
                    name: 'Past'
                },
                {
                    id: 'future',
                    periodEndDate: '2024-01-01',
                    status: 'Draft',
                    reports: Array(10).fill({} as Report), // 10 empty reports
                    competitiveGroupKey: 'Test',
                    paygrade: 'O-3',
                    designator: '1110',
                    name: 'Future'
                }
            ];

            const trajectory = calculateOptimizedTrajectory(summaryGroups, 3.00);

            const futurePoint = trajectory.find(p => p.isProjected);
            expect(futurePoint).toBeDefined();
            expect(futurePoint?.optimalMta).toBe(0.00);
        });
    });

    describe('distributeMtaByRank', () => {
        it('should treat locked members as fixed mass and redistribute remainder', () => {
            // Fix 2: The Mutiny
            // Member 1 Locked at 5.0. Target 4.0. Total Budget = 12.0.
            // Remaining Budget = 7.0 for 2 members -> 3.5 each.

            const reports = [
                { traitAverage: 5.0, isLocked: true, promotionRecommendation: 'EP' },
                { traitAverage: 3.0, isLocked: false, promotionRecommendation: 'MP' },
                { traitAverage: 3.0, isLocked: false, promotionRecommendation: 'MP' },
            ];

            const result = distributeMtaByRank(reports as any[], 4.0);

            expect(result[0]).toBe(5.0); // Locked
            const avgUnlocked = (result[1] + result[2]) / 2;
            expect(avgUnlocked).toBeCloseTo(3.5, 1);
        });

        it('should return fixed values if all are locked', () => {
             const reports = [
                { traitAverage: 5.0, isLocked: true },
                { traitAverage: 4.0, isLocked: true },
            ];
             const result = distributeMtaByRank(reports as any[], 3.0);
             expect(result[0]).toBe(5.0);
             expect(result[1]).toBe(4.0);
        });

        it('should cap MTA at 2.0 for Promotable recommendation', () => {
            // Fix 3: Validation Gaps
             const reports = [
                { traitAverage: 3.0, isLocked: false, promotionRecommendation: 'Promotable' },
            ];
            // Even if Target is 4.0
            const result = distributeMtaByRank(reports as any[], 4.0);
            expect(result[0]).toBeLessThanOrEqual(2.0);
            expect(result[0]).toBe(2.0);
        });

        it('should cap MTA at 2.0 for Progressing/SP', () => {
             const reports = [
                { traitAverage: 3.0, isLocked: false, promotionRecommendation: 'Significant Problems' },
            ];
            const result = distributeMtaByRank(reports as any[], 4.0);
            expect(result[0]).toBeLessThanOrEqual(2.0);
        });
    });

});
