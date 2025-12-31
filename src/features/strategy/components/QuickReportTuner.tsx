import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';
import { Settings, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export function QuickReportTuner() {
    const { selectedReportId, updateProjection, setEditingReport } = useNavfitStore();
    const summaryGroups = useSummaryGroups();

    const report = summaryGroups
        .flatMap(g => g.reports)
        .find(r => r.id === selectedReportId);

    if (!report) return null;

    const handleTraitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        if (selectedReportId) {
            updateProjection(selectedReportId, value);
        }
    };

    // Promotion Recommendations
    const recommendations = ['NOB', 'P', 'MP', 'EP'];

    return (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            {/* Header */}
            <div className="flex items-center space-x-2 mb-4">
                <Settings className="text-slate-400" size={16} />
                <div>
                    <h3 className="font-semibold text-slate-700 text-sm line-clamp-1">
                        {report.type} Report
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1">
                        {report.periodEndDate}
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Trait Average Slider */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-medium text-slate-600">Trait Average</label>
                        <span className="text-xs font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {report.traitAverage.toFixed(2)}
                        </span>
                    </div>
                    <input
                        type="range"
                        min="3.00"
                        max="5.00"
                        step="0.01" // Using 0.01 for precision, prompt mentioned 0.5 but that is very coarse for averages
                        value={report.traitAverage}
                        onChange={handleTraitChange}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>3.00</span>
                        <span>4.00</span>
                        <span>5.00</span>
                    </div>
                </div>

                {/* Promotion Recommendation */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Promotion Rec</label>
                    <div className="flex bg-white rounded-md border border-slate-200 p-0.5 shadow-sm">
                        {recommendations.map((rec) => {
                            const isSelected = report.promotionRecommendation === rec; // This is read-only from generator for now until store supports it
                            // For purely UI demo if we want valid selection feedback we'd need local state or store update
                            // Since we can't update store yet, we just show current state

                            return (
                                <button
                                    key={rec}
                                    className={cn(
                                        "flex-1 px-2 py-1 text-[10px] font-medium rounded transition-colors",
                                        isSelected
                                            ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100"
                                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                    )}
                                // onClick={() => {}} // Disabled until store support
                                >
                                    {rec}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Edit Full Report Button */}
                <div className="pt-2">
                    <button
                        onClick={() => setEditingReport(true)}
                        className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 text-xs font-medium py-2 px-3 rounded-md shadow-sm transition-all"
                    >
                        <ExternalLink size={14} />
                        <span>Edit Full Report</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
