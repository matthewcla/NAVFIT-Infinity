import { useMemo } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import type { SummaryGroup } from '@/types';
import { RscaHeadsUpDisplay } from './RscaHeadsUpDisplay';
import { generateSummaryGroups } from '@/features/strategy/logic/reportGenerator';
import { calculateCumulativeRSCA } from '@/features/strategy/logic/rsca';
import {
    AlertTriangle,
    ArrowRight,
    Layout,
    Users,
    FileText,
    Calendar,
    BarChart,
    ListOrdered
} from 'lucide-react';

interface CycleContextPanelProps {
    group: SummaryGroup | null;
    onOpenWorkspace?: () => void;
}

export function CycleContextPanel({ group, onOpenWorkspace }: CycleContextPanelProps) {
    const { rsConfig, roster, projections } = useNavfitStore();

    // Derived Stats using the "Dashboard" logic for advanced metrics
    const contextData = useMemo(() => {
        if (!group) return null;

        // Re-generate all groups for cumulative RSCA context
        const allGroups = generateSummaryGroups(roster, rsConfig, 2023, projections);

        // Derive Rank from competitiveGroupKey (e.g., "O-3 1110" -> "O-3") or use paygrade
        const rank = group.paygrade || (group.competitiveGroupKey ? group.competitiveGroupKey.split(' ')[0] : 'Unknown');

        // Calculate Rank-Wide Cumulative Average (Current State of all reports)
        const cumulativeRsca = calculateCumulativeRSCA(allGroups, rank);

        // Target is just for reference in logic, but HUD will show Cumulative
        const targetRsca = rsConfig.targetRsca || 4.20;

        // Alerts Logic
        const alerts: string[] = [];

        // Air Gap Logic
        const groupSize = group.reports.length;
        const maxEPs = Math.floor(groupSize * 0.2);
        const assignedEPs = group.reports.filter(r => r.promotionRecommendation === 'EP').length;

        if (groupSize > 0 && assignedEPs < maxEPs) {
            const gap = maxEPs - assignedEPs;
            alerts.push(`${gap} Air Gap${gap > 1 ? 's' : ''} Detected`);
        }

        // < 90 Days Logic
        const shortObservationCount = group.reports.filter(r => {
            if (!r.periodStartDate) return false;
            const start = new Date(r.periodStartDate || r.dateReported || '2000-01-01');
            const end = new Date(r.periodEndDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays < 90;
        }).length;

        if (shortObservationCount > 0) {
            alerts.push(`${shortObservationCount} Member${shortObservationCount > 1 ? 's' : ''} < 90 Days`);
        }

        // Stats
        const totalReports = groupSize;
        const draftStats = group.reports.reduce((acc, r) => {
            const status = r.draftStatus || 'Projected';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const mainDraftStatus = Object.entries(draftStats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Pending';

        // Top Performers
        const topPerformers = [...group.reports]
            .sort((a, b) => (b.traitAverage || 0) - (a.traitAverage || 0))
            .slice(0, 5);

        return {
            cumulativeRsca,
            rank,
            targetRsca,
            alerts,
            totalReports,
            mainDraftStatus,
            topPerformers
        };
    }, [group, roster, rsConfig, projections]);


    if (!group || !contextData) {
        return (
            <div className="h-full bg-slate-50 border-l border-slate-200 p-8 flex flex-col items-center justify-center text-center text-slate-400">
                <Layout className="w-12 h-12 mb-4 opacity-20" />
                <p>Select a cycle to view details and strategy.</p>
            </div>
        );
    }

    const { cumulativeRsca, rank, alerts, totalReports, mainDraftStatus, topPerformers } = contextData;

    return (
        <div className="h-full flex flex-col bg-white border-l border-slate-200 shadow-xl shadow-slate-200/50 transform transition-transform duration-300">
            {/* Header Section */}
            <div className="bg-slate-50 border-b border-slate-200 pt-6 pb-2 px-6 flex flex-col gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">
                            {group.competitiveGroupKey || 'Group'} / {group.promotionStatus || 'REGULAR'}
                        </span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 leading-tight mb-1">{group.name}</h2>
                    <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                        <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {group.periodEndDate}
                        </div>
                        <div className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {totalReports} Members
                        </div>
                    </div>
                </div>

                {/* Scoreboard Context */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden -mx-2">
                    <div className="scale-90 origin-top-left w-[111%]">
                        <RscaHeadsUpDisplay
                            currentRsca={cumulativeRsca}
                            projectedRsca={cumulativeRsca}
                            rankLabel={`${rank} Cumulative Average`}
                        />
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">

                {/* Alerts Section */}
                {alerts.length > 0 && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2 text-amber-800 font-semibold text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Attention Needed</span>
                        </div>
                        <ul className="space-y-1">
                            {alerts.map((alert, idx) => (
                                <li key={idx} className="text-xs text-amber-700 flex items-center gap-2">
                                    <span className="w-1 h-1 bg-amber-400 rounded-full" />
                                    {alert}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Summary Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="text-slate-400 mb-2">
                            <Users className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-bold text-slate-700">{totalReports}</div>
                        <div className="text-xs font-medium text-slate-500">Reports</div>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="text-slate-400 mb-2">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div className="text-xl font-bold text-slate-700 truncate">{mainDraftStatus}</div>
                        <div className="text-xs font-medium text-slate-500">Status</div>
                    </div>
                </div>

                {/* Primary Action */}
                <div className="pt-2">
                    <button
                        onClick={onOpenWorkspace}
                        className="w-full group flex items-center justify-between p-1 pl-6 pr-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-all shadow-lg hover:shadow-indigo-500/25"
                    >
                        <span className="font-bold text-sm">Open Strategy Workspace</span>
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors">
                            <ArrowRight className="w-5 h-5" />
                        </div>
                    </button>

                    <div className="grid grid-cols-2 gap-2 mt-4">
                        <button className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                            <BarChart className="w-4 h-4 text-slate-400" />
                            Waterfall
                        </button>
                        <button className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                            <ListOrdered className="w-4 h-4 text-slate-400" />
                            Rank
                        </button>
                    </div>
                </div>

                {/* Mini Roster Preview */}
                <div className="border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-700">Top Performers</h3>
                        <span className="text-xs text-slate-400">{topPerformers.length} shown</span>
                    </div>

                    <div className="space-y-2">
                        {topPerformers.map((report) => (
                            <div key={report.id} className="flex items-center justify-between text-sm py-1 border-b border-slate-50 last:border-0">
                                <MemberNameLookup memberId={report.memberId} />
                                <div className="font-bold text-indigo-600">
                                    {report.traitAverage?.toFixed(2) || '0.00'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}

// Helper to lookup name since Report doesn't strictly carry it in all interfaces
function MemberNameLookup({ memberId }: { memberId: string }) {
    const { roster } = useNavfitStore();
    const member = roster.find(m => m.id === memberId);
    if (!member) return <span className="text-slate-400">Unknown</span>;

    // Construct display name
    const displayName = `${member.rank} ${member.lastName}, ${member.firstName}`;

    return (
        <span className="text-slate-700 truncate max-w-[140px]" title={displayName}>
            {displayName}
        </span>
    );
}
