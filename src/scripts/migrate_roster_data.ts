
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Rank Mapping
const RANK_MAP: Record<string, string> = {
    'O-1': 'ENS',
    'O-2': 'LTJG',
    'O-3': 'LT',
    'O-4': 'LCDR',
    'O-5': 'CDR',
    'O-6': 'CAPT',
    'O-7': 'RDML',
    'O-8': 'RADM',
    'O-9': 'VADM',
    'O-10': 'ADM',
    'W-1': 'CWO-1',
    'W-2': 'CWO-2',
    'W-3': 'CWO-3',
    'W-4': 'CWO-4',
    'W-5': 'CWO-5',
    'E-1': 'SR',
    'E-2': 'SA',
    'E-3': 'SN',
    'E-4': 'PO3',
    'E-5': 'PO2',
    'E-6': 'PO1',
    'E-7': 'CPO',
    'E-8': 'SCPO',
    'E-9': 'MCPO',
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
