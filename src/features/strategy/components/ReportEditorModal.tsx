import { useNavfitStore } from '@/store/useNavfitStore';
import { ReportEditor } from './ReportEditor';
import { useMemo } from 'react';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';

export function ReportEditorModal() {
    const isEditingReport = useNavfitStore((state) => state.isEditingReport);
    const setEditingReport = useNavfitStore((state) => state.setEditingReport);
    const selectedReportId = useNavfitStore((state) => state.selectedReportId);

    // Get all summary groups to find the report
    const summaryGroups = useSummaryGroups();

    const reportToEdit = useMemo(() => {
        if (!selectedReportId) return null;
        for (const group of summaryGroups) {
            const found = group.reports.find(r => r.id === selectedReportId);
            if (found) return found;
        }
        return null; // Return null if not found
    }, [summaryGroups, selectedReportId]);

    // Added: If we are not editing, or if no report is found (which shouldn't happen if ID is valid), return null
    if (!isEditingReport || !reportToEdit) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={() => setEditingReport(false)}
            />

            {/* Modal Content - Full Screen / Large */}
            <div className="relative w-full h-full bg-white animate-in zoom-in-95 duration-200">
                <ReportEditor
                    report={reportToEdit}
                    onClose={() => setEditingReport(false)}
                />
            </div>
        </div>
    );
}
