
import { describe, it, expect } from 'vitest';
import { SummaryGroupGenerator } from './services/summaryGroupGenerator';
import type { RosterMember } from './types/roster';

describe('SummaryGroupGenerator Title Bug', () => {
    it('should not include OFFICER in the group name even if payGrade has garbage', async () => {
        const mockRoster: RosterMember[] = [
            {
                id: '1', firstName: 'Bad', lastName: 'Data', rank: 'O-3', payGrade: 'O-3 OFFICER' as any, designator: '1310',
                promotionStatus: 'REGULAR', prd: '2027-01-01', component: 'Active',
                dateReported: '2023-01-01'
            }
        ];

        const groups = await SummaryGroupGenerator.generateSuggestions(mockRoster, null, new Date(2025, 0, 31));

        expect(groups).toHaveLength(1);
        const group = groups[0];
        console.log(`Generated Group Name: "${group.name}"`);

        expect(group.name).not.toContain('OFFICER');
        // We expect sanitization to leave "O-3" and then generate "O-3 URL Active"
        expect(group.name).toBe('O-3 URL Active');
    });
});
