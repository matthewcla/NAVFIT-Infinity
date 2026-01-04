
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Rank Mapping
const RANK_MAP: Record<string, string> = {
    'O-1': 'Ensign',
    'O-2': 'Lieutenant Junior Grade',
    'O-3': 'Lieutenant',
    'O-4': 'Lieutenant Commander',
    'O-5': 'Commander',
    'O-6': 'Captain',
    'O-7': 'Rear Admiral (Lower Half)',
    'O-8': 'Rear Admiral',
    'O-9': 'Vice Admiral',
    'O-10': 'Admiral',
    'W-1': 'Warrant Officer 1',
    'W-2': 'Chief Warrant Officer 2',
    'W-3': 'Chief Warrant Officer 3',
    'W-4': 'Chief Warrant Officer 4',
    'W-5': 'Chief Warrant Officer 5',
    'E-1': 'Seaman Recruit',
    'E-2': 'Seaman Apprentice',
    'E-3': 'Seaman',
    'E-4': 'Petty Officer Third Class',
    'E-5': 'Petty Officer Second Class',
    'E-6': 'Petty Officer First Class',
    'E-7': 'Chief Petty Officer',
    'E-8': 'Senior Chief Petty Officer',
    'E-9': 'Master Chief Petty Officer',
};

const getRankTitle = (payGrade: string): string => {
    return RANK_MAP[payGrade] || payGrade;
};

const main = () => {
    const summaryGroupsPath = resolve('public/summary_groups_test_data.json');
    const memberDetailsPath = resolve('public/member_details.json');

    console.log('Reading files...');
    const summaryData = JSON.parse(readFileSync(summaryGroupsPath, 'utf-8'));
    let memberDetailsData: Record<string, any> = {};

    try {
        memberDetailsData = JSON.parse(readFileSync(memberDetailsPath, 'utf-8'));
    } catch (e) {
        console.log('member_details.json not found or empty, starting fresh.');
    }

    const roster = summaryData.roster;
    let processedCount = 0;

    if (!Array.isArray(roster)) {
        console.error('Invalid roster format');
        return;
    }

    console.log(`Processing ${roster.length} roster entries...`);

    roster.forEach((member: any) => {
        const id = member.id;

        // Fields to move
        const { firstName, lastName, rank: payGrade, designator, dateReported, prd } = member;

        if (!id) return;

        // Ensure entry exists
        if (!memberDetailsData[id]) {
            memberDetailsData[id] = { id };
        }

        const detail = memberDetailsData[id];

        // Update Details
        if (firstName) detail.firstName = firstName;
        if (lastName) detail.lastName = lastName;
        if (designator) detail.designator = designator;
        if (dateReported) {
            detail.dateReported = dateReported;
            // Sync gainDate if effectively the same
            if (!detail.gainDate) detail.gainDate = dateReported;
        }
        if (prd) detail.prd = prd;

        // Handle Rank/PayGrade Transformation
        if (payGrade) {
            detail.payGrade = payGrade;
            detail.rank = getRankTitle(payGrade);
        }

        // Remove fields from Source (Roster)
        delete member.firstName;
        delete member.lastName;
        delete member.rank; // Removing the paygrade field (which was named rank)
        delete member.designator;
        delete member.dateReported;
        delete member.prd;

        // We leave 'id' and 'history'

        processedCount++;
    });

    console.log(`Updated ${processedCount} members.`);

    // Write back
    console.log('Writing output files...');
    writeFileSync(memberDetailsPath, JSON.stringify(memberDetailsData, null, 2));
    writeFileSync(summaryGroupsPath, JSON.stringify(summaryData, null, 2));

    console.log('Migration complete.');
};

main();
