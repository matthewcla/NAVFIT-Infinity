
import { describe, it, expect } from 'vitest';
import { calculateOptimizedTrajectory, distributeMtaByRank } from './optimizer';
import type { SummaryGroup, Report } from '@/types';

describe('Optimizer Logic (Phase 3 Remediation)', () => {

    describe('calculateOptimizedTrajectory', () => {
        it('should apply urgency when few reports remain and off-target (below)', () => {
            // Time-Horizon Awareness Test
            // Scenario: User at 3.5 RSCA with only 1 report remaining
            // Should apply urgent correction to get closer to 4.0
            const summaryGroups: SummaryGroup[] = [
                {
                    id: 'past1',
                    periodEndDate: '2023-01-01',
                    status: 'Final',
                    reports: Array(10).fill({ traitAverage: 3.5 } as Report),
                    competitiveGroupKey: 'Test',
                    paygrade: 'O-3',
                    designator: '1110',
                    name: 'Past Period'
                },
                {
                    id: 'lastChance',
                    periodEndDate: '2024-01-01',
                    status: 'Draft',
                    reports: Array(10).fill({} as Report),
                    competitiveGroupKey: 'Test',
                    paygrade: 'O-3',
                    designator: '1110',
                    name: 'Last Report'
                }
            ];

            const trajectory = calculateOptimizedTrajectory(summaryGroups);
            const lastPoint = trajectory.find(p => p.groupId === 'lastChance');

            expect(lastPoint).toBeDefined();
            // With urgency, MTA should be pushed higher to compensate quickly
            // Base target would be ~3.9, but urgency should push it higher
            expect(lastPoint?.optimalMta).toBeGreaterThan(4.0);
        });

        it('should apply urgency when few reports remain and RSCA too high', () => {
            // Time-Horizon Awareness Test (Pullback)
            // Scenario: User at 4.6 RSCA (way above safe zone) with only 1 report remaining
            // Should apply urgent pullback to get back into 3.8-4.2 safe zone
            const summaryGroups: SummaryGroup[] = [
                {
                    id: 'past1',
                    periodEndDate: '2023-01-01',
                    status: 'Final',
                    reports: Array(10).fill({ traitAverage: 4.6 } as Report),
                    competitiveGroupKey: 'Test',
                    paygrade: 'O-3',
                    designator: '1110',
                    name: 'Past Period - Too High'
                },
                {
                    id: 'correction',
                    periodEndDate: '2024-01-01',
                    status: 'Draft',
                    reports: Array(10).fill({} as Report),
                    competitiveGroupKey: 'Test',
                    paygrade: 'O-3',
                    designator: '1110',
                    name: 'Correction Report'
                }
            ];

            const trajectory = calculateOptimizedTrajectory(summaryGroups);
            const correctionPoint = trajectory.find(p => p.groupId === 'correction');

            expect(correctionPoint).toBeDefined();
            // With urgency, MTA should be pulled down aggressively
            // Should recommend low MTA (< 3.5) to bring cumulative RSCA down
            expect(correctionPoint?.optimalMta).toBeLessThan(3.5);
            expect(correctionPoint?.optimalMta).toBeGreaterThanOrEqual(2.0); // But not below physics limit
        });

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
