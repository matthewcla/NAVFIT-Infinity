/**
 * Comprehensive EP/MP Quota Enforcement Test Suite
 * 
 * This test loads ALL summary groups from test data and verifies
 * that the optimization logic respects quota limits.
 */
import { describe, it, expect } from 'vitest';
import { assignRecommendationsByRank, getContextFromGroup } from './recommendation';
import { computeEpMax, computeMpMax } from '@/domain/policy/quotas';
import { PromotionRecommendation } from '@/domain/policy/types';
import type { Report, SummaryGroup } from '@/types';
import testData from '../../../../public/summary_groups_test_data.json';

interface QuotaTestResult {
    groupId: string;
    groupName: string;
    paygrade: string;
    designator: string;
    totalReports: number;
    effectiveSize: number;
    epLimit: number;
    mpLimit: number;
    actualEP: number;
    actualMP: number;
    epOverAssigned: boolean;
    mpOverAssigned: boolean;
    status: 'PASS' | 'FAIL';
    details?: string;
}

// Filter to only Draft groups (the ones we'd optimize)
const draftGroups = (testData.summaryGroups as unknown as SummaryGroup[]).filter(
    g => g.status === 'Draft'
);

describe('EP/MP Quota Enforcement - All Summary Groups', () => {
    const results: QuotaTestResult[] = [];

    // Test each summary group
    draftGroups.forEach((group: SummaryGroup) => {
        it(`should respect quotas for ${group.name} (${group.paygrade})`, () => {
            // Get the context
            const context = getContextFromGroup(group);
            if (!context) {
                console.warn(`Skipping ${group.name}: invalid context`);
                return;
            }

            const reports = group.reports as Report[];

            // Calculate effective size (excluding NOB reports)
            const effectiveReports = reports.filter(r =>
                r.promotionRecommendation !== PromotionRecommendation.NOB &&
                !r.notObservedReport
            );
            const effectiveSize = effectiveReports.length;

            // Get quota limits
            const epLimit = computeEpMax(effectiveSize, context);

            // Run optimization
            const optimizedReports = assignRecommendationsByRank(reports, group);

            // Count results
            const actualEP = optimizedReports.filter(
                r => r.promotionRecommendation === PromotionRecommendation.EARLY_PROMOTE
            ).length;

            // MP limit depends on EP used
            const mpLimit = computeMpMax(effectiveSize, context, actualEP);

            const actualMP = optimizedReports.filter(
                r => r.promotionRecommendation === PromotionRecommendation.MUST_PROMOTE
            ).length;

            const epOverAssigned = actualEP > epLimit;
            const mpOverAssigned = actualMP > mpLimit;

            const result: QuotaTestResult = {
                groupId: group.id,
                groupName: group.name,
                paygrade: group.paygrade || 'Unknown',
                designator: group.designator || 'Unknown',
                totalReports: reports.length,
                effectiveSize,
                epLimit,
                mpLimit,
                actualEP,
                actualMP,
                epOverAssigned,
                mpOverAssigned,
                status: (epOverAssigned || mpOverAssigned) ? 'FAIL' : 'PASS'
            };

            if (result.status === 'FAIL') {
                result.details = `EP: ${actualEP}/${epLimit}, MP: ${actualMP}/${mpLimit}`;
            }

            results.push(result);

            // Assertions
            expect(actualEP, `EP over-assigned in ${group.name}`).toBeLessThanOrEqual(epLimit);
            expect(actualMP, `MP over-assigned in ${group.name}`).toBeLessThanOrEqual(mpLimit);
        });
    });

    it('should log summary of all quota test results', () => {
        console.log('\n========================================');
        console.log('QUOTA ENFORCEMENT TEST SUMMARY');
        console.log('========================================\n');

        const passed = results.filter(r => r.status === 'PASS').length;
        const failed = results.filter(r => r.status === 'FAIL').length;

        console.log(`Total Groups Tested: ${results.length}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}\n`);

        if (failed > 0) {
            console.log('FAILED GROUPS:');
            console.log('--------------');
            results.filter(r => r.status === 'FAIL').forEach(r => {
                console.log(`  ${r.groupName} (${r.paygrade})`);
                console.log(`    Effective Size: ${r.effectiveSize}`);
                console.log(`    EP: ${r.actualEP}/${r.epLimit} ${r.epOverAssigned ? '❌ OVER' : '✓'}`);
                console.log(`    MP: ${r.actualMP}/${r.mpLimit} ${r.mpOverAssigned ? '❌ OVER' : '✓'}`);
            });
        }

        console.log('\nALL RESULTS:');
        console.log('------------');
        results.forEach(r => {
            const status = r.status === 'PASS' ? '✓' : '❌';
            console.log(`${status} ${r.groupName.padEnd(30)} Size:${r.effectiveSize.toString().padStart(3)} EP:${r.actualEP}/${r.epLimit} MP:${r.actualMP}/${r.mpLimit}`);
        });

        // Assert no failures overall
        expect(failed, 'Some groups have quota over-assignments').toBe(0);
    });
});

