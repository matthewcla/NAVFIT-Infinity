import { useMemo } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import type { SummaryGroup } from '@/types';
import { cn } from '@/lib/utils';

interface StrategyListViewProps {
    summaryGroups: SummaryGroup[];
}

export function StrategyListView({ summaryGroups }: StrategyListViewProps) {
    const { selectReport, selectedReportId } = useNavfitStore();

    // Flatten all reports from all groups into a single list for the table
    const allReports = useMemo(() => {
        return summaryGroups.flatMap(group =>
            group.reports.map(report => ({
                ...report,
                // Ensure we have periodEndDate from the group if not on the report
                periodEndDate: group.periodEndDate,
            }))
        );
    }, [summaryGroups]);

    return (
        <div className="h-full w-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
            <div className="overflow-auto flex-1">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-3 whitespace-nowrap">Member Name</th>
                            <th className="px-4 py-3 whitespace-nowrap">Rank</th>
                            <th className="px-4 py-3 whitespace-nowrap">Type</th>
                            <th className="px-4 py-3 whitespace-nowrap">Period End</th>
                            <th className="px-4 py-3 text-center whitespace-nowrap">Prom Rec</th>
                            <th className="px-4 py-3 text-right whitespace-nowrap">Trait Avg</th>
                            <th className="px-4 py-3 text-right whitespace-nowrap">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {allReports.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                                    No reports found.
                                </td>
                            </tr>
                        ) : (
                            allReports.map((report) => {
                                const isSelected = selectedReportId === report.id;

                                return (
                                    <tr
                                        key={report.id}
                                        onClick={() => selectReport(report.id)}
                                        onDoubleClick={() => console.log('Deep Edit triggered:', report.id)}
                                        className={cn(
                                            "cursor-pointer transition-colors border-l-4",
                                            isSelected
                                                ? "bg-indigo-50 border-indigo-500"
                                                : "hover:bg-slate-50 border-transparent"
                                        )}
                                    >
                                        <td className="px-6 py-3 font-medium text-slate-900">
                                            {report.memberId}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{report.grade}</td>
                                        <td className="px-4 py-3 text-slate-500">{report.type}</td>
                                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                            {report.periodEndDate}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-xs font-bold inline-block min-w-[3rem]",
                                                report.promotionRecommendation === 'EP' ? 'bg-indigo-100 text-indigo-700' :
                                                    report.promotionRecommendation === 'MP' ? 'bg-slate-100 text-slate-700 border border-dashed border-slate-300' :
                                                        report.promotionRecommendation === 'P' ? 'bg-slate-50 text-slate-500' :
                                                            'bg-slate-100 text-slate-400'
                                            )}>
                                                {report.promotionRecommendation}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-medium text-slate-700">
                                            {report.traitAverage ? report.traitAverage.toFixed(2) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide",
                                                report.draftStatus === 'Final' ? 'bg-green-100 text-green-700' :
                                                    report.draftStatus === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-amber-50 text-amber-600'
                                            )}>
                                                {report.draftStatus}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
