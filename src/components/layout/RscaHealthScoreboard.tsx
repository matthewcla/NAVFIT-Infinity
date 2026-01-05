import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';
import type { Report } from '@/types';

// Color map for style
const STATUS_STYLES = {
    Safe: {
        icon: 'text-green-600',
        bg: 'bg-green-100',
        text: 'text-green-700',
        bar: 'bg-green-500',
        lightBar: 'bg-green-50'
    },
    Risk: {
        icon: 'text-yellow-600',
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        bar: 'bg-yellow-500',
        lightBar: 'bg-yellow-50'
    },
    Developing: {
        icon: 'text-blue-500',
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        bar: 'bg-blue-500',
        lightBar: 'bg-blue-50'
    },
    Stabilized: {
        icon: 'text-indigo-500',
        bg: 'bg-indigo-100',
        text: 'text-indigo-700',
        bar: 'bg-indigo-500',
        lightBar: 'bg-indigo-50'
    }
};

export function RscaHealthScoreboard() {
    const summaryGroups = useSummaryGroups();

    const groupHealth = useMemo(() => {
        // 1. Group by Competitive Category (e.g. "O-3 URL")
        const compGroups: Record<string, { reports: Report[], members: Set<string> }> = {};

        summaryGroups.forEach(sg => {
            if (!compGroups[sg.name]) {
                compGroups[sg.name] = { reports: [], members: new Set() };
            }
            sg.reports.forEach(r => {
                compGroups[sg.name].reports.push(r);
                compGroups[sg.name].members.add(r.memberId);
            });
        });

        // 2. Calculate Health for each group based on Running Cumulative Average (simplified for HUD)
        return Object.entries(compGroups).map(([name, data]) => {
            // Filter valid reports and sort by date descending to get "current" state
            // Actually, ManningWaterfall calculates running average. 
            // Ideally we want the average of ALL history to date?
            // ManningWaterfall logic: "cumulative average over time".
            // So for the "Current" value, we sum ALL valid reports up to infinity and divide by count.

            const validReports = data.reports.filter(r =>
                typeof r.traitAverage === 'number' && r.traitAverage > 0
            );

            let currentRSCA = 0;
            if (validReports.length > 0) {
                const sum = validReports.reduce((acc, r) => acc + r.traitAverage, 0);
                currentRSCA = sum / validReports.length;
            }

            // Determine Status
            let status: 'Safe' | 'Risk' | 'Developing' | 'Stabilized' = 'Safe';

            // Logic mirrored from ManningWaterfall
            if (currentRSCA > 4.10) status = 'Risk';
            else if (currentRSCA < 3.60) status = 'Developing';
            else status = 'Stabilized';

            const valueGap = 5.00 - currentRSCA;
            let description = 'Stable';
            if (status === 'Risk') description = 'Avg too high';
            if (status === 'Developing') description = 'Growth room';
            if (status === 'Stabilized') description = 'Stabilized';

            return {
                name,
                memberCount: data.members.size,
                currentRSCA,
                status,
                description,
                valueGap
            };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [summaryGroups]);

    return (
        <div className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-2 flex items-center space-x-4 overflow-x-auto min-h-header-height z-infinity-header shadow-sm sticky top-0">
            {groupHealth.length === 0 && (
                <div className="text-slate-400 text-sm italic">No RSCA Groups Found</div>
            )}
            {groupHealth.map(group => {
                const style = STATUS_STYLES[group.status] || STATUS_STYLES.Safe;
                // Visual scale: 3.0 to 5.0 typically, but let's just do 0-100% of 5.0 for simplicity 
                // or maybe zoom in on the competitive range (3.0 - 5.0)?
                // Layout asks for simple progress bar. Let's do % of 5.0
                const percentage = Math.min(100, (group.currentRSCA / 5.0) * 100);

                return (
                    <div key={group.name} className="flex-shrink-0 bg-white rounded-lg border border-slate-200 p-2.5 w-56 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow cursor-default group">
                        <div className="flex justify-between items-center mb-1.5">
                            <div className="flex items-center space-x-2 overflow-hidden">
                                <Activity className={style.icon} size={14} />
                                <span className="font-bold text-xs text-slate-700 truncate">{group.name}</span>
                            </div>
                            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                                {group.status}
                            </span>
                        </div>

                        <div className="flex justify-between items-end mb-1">
                            <span className="text-[10px] text-slate-500">{group.memberCount} Mbrs &bull; {group.description}</span>
                            <span className={`text-xs font-bold font-mono ${style.text}`}>
                                {group.currentRSCA.toFixed(2)}
                            </span>
                        </div>

                        <div className={`w-full h-1 rounded-full ${style.lightBar}`}>
                            <div className={`h-1 rounded-full ${style.bar}`} style={{ width: `${percentage}%` }}></div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