describe('Edge Case Quota Tests', () => {
    it('should handle empty groups gracefully', () => {
        const emptyGroup: SummaryGroup = {
            id: 'empty',
            name: 'Empty Group',
            paygrade: 'O-3',
            designator: '1110',
            periodEndDate: '2025-01-31',
            status: 'Draft',
            reports: []
        } as any;

        const result = assignRecommendationsByRank([], emptyGroup);
        expect(result).toHaveLength(0);
    });

    it('should handle group with all NOB reports', () => {
        const nobReports: Report[] = [
            { id: '1', memberId: '1', traitAverage: 0, promotionRecommendation: 'NOB', notObservedReport: true } as any,
            { id: '2', memberId: '2', traitAverage: 0, promotionRecommendation: 'NOB', notObservedReport: true } as any,
        ];

        const allNobGroup: SummaryGroup = {
            id: 'allnob',
            name: 'All NOB Group',
            paygrade: 'O-3',
            designator: '1110',
            periodEndDate: '2025-01-31',
            status: 'Draft',
            reports: nobReports
        } as any;

        const result = assignRecommendationsByRank(nobReports, allNobGroup);

        // NOB reports should remain NOB
        result.forEach(r => {
            expect(r.promotionRecommendation).toBe('NOB');
        });
    });

    it('should handle O-1/O-2 URL restriction (zero EP/MP)', () => {
        const o1Reports: Report[] = Array.from({ length: 5 }, (_, i) => ({
            id: `o1-${i}`,
            memberId: `o1-${i}`,
            traitAverage: 5.0 - (i * 0.1),
            promotionRecommendation: 'P',
            isLocked: false
        } as any));

        const o1UrlGroup: SummaryGroup = {
            id: 'o1url',
            name: 'O-1 URL Test',
            paygrade: 'O-1',
            designator: '1110', // URL (non-LDO)
            periodEndDate: '2025-01-31',
            status: 'Draft',
            reports: o1Reports
        } as any;

        const result = assignRecommendationsByRank(o1Reports, o1UrlGroup);

        const epCount = result.filter(r => r.promotionRecommendation === 'EP').length;
        const mpCount = result.filter(r => r.promotionRecommendation === 'MP').length;

        expect(epCount).toBe(0);
        expect(mpCount).toBe(0);
    });

    it('should handle O-2 LDO exemption (quota allowed)', () => {
        const o2Reports: Report[] = Array.from({ length: 5 }, (_, i) => ({
            id: `o2-${i}`,
            memberId: `o2-${i}`,
            traitAverage: 5.0 - (i * 0.1),
            promotionRecommendation: 'P',
            isLocked: false
        } as any));

        const o2LdoGroup: SummaryGroup = {
            id: 'o2ldo',
            name: 'O-2 LDO Test',
            paygrade: 'O-2',
            designator: '6400', // LDO
            periodEndDate: '2025-01-31',
            status: 'Draft',
            reports: o2Reports
        } as any;

        const result = assignRecommendationsByRank(o2Reports, o2LdoGroup);

        const epCount = result.filter(r => r.promotionRecommendation === 'EP').length;

        // LDO O-2 should allow EP
        expect(epCount).toBeGreaterThan(0);
    });
});
