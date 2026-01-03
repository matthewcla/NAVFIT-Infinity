import { describe, it, expect } from 'vitest';
import { calculateOutcomeBasedGrades, type Member, type StrategyConfig, DEFAULT_STRATEGY_CONFIG } from './autoPlan';

describe('calculateOutcomeBasedGrades', () => {
    // Helper to create basic members
    const createMember = (id: string, status: string = 'Promotable', reportsRemaining: number = 1): Member => ({
        id,
        rankOrder: 0, // Not used in calculation logic directly, array index is used
        reportsRemaining,
        status,
    });

    it('should calculate grades with basic interpolation between #1 and Floor', () => {
        // Arrange
        const roster: Member[] = [
            createMember('1', 'Promotable', 1),
            createMember('2', 'Promotable', 1),
            createMember('3', 'Promotable', 1),
        ];
        const rscaTarget = 4.00;
        // Defaults: breakoutBonus=0.30, reportsRemainingFactor=0.10, ballastDeduction=0.20
        // Ceiling Calculation for #1:
        // Ceiling = 4.00 + 0.30 - (0.10 * 1) = 4.20
        // Floor Calculation (last Promotable is #3):
        // Floor = 4.00 - 0.20 = 3.80
        // Interpolation:
        // Index 0: 4.20
        // Index 2: 3.80
        // Steps = 2
        // Diff = 0.40
        // StepSize = 0.20
        // Expected:
        // Index 0: 4.20
        // Index 1: 4.00
        // Index 2: 3.80

        // Act
        const result = calculateOutcomeBasedGrades(roster, rscaTarget);

        // Assert
        expect(result[0].proposedTraitAverage).toBe(4.20);
        expect(result[1].proposedTraitAverage).toBe(4.00);
        expect(result[2].proposedTraitAverage).toBe(3.80);
    });

    it('should ensure grades never exceed 5.00', () => {
        // Arrange
        const roster: Member[] = [
            createMember('1', 'Transferring', 0), // Transferring allows ignoring maxGradeCap (4.90) but respects 5.00
            createMember('2', 'Promotable', 1)    // Needed to establish a floor so index 0 is calculated via ceiling logic
        ];
        const rscaTarget = 4.80;
        // breakoutBonus=0.30 -> 5.10
        // Ceiling should be capped at 5.00

        // Act
        const result = calculateOutcomeBasedGrades(roster, rscaTarget);

        // Assert
        expect(result[0].proposedTraitAverage).toBe(5.00);
    });

    it('should respect maxGradeCap (4.90) for non-transferring members', () => {
        // Arrange
        const roster: Member[] = [
            createMember('1', 'Promotable', 0),
            createMember('2', 'Promotable', 1)
        ];
        const rscaTarget = 4.70;
        // breakoutBonus=0.30 -> 5.00
        // maxGradeCap is 4.90 by default

        // Act
        const result = calculateOutcomeBasedGrades(roster, rscaTarget);

        // Assert
        expect(result[0].proposedTraitAverage).toBe(4.90);
    });

    it('should apply floor logic correctly (min ballast grade)', () => {
        // Arrange
        const roster: Member[] = [
            createMember('1', 'Promotable', 1),
            createMember('2', 'Promotable', 1),
        ];
        // Target very low to trigger minBallastGrade
        const rscaTarget = 3.00;
        const config: StrategyConfig = {
            ...DEFAULT_STRATEGY_CONFIG,
            minBallastGrade: 3.60,
            ballastDeduction: 0.20
        };
        // Floor calc: 3.00 - 0.20 = 2.80. Max(2.80, 3.60) = 3.60.

        // Act
        const result = calculateOutcomeBasedGrades(roster, rscaTarget, config);

        // Assert
        // Last promotable is index 1. Should have 3.60.
        expect(result[1].proposedTraitAverage).toBe(3.60);
    });

    it('should handle Retiring status override', () => {
        // Arrange
        const roster: Member[] = [
            createMember('1', 'Retiring', 1),
            createMember('2', 'Promotable', 1) // Needed to establish a floor
        ];
        const rscaTarget = 4.00;
        // Ceiling calc: 4.00 + 0.30 - 0.10 = 4.20
        // But Retiring override says: if grade > rscaTarget, set to rscaTarget.
        // 4.20 > 4.00 -> should become 4.00

        // Act
        const result = calculateOutcomeBasedGrades(roster, rscaTarget);

        // Assert
        expect(result[0].proposedTraitAverage).toBe(4.00);
    });

    it('should not lower Retiring status if grade is already below target', () => {
        // Arrange
        const roster: Member[] = [
            createMember('1', 'Promotable', 1), // Ceiling ~4.20
            createMember('2', 'Retiring', 1),   // Should be lower
            createMember('3', 'Promotable', 1)  // Floor
        ];
        const rscaTarget = 4.00;
        const config: StrategyConfig = {
            ...DEFAULT_STRATEGY_CONFIG,
            ballastDeduction: 1.00 // Force low floor
        };
        // Floor: 3.00 (capped at minBallast 3.60? No, minBallast defaults to 3.60)
        // Let's assume floor ends up being 3.60.
        // Interpolation: #1=4.20, #3=3.60.
        // #2 is halfway? (4.20 + 3.60)/2 = 3.90.
        // #2 is Retiring. 3.90 <= 4.00. Should remain 3.90.

        // Act
        const result = calculateOutcomeBasedGrades(roster, rscaTarget, config);

        // Assert
        // We can't be sure of exact interpolation without doing the math, but we know it should NOT be clamped to 4.00 if it's already below.
        // And since we added a 3rd member, index 1 is now sandwiched.
        expect(result[1].proposedTraitAverage).toBeLessThanOrEqual(4.00);
        expect(result[1].proposedTraitAverage).toBeGreaterThan(3.60);
    });

    it('should not modify locked members', () => {
        // Arrange
        const lockedMember: Member = {
            ...createMember('1', 'Promotable', 1),
            isLocked: true,
            proposedTraitAverage: 4.50
        };
        const roster: Member[] = [lockedMember];
        const rscaTarget = 4.00;

        // Act
        const result = calculateOutcomeBasedGrades(roster, rscaTarget);

        // Assert
        expect(result[0].proposedTraitAverage).toBe(4.50);
    });

    it('should handle roster with no promotable members (fallback)', () => {
        // If no promotable members, floorIndex = -1.
        // Loop runs 0 to length.
        // i <= floorIndex is always false.
        // Enters else block: calculatedGrade = floorGrade.
        // floorGrade logic: floorMember is null -> floorGrade = config.minBallastGrade (3.60).

        // Arrange
        const roster: Member[] = [
            createMember('1', 'Retiring', 1),
            createMember('2', 'Retiring', 1),
        ];
        const rscaTarget = 4.00;

        // Act
        const result = calculateOutcomeBasedGrades(roster, rscaTarget);

        // Assert
        // Everyone gets floor grade (3.60 default), then Retiring check applies.
        // Retiring check: 3.60 <= 4.00, so stays 3.60.
        expect(result[0].proposedTraitAverage).toBe(3.60);
        expect(result[1].proposedTraitAverage).toBe(3.60);
    });
});
