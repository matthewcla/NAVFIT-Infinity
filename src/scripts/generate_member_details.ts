import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface RosterMember {
    id: string;
    firstName: string;
    lastName: string;
    rank: string; // This is actually paygrade in the input files (e.g. O-3)
    designator: string;
    dateReported: string;
    prd: string;
}

interface SummaryGroupData {
    roster: RosterMember[];
}

interface MemberDetail {
    id: string;
    firstName: string;
    lastName: string;
    rank: string; // e.g. "LT"
    payGrade: string; // e.g. "O-3"
    designator: string;
    dateReported: string; // YYYY-MM-DD
    gainDate: string; // Same as dateReported
    prd: string; // Projected Rotation Date
    eda: string; // Estimated Date of Arrival
    edd: string; // Estimated Date of Departure
    timeInGrade: number; // Years, e.g. 2.5
}

const PAYGRADE_TO_RANK: Record<string, string> = {
    'O-1': 'ENS',
    'O-2': 'LTJG',
    'O-3': 'LT',
    'O-4': 'LCDR',
    'O-5': 'CDR',
    'O-6': 'CAPT',
    'W-2': 'CWO2',
    'W-3': 'CWO3',
    'W-4': 'CWO4',
    'W-5': 'CWO5',
    'E-1': 'SR',
    'E-2': 'SA',
    'E-3': 'SN',
    'E-4': 'PO3',
    'E-5': 'PO2',
    'E-6': 'PO1',
    'E-7': 'CPO',
    'E-8': 'SCPO',
    'E-9': 'MCPO'
};

const getRankFromPaygrade = (paygrade: string): string => {
    return PAYGRADE_TO_RANK[paygrade] || paygrade;
};

const getRandomTimeInGrade = (): number => {
    // Generate a random time in grade between 0.5 and 4.0 years
    return parseFloat((0.5 + Math.random() * 3.5).toFixed(2));
};

const main = () => {
    try {
        const coreRosterPath = resolve('public/summary_groups_test_data.json');
        const gainsPath = resolve('public/prospective_gains.json');
        const outputPath = resolve('public/member_details.json');

        console.log('Reading input files...');
        const coreData: SummaryGroupData = JSON.parse(readFileSync(coreRosterPath, 'utf-8'));
        const gainsData: RosterMember[] = JSON.parse(readFileSync(gainsPath, 'utf-8'));

        const memberDetailsMap: Record<string, MemberDetail> = {};

        // Process Core Roster + Transferred (from summary_groups_test_data.json)
        console.log(`Processing ${coreData.roster.length} members from Core Roster...`);
        coreData.roster.forEach(member => {
            const payGrade = member.rank;
            const rank = getRankFromPaygrade(payGrade);

            // Check for Core Roster date requirement (Sept 2024 = 2024-09-01)
            // If dateReported is NOT future (it shouldn't be for core roster), we assume it's correct.
            // Transferred members are mixed in here.

            const detail: MemberDetail = {
                id: member.id,
                firstName: member.firstName,
                lastName: member.lastName,
                rank: rank,
                payGrade: payGrade,
                designator: member.designator,
                dateReported: member.dateReported,
                gainDate: member.dateReported,
                prd: member.prd,
                eda: member.dateReported,
                edd: member.prd,
                timeInGrade: getRandomTimeInGrade()
            };

            memberDetailsMap[member.id] = detail;
        });

        // Process Prospective Gains
        console.log(`Processing ${gainsData.length} Prospective Gains...`);
        gainsData.forEach(member => {
            const payGrade = member.rank;
            const rank = getRankFromPaygrade(payGrade);

            const detail: MemberDetail = {
                id: member.id,
                firstName: member.firstName,
                lastName: member.lastName,
                rank: rank,
                payGrade: payGrade,
                designator: member.designator,
                dateReported: member.dateReported,
                gainDate: member.dateReported,
                prd: member.prd,
                eda: member.dateReported,
                edd: member.prd,
                timeInGrade: getRandomTimeInGrade() // Maybe less time in grade for new arrivals? Assuming transferred from elsewhere with grade.
            };

            memberDetailsMap[member.id] = detail;
        });

        console.log(`Writing ${Object.keys(memberDetailsMap).length} entries to member_details.json...`);
        writeFileSync(outputPath, JSON.stringify(memberDetailsMap, null, 2));
        console.log('Done.');

    } catch (error) {
        console.error('Error processing rosters:', error);
        process.exit(1);
    }
};

main();
