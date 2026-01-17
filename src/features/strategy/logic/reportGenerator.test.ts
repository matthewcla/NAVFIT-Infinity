
import { describe, it, expect } from 'vitest';
import { generateSummaryGroups } from './reportGenerator';
import type { RosterMember, ReportingSeniorConfig } from '@/types/roster';

describe('generateSummaryGroups Grouping Logic', () => {
    const rsConfig: ReportingSeniorConfig = {
        name: 'CDR Clark',
        rank: 'O-5',
        title: 'CO',
        changeOfCommandDate: '2026-06-01',
    };

    const createMember = (overrides: Partial<RosterMember>): RosterMember => ({
        id: 'test-1',
        firstName: 'Test',
        lastName: 'User',
        rank: 'PO1',
        payGrade: 'E-6',
        designator: '',
        dateReported: '2023-01-01',
        prd: '2027-01-01',
        promotionStatus: 'REGULAR',
        component: 'Active',
        ...overrides,
    });

    describe('Enlisted Grouping', () => {
        it('should generate clean label "E-6" for standard Active Enlisted', () => {
            const member = createMember({ payGrade: 'E-6', rank: 'PO1' });
            const groups = generateSummaryGroups([member], rsConfig);
            const group = groups[0];

            expect(group.name).toBe('E-6');
            expect(group.id).toContain('sg-E-6-ACTIVE');
            expect(group.name).not.toContain('OFFICER');
        });

        it('should sanitize dirty payGrade input (e.g. "E-6 OFFICER Active")', () => {
            const member = createMember({ payGrade: 'E-6 OFFICER Active' as any, rank: 'PO1' });
            const groups = generateSummaryGroups([member], rsConfig);
            const group = groups[0];

            expect(group.name).toBe('E-6');
            expect(group.id).toContain('sg-E-6-ACTIVE');
        });

        it('should distinguish Enlisted Active from Enlisted Reserve', () => {
            const active = createMember({ id: 'm1', payGrade: 'E-6', component: 'Active' });
            const reserve = createMember({ id: 'm2', payGrade: 'E-6', component: 'Reserve' });

            const groups = generateSummaryGroups([active, reserve], rsConfig);

            const activeGroup = groups.find(g => g.reports.some(r => r.memberId === 'm1'));
            const reserveGroup = groups.find(g => g.reports.some(r => r.memberId === 'm2'));

            expect(activeGroup).toBeDefined();
            expect(reserveGroup).toBeDefined();
            expect(activeGroup?.id).not.toBe(reserveGroup?.id);

            expect(activeGroup?.name).toBe('E-6'); // Default Active
            expect(reserveGroup?.name).toBe('E-6 RES'); // Reserve Distinct Label
        });
    });

    describe('Officer Grouping', () => {
        it('should generate correct label "URL Active O-3" for URL Officer', () => {
            const member = createMember({
                payGrade: 'O-3',
                rank: 'LT',
                designator: '1110', // URL
                component: 'Active'
            });
            const groups = generateSummaryGroups([member], rsConfig);
            const group = groups[0];

            expect(group.name).toBe('URL Active O-3');
            expect(group.id).toContain('URL');
        });
    });
});
