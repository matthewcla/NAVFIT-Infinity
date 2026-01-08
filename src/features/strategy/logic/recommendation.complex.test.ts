import { describe, it, expect } from 'vitest';
import { assignRecommendationsByRank } from './recommendation';

import type { Report, SummaryGroup } from '@/types';

// Helper to create basic reports
const createReport = (id: string, mta: number, rec: string, locked = false, nob = false, grades = {}): Report => ({
    id,
    memberId: id,
    traitAverage: mta,
    promotionRecommendation: rec as any,
    isLocked: locked,
    notObservedReport: nob,
    traitGrades: grades, // { 'Leadership': 2.0 } etc
} as any);

describe('Comprehensive Optimization Strategy Verification', () => {

    it('Scenario 1: O-5 LDO "Ghost" Stress Test (Mixed Ghost/Locked NOB)', () => {
        // Setup: 35 Reports.
        // 10 Ghost NOBs (P w/ NOB flag).
        // 5 Locked NOBs.
        // 2 Locked EPs.
        // 18 Unlocked 'P' candidates.
        // Effective Size: 35 - 10 (Ghost) - 5 (Locked NOB) = 20.
        // Quota for Size 20: EP=4.
        // Locked EPs: 2.
        // Available EP: 2.

        const ghosts = Array.from({ length: 10 }, (_, i) =>
            createReport(`ghost${i}`, 0.00, 'P', false, true)
        );
        const lockedNob = Array.from({ length: 5 }, (_, i) =>
            createReport(`lockedNob${i}`, 0.00, 'NOB', true, false)
        );
        const lockedEp = Array.from({ length: 2 }, (_, i) =>
            createReport(`lockedEp${i}`, 5.00, 'EP', true, false)
        );

        // 18 Unlocked candidates with descending MTA
        const candidates = Array.from({ length: 18 }, (_, i) =>
            createReport(`cand${i}`, 4.50 - (i * 0.01), 'P', false, false)
        );

        const allReports = [...ghosts, ...lockedNob, ...lockedEp, ...candidates];

        const group: SummaryGroup = {
            id: 'g1',
            paygrade: 'O-5',
            designator: '6400', // LDO
            reports: allReports
        } as any;

        const result = assignRecommendationsByRank(allReports, group);

        const epCount = result.filter(r => r.promotionRecommendation === 'EP').length;

        // Expectation: Total EP 4 (2 Locked + 2 New).
        // Ghost NOBs should remain P (or whatever) but NOT get EP/MP? 
        // Actually, assignRecommendations filters them out of candidates, so they stay as they were ('P').
        // Wait, if they are Ghost NOB (P), they shouldn't be valid P?
        // Logic: They are excluded from candidates. They keep their input recommendation.
        // If input was 'P', they stay 'P'. This is "safe" but maybe misleading if they are truly NOB.
        // But the key is Quota Inflation.
        // 20 Members -> 4 EPs.

        expect(epCount).toBe(4);

        // Verify top 2 unlocked candidates got EP
        const cand0 = result.find(r => r.id === 'cand0');
        const cand1 = result.find(r => r.id === 'cand1');
        const cand2 = result.find(r => r.id === 'cand2');

        expect(cand0?.promotionRecommendation).toBe('EP');
        expect(cand1?.promotionRecommendation).toBe('EP');
        expect(cand2?.promotionRecommendation).not.toBe('EP'); // No quota left
    });

    it('Scenario 2: O-3 Trait Block + Locked Overload', () => {
        // Setup: Size 10. EP Limit for 10 is 2.
        // Member A (5.0): Locked EP.
        // Member B (4.9): Unlocked, Trait Blocked (2.0 in Leadership -> Blocks EP/MP).
        // Member C (4.8): Unlocked, Clean.
        // Member D (4.7): Locked EP.
        // Others: Clean.

        // Locked EPs = 2. Available EP = 0.
        // MP Limit for 10 is 4.

        const reports = [
            createReport('A', 5.0, 'EP', true),
            createReport('B', 4.9, 'P', false, false, { 'Leadership': 2.0 }),
            createReport('C', 4.8, 'P', false),
            createReport('D', 4.7, 'EP', true),
            ...Array.from({ length: 6 }, (_, i) => createReport(`rem${i}`, 4.0, 'P'))
        ];

        const group: SummaryGroup = {
            id: 'g2',
            paygrade: 'O-3',
            designator: '1110',
            reports
        } as any;

        const result = assignRecommendationsByRank(reports, group);

        const rB = result.find(r => r.id === 'B');
        const rC = result.find(r => r.id === 'C');

        // Expectation:
        // EP Quota full (A+D). B and C get nothing better than MP? 
        // Wait, MP Quota is 4.
        // B is blocked for EP/MP due to 2.0 trait? 
        // Need to verify 'isBlocked' logic import. 
        // Standard rule: Any trait < 3.0 blocks EP/MP? Or 2.0?
        // Actually, let's assume standard logic: 1.0 blocks everything (SP condition). 2.0 blocks Promotable?
        // Let's rely on what `isBlocked` implementation does. Previously I saw blocking tests pass for 2.0.

        // If B is blocked, it stays P or goes SP.
        // C should get MP if available.

        // Expect C to get MP.
        expect(rC?.promotionRecommendation).toBe('MP');

        // Expect B to NOT be EP or MP.
        expect(rB?.promotionRecommendation).not.toBe('EP');
        expect(rB?.promotionRecommendation).not.toBe('MP');
    });

    it('Scenario 3: O-2 URL Restriction (Zero Quota)', () => {
        // Setup: Size 5. Paygrade O-2. URL (1110).
        // EP/MP Allowed? No. Map says 0.

        const reports = Array.from({ length: 5 }, (_, i) =>
            createReport(`r${i}`, 5.0, 'P')
        );

        const group: SummaryGroup = {
            id: 'g3',
            paygrade: 'O-2',
            designator: '1110',
            reports
        } as any;

        const result = assignRecommendationsByRank(reports, group);

        const epCount = result.filter(r => r.promotionRecommendation === 'EP').length;
        const mpCount = result.filter(r => r.promotionRecommendation === 'MP').length;

        expect(epCount).toBe(0);
        expect(mpCount).toBe(0);
    });

    it('Scenario 4: O-2 LDO Exemption (Quota Allowed)', () => {
        // Setup: Size 5. Paygrade O-2. LDO (6400).
        // EP Limit (Size 5) = 1.
        // MP Limit (Size 5, LDO) = No Limit (or calculated).

        const reports = Array.from({ length: 5 }, (_, i) =>
            createReport(`r${i}`, 5.0 - (i * 0.1), 'P')
        );

        const group: SummaryGroup = {
            id: 'g4',
            paygrade: 'O-2',
            designator: '6400',
            reports
        } as any;

        const result = assignRecommendationsByRank(reports, group);

        const r0 = result.find(r => r.id === 'r0'); // Top
        const r1 = result.find(r => r.id === 'r1'); // 2nd

        expect(r0?.promotionRecommendation).toBe('EP');
        // Check MP limit. Often 'No Limit' means remainder can be MP.
        // If size 5, EP 1, likely remaining 4 can be MP?
        expect(r1?.promotionRecommendation).toBe('MP');
    });

    it('Scenario 5: Tie-Breaker Stability', () => {
        // Setup: Size 20. Limit 4.
        // 5 Members tied at 4.00.
        // Sort behavior: Should be stable (preserve input index).
        // Assuming Input Order: Tied1, Tied2, Tied3, Tied4, Tied5.
        // EP: Tied1..4. MP: Tied5.

        const reports = Array.from({ length: 20 }, (_, i) =>
            createReport(`t${i}`, i < 5 ? 4.00 : 3.00, 'P')
        );
        // t0..t4 are 4.00. t5..19 are 3.00.

        const group: SummaryGroup = {
            id: 'g5',
            paygrade: 'O-4',
            designator: '1110',
            reports
        } as any;

        const result = assignRecommendationsByRank(reports, group);

        expect(result.find(r => r.id === 't0')?.promotionRecommendation).toBe('EP');
        expect(result.find(r => r.id === 't3')?.promotionRecommendation).toBe('EP');
        expect(result.find(r => r.id === 't4')?.promotionRecommendation).toBe('MP');
    });

    it('Scenario 6: Locked Overload & Negative Quota Graceful Fail', () => {
        // Setup: Size 10. Limit 2 EPs.
        // 4 Locked EPs.
        // Available = -2 -> 0.

        const locked = Array.from({ length: 4 }, (_, i) => createReport(`lock${i}`, 5.0, 'EP', true));
        const clean = Array.from({ length: 6 }, (_, i) => createReport(`clean${i}`, 4.0, 'P'));

        const reports = [...locked, ...clean];

        const group: SummaryGroup = {
            id: 'g6',
            paygrade: 'O-4',
            designator: '1110',
            reports
        } as any;

        const result = assignRecommendationsByRank(reports, group);

        const epCount = result.filter(r => r.promotionRecommendation === 'EP').length;

        expect(epCount).toBe(4); // Only the locked ones
        // Top unlocked clean0 should NOT get EP.
        expect(result.find(r => r.id === 'clean0')?.promotionRecommendation).not.toBe('EP');
        expect(result.find(r => r.id === 'clean0')?.promotionRecommendation).toBe('MP');
        expect(result.find(r => r.id === 'clean1')?.promotionRecommendation).toBe('MP');

        // MP Limit for O-4 Size 10 is 3. (High col).
        // Locked EPs = 4. Unused EP = 0.
        // Total MP allowed = 3.
        // Assigned: clean0, clean1, clean2.

        expect(result.find(r => r.id === 'clean0')?.promotionRecommendation).toBe('MP');
        expect(result.find(r => r.id === 'clean1')?.promotionRecommendation).toBe('MP');
        expect(result.find(r => r.id === 'clean2')?.promotionRecommendation).toBe('MP');
        expect(result.find(r => r.id === 'clean3')?.promotionRecommendation).not.toBe('MP');
        expect(result.find(r => r.id === 'clean4')?.promotionRecommendation).not.toBe('MP');
    });

});
