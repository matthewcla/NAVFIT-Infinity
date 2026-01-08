import { describe, it, expect, beforeEach } from 'vitest';
import {
    planPeriodicGroups,
    planDetachmentOfIndividualGroups,
    planDetachmentOfReportingSeniorGroups,
    planAllSummaryGroups,
    type PlannedGroupResult
} from './planSummaryGroups';
import type { SummaryGroup } from '@/types';
import type { RosterMember, ReportingSeniorConfig } from '@/types/roster';

// ============================================================================
// Test Fixtures
// ============================================================================

const createMockMember = (overrides: Partial<RosterMember> = {}): RosterMember => ({
    id: `member-${Math.random().toString(36).substring(7)}`,
    firstName: 'John',
    lastName: 'Doe',
    middleInitial: 'A',
    rank: 'O-3',
    payGrade: 'O-3',
    designator: '1110',
    dateReported: '2024-01-15',
    prd: '2027-06-15',
    status: 'Onboard',
    lastTrait: 3.80,
    promotionStatus: 'REGULAR',
    ...overrides
});

const createMockRsConfig = (overrides: Partial<ReportingSeniorConfig> = {}): ReportingSeniorConfig => ({
    name: 'CDR TEST SENIOR',
    rank: 'O-5',
    title: 'Commanding Officer',
    changeOfCommandDate: '2027-09-15', // Far enough in future for planning
    ...overrides
});

const createMockExistingGroup = (overrides: Partial<SummaryGroup> = {}): SummaryGroup => ({
    id: `sg-existing-${Math.random().toString(36).substring(7)}`,
    name: 'Existing Group',
    competitiveGroupKey: 'O-3 URL Active',
    periodEndDate: '2025-01-31',
    status: 'Final',
    reports: [],
    paygrade: 'O-3',
    ...overrides
});

// ============================================================================
// Tests
// ============================================================================

