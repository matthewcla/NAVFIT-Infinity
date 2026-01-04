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
            const response = await fetch('/robust_test_data.json');
            if (!response.ok) throw new Error('Failed to fetch test data');
            const json = await response.json();
             if (json.roster && json.summaryGroups && json.rsConfig) {
                loadState({
                    roster: json.roster,
                    summaryGroups: json.summaryGroups,
                    rsConfig: json.rsConfig
                });
                alert('Robust Test Data loaded successfully!');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to load robust test data. Ensure robust_test_data.json is in public folder.');
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
