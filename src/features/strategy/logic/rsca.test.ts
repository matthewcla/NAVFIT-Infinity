import { describe, it, expect } from 'vitest';
import { calculateITA } from './rsca';

describe('calculateITA', () => {
    it('should calculate the average of valid traits correctly', () => {
        const input = {
            "1": 3.0,
            "2": 4.0,
            "3": 5.0
        };
        // Sum = 12, Count = 3, Avg = 4.0
        expect(calculateITA(input)).toBe(4.0);
    });

    it('should handle mixed valid numbers and NOB/null/0 values', () => {
        const input = {
            "1": 3.0,
            "2": null, // Should be ignored
            "3": 0,    // Should be ignored (based on t > 0 check)
            "4": 5.0
        };
        // Sum = 8, Count = 2, Avg = 4.0
        expect(calculateITA(input)).toBe(4.0);
    });

    it('should return 0 when all inputs are NOB/null/0', () => {
        const input = {
            "1": null,
            "2": 0,
            "3": 0
        };
        expect(calculateITA(input)).toBe(0);
    });

    it('should round the result to 2 decimal places', () => {
        const input = {
            "1": 3.0,
            "2": 3.0,
            "3": 4.0
        };
        // Sum = 10, Count = 3, Avg = 3.3333... -> 3.33
        expect(calculateITA(input)).toBe(3.33);
    });

    it('should return 0 for empty input object', () => {
        const input = {};
        expect(calculateITA(input)).toBe(0);
    });
});
