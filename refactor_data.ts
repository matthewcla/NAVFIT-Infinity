import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'public', 'summary_groups_test_data.json');

try {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    let data = JSON.parse(rawData);

    // Helper to shuffle array
    function shuffle(array: any[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // 1. Identification
    const submittedGroups = data.filter((g: any) => g.status === 'Submitted');

    // 2. Logic: 40% Draft, 20% Review, Remainder stay Submitted
    const totalSubmitted = submittedGroups.length;
    const countDraft = Math.floor(totalSubmitted * 0.40);
    const countReview = Math.floor(totalSubmitted * 0.20);

    // Shuffle to randomize which get picked
    shuffle(submittedGroups);

    const draftSet = new Set(submittedGroups.slice(0, countDraft).map((g: any) => g.id));
    const reviewSet = new Set(submittedGroups.slice(countDraft, countDraft + countReview).map((g: any) => g.id));

    // 3. Apply changes
    data = data.map((group: any) => {
        let newStatus = group.status;

        if (draftSet.has(group.id)) {
            newStatus = 'Draft';
        } else if (reviewSet.has(group.id)) {
            newStatus = 'Review';
        }

        // 4. Lock Logic
        // Locked if: Submitted, Final, Rejected, Complete (assuming 'Complete' is a valid status based on code reading, though user didn't list it explicitly, 'Final' often implies it. User said "Submitted, Final and Rejected").
        // Let's stick strictly to: Submitted, Final, Rejected.
        const isLockedState = ['Submitted', 'Final', 'Rejected'].includes(newStatus);

        const newReports = group.reports.map((report: any) => ({
            ...report,
            isLocked: isLockedState,
            // Sync draftStatus on report too if we changed group status? 
            // Usually good practice for consistency, though UI might rely on group.status.
            // Let's update it to be safe.
            draftStatus: newStatus
        }));

        return {
            ...group,
            status: newStatus,
            reports: newReports
        };
    });

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Successfully refactored data.`);
    console.log(`Original Submitted: ${totalSubmitted}`);
    console.log(`Converted to Draft: ${countDraft}`);
    console.log(`Converted to Review: ${countReview}`);
    console.log(`Remaining Submitted: ${totalSubmitted - countDraft - countReview}`);

} catch (error) {
    console.error("Error refactoring data:", error);
}
