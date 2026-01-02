import { useState } from 'react';
import { X } from 'lucide-react';
import type { SummaryGroup } from '@/types';

interface AddSummaryGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    competitiveGroups: string[];
    onCreate: (newGroups: SummaryGroup[]) => void;
}

const REPORT_TYPES = [
    "Special Report",
    "Detachment of Reporting Senior",
    "Detachment of Individual (Unexpected)",
    "Promotion/Frocking",
    "Concurrent"
];

export function AddSummaryGroupModal({
    isOpen,
    onClose,
    competitiveGroups,
    onCreate
}: AddSummaryGroupModalProps) {
    const [reportType, setReportType] = useState<string>(REPORT_TYPES[0]);
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [reportDate, setReportDate] = useState<string>('');

    if (!isOpen) return null;

    const toggleGroup = (group: string) => {
        if (selectedGroups.includes(group)) {
            setSelectedGroups(selectedGroups.filter(g => g !== group));
        } else {
            setSelectedGroups([...selectedGroups, group]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedGroups.length === competitiveGroups.length) {
            setSelectedGroups([]);
        } else {
            setSelectedGroups([...competitiveGroups]);
        }
    };

    const handleCreate = () => {
        if (!reportDate || selectedGroups.length === 0) return;

        const newGroups: SummaryGroup[] = selectedGroups.map(groupKey => {
            // Basic ID generation
            const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substring(2);

            return {
                id,
                name: `${groupKey} - ${reportType}`,
                competitiveGroupKey: groupKey,
                reports: [],
                periodEndDate: reportDate,
                status: 'Projected',
                // Defaulting promotionStatus to REGULAR unless specifically implied by logic not yet defined.
                // The task asks for specific naming convention which we follow.
                promotionStatus: 'REGULAR'
            };
        });

        onCreate(newGroups);
        onClose();

        // Reset state
        setSelectedGroups([]);
        setReportDate('');
        setReportType(REPORT_TYPES[0]);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
                    <h2 className="text-lg font-bold text-slate-800">Create New Summary Group</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Report Type */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">Report Type</label>
                        <div className="relative">
                            <select
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                                className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none shadow-sm"
                            >
                                {REPORT_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                            {/* Custom arrow for consistency if needed, but native select is fine for now */}
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                            </div>
                        </div>
                    </div>

                    {/* Competitive Groups */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-semibold text-slate-700">Competitive Groups</label>
                            <button
                                onClick={toggleSelectAll}
                                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                            >
                                {selectedGroups.length === competitiveGroups.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <div className="max-h-48 overflow-y-auto bg-slate-50 p-2 space-y-1">
                                {competitiveGroups.length === 0 ? (
                                    <div className="text-center py-4 text-xs text-slate-400">No competitive groups available</div>
                                ) : (
                                    competitiveGroups.map(group => (
                                        <label
                                            key={group}
                                            className="flex items-center gap-3 p-2 hover:bg-white hover:shadow-sm rounded-md transition-all cursor-pointer group"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedGroups.includes(group)}
                                                onChange={() => toggleGroup(group)}
                                                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-slate-700 font-medium group-hover:text-slate-900">{group}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 px-1">
                            {selectedGroups.length} group{selectedGroups.length !== 1 && 's'} selected
                        </p>
                    </div>

                    {/* Date Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">Report Date (End Date)</label>
                        <input
                            type="date"
                            value={reportDate}
                            onChange={(e) => setReportDate(e.target.value)}
                            className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!reportDate || selectedGroups.length === 0}
                        className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-all"
                    >
                        Create Groups
                    </button>
                </div>
            </div>
        </div>
    );
}
