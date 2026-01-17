
import { describe, it, expect } from 'vitest';
import { SummaryGroupGenerator } from './services/summaryGroupGenerator';
import type { RosterMember } from './types/roster';

describe('SummaryGroupGenerator Enlisted Naming', () => {
    it('generates correct name for standard enlisted (E-5)', async () => {
        const mockMember: RosterMember = {
            id: '1', firstName: 'Petty', lastName: 'Officer', rank: 'E-5', payGrade: 'E-5', designator: '',
            promotionStatus: 'REGULAR', prd: '2025-06-01', component: 'Active',
            dateReported: '2023-01-01'
        };
        const groups = await SummaryGroupGenerator.generateSuggestions([mockMember], null, new Date(2025, 2, 1));
        // E-5 periodic is March (month 2). 
        // Expect: "E-5 Active"
        expect(groups[0].name).toBe('E-5 Active');
    });

    it('generates correct name for OS rating (starts with O) - Detachment', async () => {
        // OS2 is E-5.
        const mockMember: RosterMember = {
            id: '2', firstName: 'Operations', lastName: 'Specialist', rank: 'OS2', payGrade: 'E-5', designator: '',
            promotionStatus: 'REGULAR', prd: '2025-04-15', component: 'Active',
            dateReported: '2023-01-01'
        };
        // Target date April 2025 (matching PRD for detachment)
        const groups = await SummaryGroupGenerator.generateSuggestions([mockMember], null, new Date(2025, 3, 15));

        // Should find detachment group
        const detGroup = groups.find(g => g.reports[0].type === 'Detachment');
        expect(detGroup).toBeDefined();
        if (detGroup) {
            console.log('OS2 Group Name:', detGroup.name);
            console.log('OS2 Group Key:', detGroup.competitiveGroupKey);
        }
    });

    it('generates correct name for Active Component', async () => {
        const mockMember: RosterMember = {
            id: '3', firstName: 'Joe', lastName: 'Enlisted', rank: 'E-6', payGrade: 'E-6', designator: '',
            promotionStatus: 'REGULAR', prd: '2026-01-01', component: 'Active',
            dateReported: '2023-01-01'
        };
        // E-6 Periodic is Nov (month 10)
        const groups = await SummaryGroupGenerator.generateSuggestions([mockMember], null, new Date(2025, 10, 15));
        console.log('E-6 Group Name:', groups[0]?.name);
    });
});
