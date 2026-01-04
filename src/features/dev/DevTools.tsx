import React, { useRef } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { exportSessionData } from '@/utils/exportUtils';
import { Upload, Download, Database } from 'lucide-react';

export const DevTools: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const loadState = useNavfitStore(state => state.loadState);

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                // Validate basic structure
                if (json.roster && json.summaryGroups && json.rsConfig) {
                    loadState({
                        roster: json.roster,
                        summaryGroups: json.summaryGroups,
                        rsConfig: json.rsConfig
                    });
                    alert('Data loaded successfully!');
                } else {
                    alert('Invalid file format: Missing required fields (roster, summaryGroups, rsConfig).');
                }
            } catch (err) {
                console.error(err);
                alert('Failed to parse JSON.');
            }
        };
        reader.readAsText(file);
    };

    const handleLoadRobustData = async () => {
        try {
            const [summaryResponse, detailsResponse] = await Promise.all([
                fetch('/summary_groups_test_data.json'),
                fetch('/member_details.json')
            ]);

            if (!summaryResponse.ok) throw new Error('Failed to fetch summary groups data');

            const json = await summaryResponse.json();
            const memberDetails = detailsResponse.ok ? await detailsResponse.json() : {};

             if (json.roster && json.summaryGroups && json.rsConfig) {
                // Hydrate Roster with Details
                const hydratedRoster = json.roster.map((member: any) => {
                    const details = memberDetails[member.id];
                    if (details) {
                        return {
                            ...member,
                            firstName: details.firstName,
                            lastName: details.lastName,
                            name: `${details.firstName} ${details.lastName}`,
                            rank: details.rank, // Title (e.g. Ensign)
                            payGrade: details.payGrade, // Code (e.g. O-1)
                            designator: details.designator,
                            dateReported: details.dateReported,
                            prd: details.prd,
                        };
                    }
                    return member;
                });

                // Hydrate Summary Groups if needed (reports inside might need names for display if they were stripped)
                // Note: The migration script ONLY stripped the top-level roster.
                // The reports inside 'history' and 'summaryGroups' were left untouched in the JSON.
                // However, consistent with the "Source of Truth" philosophy, we should ideally use the Member ID to pull current details
                // for the Roster view. Summary Groups often use snapshots.
                // If the App relies on the Store's `roster` for the main list, `hydratedRoster` is sufficient.

                loadState({
                    roster: hydratedRoster,
                    summaryGroups: json.summaryGroups,
                    rsConfig: json.rsConfig
                });
                alert('Summary Groups Test Data loaded successfully!');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to load data. Ensure summary_groups_test_data.json and member_details.json are in public folder.');
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImport}
            />

            <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-800 text-white p-2 rounded-full shadow-lg hover:bg-slate-700 tooltip"
                title="Import State"
            >
                <Upload size={20} />
            </button>

            <button
                onClick={exportSessionData}
                className="bg-slate-800 text-white p-2 rounded-full shadow-lg hover:bg-slate-700"
                title="Export State"
            >
                <Download size={20} />
            </button>

            <button
                onClick={handleLoadRobustData}
                className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-500"
                title="Load Robust Test Data"
            >
                <Database size={20} />
            </button>
        </div>
    );
};
