
import { useNavfitStore } from './useNavfitStore.ts';
import type { RosterMember } from '@/types/roster';

// Mock Roster
const mockRoster: RosterMember[] = [
    {
        id: '1',
        firstName: 'Member',
        lastName: 'A',
        rank: 'E-5',
        designator: '1110',
        dateReported: '2023-01-01',
        prd: '2026-01-01',
        rankOrder: 1,
        reportsRemaining: 1,
        status: 'Promotable',
        lastTrait: 3.0
    },
    {
        id: '2',
        firstName: 'Member',
        lastName: 'B',
        rank: 'E-5',
        designator: '1110',
        dateReported: '2023-01-01',
        prd: '2026-01-01',
        rankOrder: 2,
        reportsRemaining: 1,
        status: 'Promotable',
        lastTrait: 3.0
    },
    {
        id: '3',
        firstName: 'Member',
        lastName: 'C',
        rank: 'E-5',
        designator: '1110',
        dateReported: '2023-01-01',
        prd: '2026-01-01',
        rankOrder: 3,
        reportsRemaining: 1,
        status: 'Promotable',
        lastTrait: 3.0
    },
];

console.log('--- Starting Verification ---');

// Initialize Store
useNavfitStore.setState({
    roster: mockRoster,
    projections: {},
    rsConfig: {
        name: 'RS Name',
        rank: 'O-6',
        title: 'CO',
        changeOfCommandDate: '2025-01-01',
        targetRsca: 4.00,
        totalReports: 10
    }
});

const getRosterString = () => useNavfitStore.getState().roster.map(m => `${m.rankOrder}: ${m.lastName}, ${m.firstName}`);

console.log('Initial Roster Order:', getRosterString());

// Action: Move Member C (index 2) to Top (index 0)
console.log('\nAction: Moving Member C to rank #1...');
useNavfitStore.getState().reorderMember('3', 0);

const updatedRoster = useNavfitStore.getState().roster;
const updatedProjections = useNavfitStore.getState().projections;

console.log('Updated Roster Order:', getRosterString());

// Checks
const memberAt1 = updatedRoster[0];
const successOrder = memberAt1.id === '3' && memberAt1.rankOrder === 1;

console.log('\nCheck 1: Member C is at #1?', successOrder ? 'PASSED' : 'FAILED');

// Check Projections
// With RSCA 4.00, #1 should be higher than 4.00. 
// Formula: 4.00 + 0.30 - (0.10 * 1) = 4.20
const projC = updatedProjections['3'];
console.log('Projected Grade for Member C:', projC);

const successProjection = projC > 4.00;
console.log('Check 2: Projection calculated?', successProjection ? 'PASSED' : 'FAILED');

if (successOrder && successProjection) {
    console.log('\n--- VERIFICATION SUCCESSFUL ---');
    // @ts-ignore
    if (typeof process !== 'undefined') process.exit(0);
} else {
    console.log('\n--- VERIFICATION FAILED ---');
    // @ts-ignore
    if (typeof process !== 'undefined') process.exit(1);
}
