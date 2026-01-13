
import { SummaryGroupGenerator } from './src/services/summaryGroupGenerator';
import { RosterMember } from './src/types/roster';

const mockRoster: RosterMember[] = [
    {
        id: '1', firstName: 'Maverick', lastName: 'Mitchell', rank: 'O-3', payGrade: 'O-3', designator: '1310',
        promotionStatus: 'REGULAR', prd: '2027-01-01', component: 'Active',
        dateReported: '2023-01-01'
    },
    {
        id: '2', firstName: 'John', lastName: 'Paul', rank: 'O-3', payGrade: 'O-3', designator: '1110',
        promotionStatus: 'REGULAR', prd: '2027-01-01', component: 'Active',
        dateReported: '2023-01-01'
    }
];

// Helper to run the async function
const run = async () => {
    const groups = await SummaryGroupGenerator.generateSuggestions(mockRoster, null, new Date(2025, 0, 31)); // Jan 2025

    console.log(`Generated ${groups.length} groups.`);
    groups.forEach((g) => {
        console.log(`Group: ${g.name} (Member IDs: ${g.reports.map((r: any) => r.memberId).join(', ')})`);
    });
};

run();