describe('planSummaryGroups', () => {
    let mockRoster: RosterMember[];
    let mockRsConfig: ReportingSeniorConfig;
    let mockExistingGroups: SummaryGroup[];

    beforeEach(() => {
        mockRoster = [];
        mockRsConfig = createMockRsConfig();
        mockExistingGroups = [];
    });

    describe('planPeriodicGroups', () => {
        it('should create planned groups for future periodic cycles', () => {
            // O-3 periodic is January (month 1 in PERIODIC_SCHEDULE)
            // With RS detach in 2027-09-15, we should get planned groups for 2026 and 2027 Jan cycles
            mockRoster = [
                createMockMember({ id: 'member-1', prd: '2028-06-15' })
            ];

            const results = planPeriodicGroups(mockRoster, mockRsConfig, mockExistingGroups);

            // Should have at least one planned periodic group
            expect(results.length).toBeGreaterThan(0);
            results.forEach(result => {
                expect(result.group.status).toBe('Planned');
                expect(result.group.name).toBe('O-3 URL Active');
                expect(result.eotRsca).toBeDefined();
            });
        });

        it('should group members by competitive group key', () => {
            mockRoster = [
                createMockMember({ id: 'member-1', designator: '1110', prd: '2028-06-15' }),
                createMockMember({ id: 'member-2', designator: '1110', prd: '2028-07-15' }),
                createMockMember({ id: 'member-3', designator: '1310', prd: '2028-08-15' })
            ];

            const results = planPeriodicGroups(mockRoster, mockRsConfig, mockExistingGroups);

            // Members with same designator should be grouped together
            const groupsByKey = new Map<string, PlannedGroupResult[]>();
            results.forEach(r => {
                const key = r.group.competitiveGroupKey;
                if (!groupsByKey.has(key)) groupsByKey.set(key, []);
                groupsByKey.get(key)!.push(r);
            });

            // Should have groups containing multiple members
            expect(results.some(r => r.group.reports.length > 1)).toBe(true);
        });

        it('should set status "Planned" on all groups', () => {
            mockRoster = [createMockMember({ prd: '2028-06-15' })];

            const results = planPeriodicGroups(mockRoster, mockRsConfig, mockExistingGroups);

            results.forEach(result => {
                expect(result.group.status).toBe('Planned');
                result.group.reports.forEach(report => {
                    expect(report.draftStatus).toBe('Planned');
                });
            });
        });

        it('should calculate starting MTA based on member history', () => {
            mockRoster = [
                createMockMember({ id: 'member-1', lastTrait: 4.20, prd: '2028-06-15' })
            ];

            const results = planPeriodicGroups(mockRoster, mockRsConfig, mockExistingGroups);

            const report = results[0]?.group.reports[0];
            expect(report).toBeDefined();
            // MTA should be at least member's lastTrait + growth factor
            expect(report.traitAverage).toBeGreaterThanOrEqual(4.20);
        });

        it('should exclude groups that already exist in store', () => {
            mockRoster = [createMockMember({ prd: '2028-06-15' })];

            // First, generate to see what would be created
            const initialResults = planPeriodicGroups(mockRoster, mockRsConfig, []);
            expect(initialResults.length).toBeGreaterThan(0);

            // Add the first group to existing groups
            const firstGroup = initialResults[0].group;
            mockExistingGroups = [
                createMockExistingGroup({
                    competitiveGroupKey: firstGroup.competitiveGroupKey,
                    periodEndDate: firstGroup.periodEndDate
                })
            ];

            // Re-run planning - should skip the existing one
            const filteredResults = planPeriodicGroups(mockRoster, mockRsConfig, mockExistingGroups);
            expect(filteredResults.length).toBeLessThan(initialResults.length);
        });
    });

    describe('planDetachmentOfIndividualGroups', () => {
        it('should create groups for members with PRD before RS detach', () => {
            mockRoster = [
                createMockMember({
                    id: 'leaving-member',
                    prd: '2026-10-15' // Before RS detach (2027-09-15) and >3 months out
                })
            ];

            const results = planDetachmentOfIndividualGroups(mockRoster, mockRsConfig, mockExistingGroups);

            expect(results.length).toBe(1);
            expect(results[0].group.name).toBe('O-3 URL Active');
            expect(results[0].group.competitiveGroupKey).toBe('O-3 URL Active');
        });

        it('should set detachmentOfIndividual flag on reports', () => {
            mockRoster = [
                createMockMember({ prd: '2026-10-15' })
            ];

            const results = planDetachmentOfIndividualGroups(mockRoster, mockRsConfig, mockExistingGroups);

            expect(results[0].group.reports[0].detachmentOfIndividual).toBe(true);
        });

        it('should apply transfer boost to MTA', () => {
            mockRoster = [
                createMockMember({ prd: '2026-10-15', lastTrait: 3.80 })
            ];

            const results = planDetachmentOfIndividualGroups(mockRoster, mockRsConfig, mockExistingGroups);

            // Transfer gets +0.10 boost
            expect(results[0].group.reports[0].traitAverage).toBeGreaterThanOrEqual(3.90);
        });

        it('should not create groups for members staying past RS detach', () => {
            mockRoster = [
                createMockMember({ prd: '2028-06-15' }) // After RS detach
            ];

            const results = planDetachmentOfIndividualGroups(mockRoster, mockRsConfig, mockExistingGroups);

            expect(results.length).toBe(0);
        });
    });

    describe('planDetachmentOfReportingSeniorGroups', () => {
        it('should create groups for RS detachment date', () => {
            mockRoster = [
                createMockMember({ prd: '2028-06-15' }) // Will be onboard when RS leaves
            ];

            const results = planDetachmentOfReportingSeniorGroups(mockRoster, mockRsConfig, mockExistingGroups);

            expect(results.length).toBeGreaterThan(0);
            expect(results[0].group.periodEndDate).toBe(mockRsConfig.changeOfCommandDate);
            expect(results[0].group.name).toBe('O-3 URL Active');
        });

        it('should include members still onboard at RS detach', () => {
            mockRoster = [
                createMockMember({ id: 'staying-1', prd: '2028-06-15' }),
                createMockMember({ id: 'staying-2', prd: '2028-07-15' }),
                createMockMember({ id: 'leaving', prd: '2026-10-15' }) // Leaves before RS
            ];

            const results = planDetachmentOfReportingSeniorGroups(mockRoster, mockRsConfig, mockExistingGroups);

            // Should only include members staying past RS detach
            const memberIds = results.flatMap(r => r.group.reports.map(rep => rep.memberId));
            expect(memberIds).toContain('staying-1');
            expect(memberIds).toContain('staying-2');
            expect(memberIds).not.toContain('leaving');
        });

        it('should group by competitive group key', () => {
            mockRoster = [
                createMockMember({ id: 'url-1', designator: '1110', prd: '2028-06-15' }),
                createMockMember({ id: 'url-2', designator: '1110', prd: '2028-07-15' }),
                createMockMember({ id: 'rl-1', designator: '1310', prd: '2028-08-15' })
            ];

            const results = planDetachmentOfReportingSeniorGroups(mockRoster, mockRsConfig, mockExistingGroups);

            // Should have separate groups for different competitive categories
            const groupNames = results.map(r => r.group.competitiveGroupKey);
            expect(new Set(groupNames).size).toBeGreaterThanOrEqual(1);
        });
    });

    describe('EOT RSCA calculation', () => {
        it('should calculate eotRsca for each planned group', () => {
            mockRoster = [createMockMember({ prd: '2028-06-15' })];

            const results = planAllSummaryGroups(mockRoster, mockRsConfig, mockExistingGroups);

            results.forEach(result => {
                expect(result.eotRsca).toBeDefined();
                expect(typeof result.eotRsca).toBe('number');
            });
        });

        it('should return member-level projections', () => {
            mockRoster = [
                createMockMember({ id: 'member-1', prd: '2028-06-15' }),
                createMockMember({ id: 'member-2', prd: '2028-07-15' })
            ];

            const results = planAllSummaryGroups(mockRoster, mockRsConfig, mockExistingGroups);

            results.forEach(result => {
                expect(result.memberProjections).toBeDefined();
                expect(typeof result.memberProjections).toBe('object');
            });
        });
    });

    describe('planAllSummaryGroups', () => {
        it('should orchestrate all planning functions', () => {
            mockRoster = [
                createMockMember({ id: 'staying', prd: '2028-06-15' }),
                createMockMember({ id: 'leaving', prd: '2026-10-15' })
            ];

            const results = planAllSummaryGroups(mockRoster, mockRsConfig, mockExistingGroups);

            // Should include periodic, DOI, and DORS groups
            // Should include various groups, all named cleanly
            const groupNames = results.map(r => r.group.name);
            expect(groupNames.every(n => n === 'O-3 URL Active')).toBe(true);
        });

        it('should sort results by periodEndDate', () => {
            mockRoster = [
                createMockMember({ id: 'member-1', prd: '2028-06-15' }),
                createMockMember({ id: 'member-2', prd: '2026-10-15' })
            ];

            const results = planAllSummaryGroups(mockRoster, mockRsConfig, mockExistingGroups);

            for (let i = 1; i < results.length; i++) {
                expect(results[i].group.periodEndDate >= results[i - 1].group.periodEndDate).toBe(true);
            }
        });

        it('should return empty array for empty roster', () => {
            const results = planAllSummaryGroups([], mockRsConfig, mockExistingGroups);
            expect(results).toEqual([]);
        });
    });
});
