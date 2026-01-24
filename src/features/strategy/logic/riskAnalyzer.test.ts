import { describe, it, expect } from 'vitest';
import {
    analyzeTrajectoryRisk,
    calculateTrajectoryHealth,
    calculateRiskSeverity,
    calculateRecoveryPlan,
    generateRecommendations,
    type TrajectoryPoint
} from './riskAnalyzer';

describe('Risk Analyzer', () => {

    describe('calculateTrajectoryHealth', () => {
        it('should identify improving trajectory', () => {
            const trajectory: TrajectoryPoint[] = [
                {
                    date: Date.parse('2023-01-01'),
                    rsca: 3.5,
                    target: 4.0,
                    margin: 0.5,
                    groupName: 'Period 1',
                    groupId: '1',
                    compKey: 'Test',
                    isProjected: false,
                    optimalMta: 3.5,
                    memberCount: 10
                },
                {
                    date: Date.parse('2023-06-01'),
                    rsca: 3.8,
                    target: 4.0,
                    margin: 0.2,
                    groupName: 'Period 2',
                    groupId: '2',
                    compKey: 'Test',
                    isProjected: false,
                    optimalMta: 4.1,
                    memberCount: 10
                },
                {
                    date: Date.parse('2024-01-01'),
                    rsca: 4.0,
                    target: 4.0,
                    margin: 0.0,
                    groupName: 'Period 3',
                    groupId: '3',
                    compKey: 'Test',
                    isProjected: true,
                    optimalMta: 4.2,
                    memberCount: 10
                }
            ];

            const health = calculateTrajectoryHealth(trajectory);

            expect(health.direction).toBe('improving');
            expect(health.velocity).toBeGreaterThan(0);
        });

        it('should identify degrading trajectory', () => {
            const trajectory: TrajectoryPoint[] = [
                {
                    date: Date.parse('2023-01-01'),
                    rsca: 4.2,
                    target: 4.0,
                    margin: -0.2,
                    groupName: 'Period 1',
                    groupId: '1',
                    compKey: 'Test',
                    isProjected: false,
                    optimalMta: 4.2,
                    memberCount: 10
                },
                {
                    date: Date.parse('2024-01-01'),
                    rsca: 4.5,
                    target: 4.0,
                    margin: -0.5,
                    groupName: 'Period 2',
                    groupId: '2',
                    compKey: 'Test',
                    isProjected: true,
                    optimalMta: 4.8,
                    memberCount: 10
                }
            ];

            const health = calculateTrajectoryHealth(trajectory);

            expect(health.direction).toBe('degrading');
        });

        it('should identify stable trajectory', () => {
            const trajectory: TrajectoryPoint[] = [
                {
                    date: Date.parse('2023-01-01'),
                    rsca: 4.0,
                    target: 4.0,
                    margin: 0.0,
                    groupName: 'Period 1',
                    groupId: '1',
                    compKey: 'Test',
                    isProjected: false,
                    optimalMta: 4.0,
                    memberCount: 10
                },
                {
                    date: Date.parse('2024-01-01'),
                    rsca: 4.0,
                    target: 4.0,
                    margin: 0.0,
                    groupName: 'Period 2',
                    groupId: '2',
                    compKey: 'Test',
                    isProjected: true,
                    optimalMta: 4.0,
                    memberCount: 10
                }
            ];

            const health = calculateTrajectoryHealth(trajectory);

            expect(health.direction).toBe('stable');
            expect(health.isStable).toBe(true);
        });
    });

    describe('calculateRiskSeverity', () => {
        it('should classify excellent trajectory', () => {
            const health = {
                direction: 'stable' as const,
                velocity: 0,
                volatility: 0.05,
                isStable: true
            };

            const severity = calculateRiskSeverity(4.0, 0.0, health, 5);

            expect(severity).toBe('excellent');
        });

        it('should classify critical when RSCA too low', () => {
            const health = {
                direction: 'stable' as const,
                velocity: 0,
                volatility: 0.1,
                isStable: false
            };

            const severity = calculateRiskSeverity(3.4, -0.2, health, 5);

            expect(severity).toBe('critical');
        });

        it('should classify emergency when margin severely negative', () => {
            const health = {
                direction: 'degrading' as const,
                velocity: -0.2,
                volatility: 0.2,
                isStable: false
            };

            const severity = calculateRiskSeverity(4.8, -0.4, health, 2);

            expect(severity).toBe('emergency');
        });

        it('should elevate warning to critical when time is short', () => {
            const health = {
                direction: 'stable' as const,
                velocity: 0,
                volatility: 0.1,
                isStable: false
            };

            // RSCA 3.7 is in warning range (outside safe zone)
            const severity = calculateRiskSeverity(3.7, 0.1, health, 1);

            expect(severity).toBe('critical');
        });
    });

    describe('calculateRecoveryPlan', () => {
        it('should calculate easy recovery with plenty of time', () => {
            // Current: 3.5 RSCA with 10 reports
            // Target: 4.0 RSCA
            // Reports remaining: 5
            const currentRsca = 3.5;
            const currentTotalScore = 3.5 * 10;
            const currentTotalReports = 10;
            const reportsRemaining = 5;

            const recovery = calculateRecoveryPlan(
                currentRsca,
                currentTotalScore,
                currentTotalReports,
                reportsRemaining,
                4.0
            );

            expect(recovery.isRecoverable).toBe(true);
            expect(recovery.difficulty).toBe('easy');
            expect(recovery.requiredMtaRange.min).toBeGreaterThan(4.0);
            expect(recovery.requiredMtaRange.max).toBeLessThanOrEqual(5.0);
        });

        it('should identify impossible recovery', () => {
            // Current: 2.5 RSCA with 10 reports
            // Target: 4.0 RSCA
            // Reports remaining: 1
            // Would need MTA > 5.0 to recover
            const currentRsca = 2.5;
            const currentTotalScore = 2.5 * 10;
            const currentTotalReports = 10;
            const reportsRemaining = 1;

            const recovery = calculateRecoveryPlan(
                currentRsca,
                currentTotalScore,
                currentTotalReports,
                reportsRemaining,
                4.0
            );

            expect(recovery.isRecoverable).toBe(false);
            expect(recovery.difficulty).toBe('impossible');
        });

        it('should handle high RSCA correction', () => {
            // Current: 4.6 RSCA with 10 reports
            // Target: 4.0 RSCA
            // Reports remaining: 2
            const currentRsca = 4.6;
            const currentTotalScore = 4.6 * 10;
            const currentTotalReports = 10;
            const reportsRemaining = 2;

            const recovery = calculateRecoveryPlan(
                currentRsca,
                currentTotalScore,
                currentTotalReports,
                reportsRemaining,
                4.0
            );

            expect(recovery.isRecoverable).toBe(true);
            expect(recovery.requiredMtaRange.min).toBeLessThan(currentRsca);
            expect(recovery.requiredMtaRange.min).toBeGreaterThanOrEqual(2.0);
        });
    });

    describe('generateRecommendations', () => {
        it('should provide urgent recommendations for critical severity', () => {
            const recovery = {
                isRecoverable: true,
                reportsNeeded: 2,
                requiredMtaRange: { min: 4.5, max: 4.7 },
                difficulty: 'difficult' as const,
                estimatedEndRsca: 3.9
            };

            const health = {
                direction: 'degrading' as const,
                velocity: -0.1,
                volatility: 0.2,
                isStable: false
            };

            const recommendations = generateRecommendations(
                'critical',
                3.5,
                recovery,
                health,
                2
            );

            expect(recommendations.primary).toContain('URGENT');
            expect(recommendations.primary).toContain('4.5');
        });

        it('should provide maintenance recommendations for excellent trajectory', () => {
            const recovery = {
                isRecoverable: true,
                reportsNeeded: 1,
                requiredMtaRange: { min: 3.9, max: 4.1 },
                difficulty: 'easy' as const,
                estimatedEndRsca: 4.0
            };

            const health = {
                direction: 'stable' as const,
                velocity: 0,
                volatility: 0.05,
                isStable: true
            };

            const recommendations = generateRecommendations(
                'excellent',
                4.0,
                recovery,
                health,
                5
            );

            expect(recommendations.primary).toContain('Continue current strategy');
            expect(recommendations.warnings.length).toBe(0);
        });

        it('should warn about impossible recovery', () => {
            const recovery = {
                isRecoverable: false,
                reportsNeeded: 1,
                requiredMtaRange: { min: 2.0, max: 5.0 },
                difficulty: 'impossible' as const,
                estimatedEndRsca: 3.2
            };

            const health = {
                direction: 'stable' as const,
                velocity: 0,
                volatility: 0.1,
                isStable: false
            };

            const recommendations = generateRecommendations(
                'emergency',
                2.8,
                recovery,
                health,
                1
            );

            expect(recommendations.warnings.some(w => w.includes('not be achievable'))).toBe(true);
        });
    });

    describe('analyzeTrajectoryRisk - Integration', () => {
        it('should provide complete analysis for healthy trajectory', () => {
            const trajectory: TrajectoryPoint[] = [
                {
                    date: Date.parse('2023-01-01'),
                    rsca: 3.9,
                    target: 4.0,
                    margin: 0.1,
                    groupName: 'Past',
                    groupId: '1',
                    compKey: 'Test',
                    isProjected: false,
                    optimalMta: 3.9,
                    memberCount: 10
                },
                {
                    date: Date.parse('2024-01-01'),
                    rsca: 4.0,
                    target: 4.0,
                    margin: 0.0,
                    groupName: 'Future',
                    groupId: '2',
                    compKey: 'Test',
                    isProjected: true,
                    optimalMta: 4.1,
                    memberCount: 10
                }
            ];

            const analysis = analyzeTrajectoryRisk(trajectory);

            expect(analysis.severity).toMatch(/excellent|good/);
            expect(analysis.currentRsca).toBe(3.9);
            expect(analysis.projectedEndRsca).toBe(4.0);
            expect(analysis.reportsRemaining).toBe(1);
            expect(analysis.recovery.isRecoverable).toBe(true);
        });

        it('should classify as EASY recovery with 3 reports and low RSCA', () => {
            // Time-Horizon Test: Plenty of time (3 reports) to recover from 3.5 RSCA
            const trajectory: TrajectoryPoint[] = [
                {
                    date: Date.parse('2023-01-01'),
                    rsca: 3.5,
                    target: 4.0,
                    margin: 0.5,
                    groupName: 'Past',
                    groupId: '1',
                    compKey: 'Test',
                    isProjected: false,
                    optimalMta: 3.5,
                    memberCount: 10
                },
                {
                    date: Date.parse('2024-01-01'),
                    rsca: 3.7,
                    target: 4.0,
                    margin: 0.3,
                    groupName: 'Future 1',
                    groupId: '2',
                    compKey: 'Test',
                    isProjected: true,
                    optimalMta: 4.3,
                    memberCount: 10
                },
                {
                    date: Date.parse('2024-06-01'),
                    rsca: 3.85,
                    target: 4.0,
                    margin: 0.15,
                    groupName: 'Future 2',
                    groupId: '3',
                    compKey: 'Test',
                    isProjected: true,
                    optimalMta: 4.4,
                    memberCount: 10
                },
                {
                    date: Date.parse('2025-01-01'),
                    rsca: 4.0,
                    target: 4.0,
                    margin: 0.0,
                    groupName: 'Future 3',
                    groupId: '4',
                    compKey: 'Test',
                    isProjected: true,
                    optimalMta: 4.5,
                    memberCount: 10
                }
            ];

            const analysis = analyzeTrajectoryRisk(trajectory);

            expect(analysis.currentRsca).toBe(3.5);
            expect(analysis.reportsRemaining).toBe(3);
            expect(analysis.recovery.difficulty).toBe('easy');
            expect(analysis.severity).toMatch(/warning|caution/); // Outside safe zone but recoverable
            expect(analysis.recommendations.primary).not.toContain('URGENT'); // Should be gradual, not urgent
        });

        it('should classify as DIFFICULT recovery with 3 reports and very low RSCA', () => {
            // Time-Horizon Test: 3 reports but starting from 3.2 RSCA (very low)
            const trajectory: TrajectoryPoint[] = [
                {
                    date: Date.parse('2023-01-01'),
                    rsca: 3.2,
                    target: 4.0,
                    margin: 0.8,
                    groupName: 'Past',
                    groupId: '1',
                    compKey: 'Test',
                    isProjected: false,
                    optimalMta: 3.2,
                    memberCount: 10
                },
                {
                    date: Date.parse('2024-01-01'),
                    rsca: 3.5,
                    target: 4.0,
                    margin: 0.5,
                    groupName: 'Future 1',
                    groupId: '2',
                    compKey: 'Test',
                    isProjected: true,
                    optimalMta: 4.8,
                    memberCount: 10
                },
                {
                    date: Date.parse('2024-06-01'),
                    rsca: 3.75,
                    target: 4.0,
                    margin: 0.25,
                    groupName: 'Future 2',
                    groupId: '3',
                    compKey: 'Test',
                    isProjected: true,
                    optimalMta: 4.9,
                    memberCount: 10
                },
                {
                    date: Date.parse('2025-01-01'),
                    rsca: 4.0,
                    target: 4.0,
                    margin: 0.0,
                    groupName: 'Future 3',
                    groupId: '4',
                    compKey: 'Test',
                    isProjected: true,
                    optimalMta: 5.0,
                    memberCount: 10
                }
            ];

            const analysis = analyzeTrajectoryRisk(trajectory);

            expect(analysis.currentRsca).toBe(3.2);
            expect(analysis.reportsRemaining).toBe(3);
            expect(analysis.recovery.difficulty).toMatch(/difficult|moderate/);
            expect(analysis.severity).toMatch(/critical|warning/);
            // Should recommend high MTAs (close to 5.0)
            expect(analysis.recovery.requiredMtaRange.max).toBeGreaterThan(4.5);
        });

        it('should classify as EASY recovery with 3 reports and high RSCA', () => {
            // Time-Horizon Test: 3 reports to correct from 4.3 RSCA (slightly high)
            const trajectory: TrajectoryPoint[] = [
                {
                    date: Date.parse('2023-01-01'),
                    rsca: 4.3,
                    target: 4.0,
                    margin: -0.3,
                    groupName: 'Past',
                    groupId: '1',
                    compKey: 'Test',
                    isProjected: false,
                    optimalMta: 4.3,
                    memberCount: 10
                },
                {
                    date: Date.parse('2024-01-01'),
                    rsca: 4.2,
                    target: 4.0,
                    margin: -0.2,
                    groupName: 'Future 1',
                    groupId: '2',
                    compKey: 'Test',
                    isProjected: true,
                    optimalMta: 3.7,
                    memberCount: 10
                },
                {
                    date: Date.parse('2024-06-01'),
                    rsca: 4.1,
                    target: 4.0,
                    margin: -0.1,
                    groupName: 'Future 2',
                    groupId: '3',
                    compKey: 'Test',
                    isProjected: true,
                    optimalMta: 3.5,
                    memberCount: 10
                },
                {
                    date: Date.parse('2025-01-01'),
                    rsca: 4.0,
                    target: 4.0,
                    margin: 0.0,
                    groupName: 'Future 3',
                    groupId: '4',
                    compKey: 'Test',
                    isProjected: true,
                    optimalMta: 3.3,
                    memberCount: 10
                }
            ];

            const analysis = analyzeTrajectoryRisk(trajectory);

            expect(analysis.currentRsca).toBe(4.3);
            expect(analysis.reportsRemaining).toBe(3);
            expect(analysis.recovery.difficulty).toBe('easy');
            expect(analysis.severity).toMatch(/warning|caution/); // Slightly outside safe zone
            // Should recommend lower MTAs (around 3.5-3.8)
            expect(analysis.recovery.requiredMtaRange.min).toBeLessThan(4.0);
        });

        it('should classify as DIFFICULT recovery with 3 reports and very high RSCA', () => {
            // Time-Horizon Test: 3 reports but starting from 4.7 RSCA (very high)
            const trajectory: TrajectoryPoint[] = [
                {
                    date: Date.parse('2023-01-01'),
                    rsca: 4.7,
                    target: 4.0,
                    margin: -0.7,
                    groupName: 'Past',
                    groupId: '1',
                    compKey: 'Test',
                    isProjected: false,
                    optimalMta: 4.7,
                    memberCount: 10
                },
                {
                    date: Date.parse('2024-01-01'),
                    rsca: 4.5,
                    target: 4.0,
                    margin: -0.5,
                    groupName: 'Future 1',
                    groupId: '2',
                    compKey: 'Test',
                    isProjected: true,
                    optimalMta: 2.5,
                    memberCount: 10
                },
                {
                    date: Date.parse('2024-06-01'),
                    rsca: 4.25,
                    target: 4.0,
                    margin: -0.25,
                    groupName: 'Future 2',
                    groupId: '3',
                    compKey: 'Test',
                    isProjected: true,
                    optimalMta: 2.3,
                    memberCount: 10
                },
                {
                    date: Date.parse('2025-01-01'),
                    rsca: 4.0,
                    target: 4.0,
                    margin: 0.0,
                    groupName: 'Future 3',
                    groupId: '4',
                    compKey: 'Test',
                    isProjected: true,
                    optimalMta: 2.0,
                    memberCount: 10
                }
            ];

            const analysis = analyzeTrajectoryRisk(trajectory);

            expect(analysis.currentRsca).toBe(4.7);
            expect(analysis.reportsRemaining).toBe(3);
            expect(analysis.recovery.difficulty).toMatch(/difficult|moderate/);
            expect(analysis.severity).toBe('critical'); // Way above safe zone
            // Should recommend very low MTAs (close to 2.0)
            expect(analysis.recovery.requiredMtaRange.min).toBeLessThan(3.0);
        });

        it('should identify critical situation requiring urgent action', () => {
            const trajectory: TrajectoryPoint[] = [
                {
                    date: Date.parse('2023-01-01'),
                    rsca: 3.3,
                    target: 4.0,
                    margin: 0.7,
                    groupName: 'Past',
                    groupId: '1',
                    compKey: 'Test',
                    isProjected: false,
                    optimalMta: 3.3,
                    memberCount: 10
                },
                {
                    date: Date.parse('2024-01-01'),
                    rsca: 3.6,
                    target: 4.0,
                    margin: 0.4,
                    groupName: 'Last Chance',
                    groupId: '2',
                    compKey: 'Test',
                    isProjected: true,
                    optimalMta: 4.8,
                    memberCount: 10
                }
            ];

            const analysis = analyzeTrajectoryRisk(trajectory);

            expect(analysis.severity).toMatch(/critical|warning/);
            expect(analysis.recommendations.primary).toContain('URGENT');
        });

        it('should throw error for empty trajectory', () => {
            expect(() => analyzeTrajectoryRisk([])).toThrow('Cannot analyze empty trajectory');
        });

        it('should throw error for trajectory with no historical data', () => {
            const trajectory: TrajectoryPoint[] = [
                {
                    date: Date.parse('2024-01-01'),
                    rsca: 4.0,
                    target: 4.0,
                    margin: 0.0,
                    groupName: 'Future',
                    groupId: '1',
                    compKey: 'Test',
                    isProjected: true,
                    optimalMta: 4.0,
                    memberCount: 10
                }
            ];

            expect(() => analyzeTrajectoryRisk(trajectory)).toThrow('no historical data');
        });
    });
});
