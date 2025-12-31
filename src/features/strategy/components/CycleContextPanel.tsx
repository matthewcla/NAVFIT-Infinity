import { useMemo, useState } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import type { SummaryGroup } from '@/types';
import { RscaHeadsUpDisplay } from './RscaHeadsUpDisplay';
import { generateSummaryGroups } from '@/features/strategy/logic/reportGenerator';
import { calculateCumulativeRSCA } from '@/features/strategy/logic/rsca';
import {
    ArrowRight,
    Layout,
    BarChart,
    ListOrdered
} from 'lucide-react';
import { MemberDetailSidebar } from '@/features/dashboard/components/MemberDetailSidebar';

interface CycleContextPanelProps {
    group: SummaryGroup | null;
    onOpenWorkspace?: () => void;
}

export function CycleContextPanel({ group, onOpenWorkspace }: CycleContextPanelProps) {
    const { rsConfig, roster, projections } = useNavfitStore();
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

    // Derived Stats using the "Dashboard" logic for advanced metrics
    const contextData = useMemo(() => {
        if (!group) return null;

        // Re-generate all groups for cumulative RSCA context
        const allGroups = generateSummaryGroups(roster, rsConfig, 2023, projections);

        // Derive Rank from competitiveGroupKey (e.g., "O-3 1110" -> "O-3") or use paygrade
        const rank = group.paygrade || (group.competitiveGroupKey ? group.competitiveGroupKey.split(' ')[0] : 'Unknown');

        // Calculate Rank-Wide Cumulative Average (Current State of all reports)
        const cumulativeRsca = calculateCumulativeRSCA(allGroups, rank);

        // Stats
        const totalReports = group.reports.length;
        const assignedEPs = group.reports.filter(r => r.promotionRecommendation === 'EP').length;
        const maxEPs = Math.floor(totalReports * 0.2); // Simple Rule of thumb
        const gap = Math.max(0, maxEPs - assignedEPs);

        const draftStats = group.reports.reduce((acc, r) => {
            const status = r.draftStatus || 'Projected';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const mainDraftStatus = Object.entries(draftStats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Pending';

        // Prepare Member List Data
        const rankedMembers = group.reports
            .map(report => {
                const member = roster.find(m => m.id === report.memberId);
                const currentMta = projections[report.id] || report.traitAverage || 0;
                const rscaMargin = currentMta - cumulativeRsca;

                return {
                    id: report.memberId, // Use memberId for selection
                    reportId: report.id,
                    name: member ? `${member.lastName}, ${member.firstName}` : 'Unknown',
                    rank: member?.rank || rank,
                    designator: member?.designator || '',
                    promRec: report.promotionRecommendation || 'NOB',
                    mta: currentMta,
                    delta: 0, // Placeholder for delta logic if history exists
                    rscaMargin,
                    reportsRemaining: report.reportsRemaining,
                    report
                };
            })
            .sort((a, b) => b.mta - a.mta); // Sort by MTA desc

        return {
            cumulativeRsca,
            rank,
            totalReports,
            gap,
            mainDraftStatus,
            rankedMembers
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

    const { cumulativeRsca, gap, mainDraftStatus, rankedMembers } = contextData;

    return (
        <div className="h-full flex flex-row relative overflow-hidden">
            {/* Main Panel Content */}
            <div className="flex-1 flex flex-col bg-slate-50 border-l border-slate-200 min-w-0">
                {/* 1. Sticky Header (Top) */}
                <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
                    <div className="px-6 pt-6 pb-4">
                        {/* Row 1: Title & Status Badges */}
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">{group.name}</h2>
                                <div className="text-sm text-slate-500 font-medium">{group.periodEndDate}</div>
                            </div>

                            {/* Status Badges (Moved to Top Right) */}
                            <div className="flex flex-col items-end gap-1.5">
                                {gap > 0 && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded text-xs font-semibold text-amber-700 border border-amber-200">
                                        {gap} Attention Needed
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 rounded text-xs font-semibold text-indigo-700 border border-indigo-200">
                                    Status: {mainDraftStatus}
                                </div>
                            </div>
                        </div>

                        {/* Row 2: RSCA Scoreboard */}
                        <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-1">
                            <RscaHeadsUpDisplay
                                currentRsca={cumulativeRsca}
                                projectedRsca={cumulativeRsca}
                                rankLabel="Curr. RSCA"
                                showSuffix={false}
                                promotionStatus={group.promotionStatus}
                            />
                        </div>
                    </div>

                    {/* 2. Sticky Toolbar (Below Header) */}
                    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 p-4 pt-2">
                        <div className="flex items-center gap-3">
                            {/* Strategy Workspace - Compact (50% reduced implies smaller relative to others or just compact) */}
                            {/* User asked: "Open Strategy Workspace: Reduce width by 50%" */}
                            {/* Original was flex-1. Let's make it fixed width or auto */}
                            <button
                                onClick={onOpenWorkspace}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all text-sm font-bold shrink-0"
                            >
                                <ArrowRight className="w-4 h-4" />
                                <span className="hidden sm:inline">Workspace</span>
                            </button>

                            {/* Action Buttons - "Increase width by 100%" implies taking up more space / becoming full buttons */}
                            <div className="flex-1 grid grid-cols-2 gap-3">
                                <button className="flex items-center justify-center gap-2 px-3 py-2.5 text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors font-medium text-sm">
                                    <BarChart className="w-4 h-4 text-slate-500" />
                                    <span>Waterfall</span>
                                </button>
                                <button className="flex items-center justify-center gap-2 px-3 py-2.5 text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors font-medium text-sm">
                                    <ListOrdered className="w-4 h-4 text-slate-500" />
                                    <span>Rank</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Member List (Scrollable Main) */}
                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 z-0">
                            <tr>
                                <th className="px-4 py-3 border-b border-slate-200 w-12 text-center">#</th>
                                <th className="px-4 py-3 border-b border-slate-200 text-left">Name</th>
                                <th className="px-4 py-3 border-b border-slate-200 text-center">Rate/Des</th>
                                <th className="px-4 py-3 border-b border-slate-200 text-center" title="Projected reports remaining until PRD"># Rpts</th>
                                <th className="px-4 py-3 border-b border-slate-200 text-center">Rec</th>
                                <th className="px-4 py-3 border-b border-slate-200 text-center">MTA</th>
                                <th className="px-4 py-3 border-b border-slate-200 text-center">Delta</th>
                                <th className="px-4 py-3 border-b border-slate-200 text-center">Margin</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {rankedMembers.map((member, idx) => (
                                <tr
                                    key={member.id}
                                    onClick={() => setSelectedMemberId(selectedMemberId === member.id ? null : member.id)}
                                    className={`cursor-pointer transition-colors hover:bg-slate-50 ${selectedMemberId === member.id ? 'bg-indigo-50/50' : ''}`}
                                >
                                    <td className="px-4 py-3 text-center text-sm text-slate-500 font-medium">{idx + 1}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-slate-700 text-left">{member.name}</td>
                                    <td className="px-4 py-3 text-sm text-slate-500 text-center">{member.designator}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 font-mono text-center">
                                        {member.reportsRemaining !== undefined ? member.reportsRemaining : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${getPromRecStyle(member.promRec)}`}>
                                            {member.promRec}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-mono text-slate-700 text-center">{member.mta.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-sm font-mono text-slate-400 text-center">
                                        {member.delta === 0 ? '-' : (member.delta > 0 ? `+${member.delta.toFixed(2)}` : member.delta.toFixed(2))}
                                    </td>
                                    <td className={`px-4 py-3 text-sm font-mono text-center font-medium ${member.rscaMargin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {member.rscaMargin > 0 ? '+' : ''}{member.rscaMargin.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sidebar Overlay */}
            {selectedMemberId && (
                <MemberDetailSidebar
                    memberId={selectedMemberId}
                    onClose={() => setSelectedMemberId(null)}
                    onUpdateMTA={(id, val) => console.log('Update MTA:', id, val)}
                />
            )}
        </div>
    );
}

function getPromRecStyle(rec: string) {
    switch (rec) {
        case 'EP': return 'bg-emerald-100 text-emerald-800';
        case 'MP': return 'bg-indigo-100 text-indigo-800';
        case 'P': return 'bg-slate-100 text-slate-600';
        default: return 'bg-gray-100 text-gray-500';
    }
}
