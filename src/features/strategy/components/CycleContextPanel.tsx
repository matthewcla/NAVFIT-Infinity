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
import { StatusBadge } from './StatusBadge';
import { PromotionBadge } from './PromotionBadge';

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

        const derivedStatus = Object.entries(draftStats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Pending';

        // Priority: Use explicit group status if valid, otherwise fallback to derived
        const mainDraftStatus = (group.status && group.status !== 'Pending') ? group.status : derivedStatus;

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

        // Calculate Distribution
        const distribution: Record<string, number> = { SP: 0, PR: 0, P: 0, MP: 0, EP: 0 };
        group.reports.forEach(r => {
            const rec = r.promotionRecommendation;
            if (rec === 'SP') distribution.SP++;
            else if (rec === 'Prog') distribution.PR++;
            else if (rec === 'P') distribution.P++;
            else if (rec === 'MP') distribution.MP++;
            else if (rec === 'EP') distribution.EP++;
        });

        return {
            cumulativeRsca,
            rank,
            totalReports,
            gap,
            mainDraftStatus,
            rankedMembers,
            distribution
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

    const { cumulativeRsca, gap, mainDraftStatus, rankedMembers, distribution } = contextData;

    // Helper for Badge
    const getPromotionStatusBadge = (s?: string) => {
        if (!s) return null;
        const normalized = s.toUpperCase();
        const badgeBase = "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border shadow-sm leading-none tracking-wide";

        switch (normalized) {
            case 'FROCKED': return <div className={`${badgeBase} bg-amber-100 text-amber-800 border-amber-200`}>FROCKED</div>;
            case 'SELECTED': return <div className={`${badgeBase} bg-green-100 text-green-800 border-green-200`}>SELECTED</div>;
            case 'SPOT': return <div className={`${badgeBase} bg-purple-100 text-purple-800 border-purple-200`}>SPOT</div>;
            case 'REGULAR': return <div className={`${badgeBase} bg-slate-100 text-slate-600 border-slate-200`}>REGULAR</div>;
            default: return null;
        }
    };

    // Helper to clean title
    const cleanTitle = (t: string) => {
        return t.replace(/\b(FROCKED|REGULAR|SELECTED|SPOT)\b/gi, '').trim();
    };

    const formattedDate = new Date(group.periodEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <div className="h-full flex flex-row relative overflow-hidden">
            {/* Main Panel Content */}
            <div className="flex-1 flex flex-col bg-slate-50 border-l border-slate-200 min-w-0">
                {/* 1. Sticky Header (Top) */}
                <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
                    <div className="px-6 pt-6 pb-4">
                        {/* Row 1: Title & Status Badges */}
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-bold text-slate-900">{cleanTitle(group.name)}</h2>
                                    {getPromotionStatusBadge(group.promotionStatus)}
                                </div>
                                <div className="text-sm text-slate-500 font-medium">{formattedDate}</div>
                            </div>

                            {/* Status Badges (Moved to Top Right) */}
                            <div className="flex flex-col items-end gap-1.5">
                                <StatusBadge status={mainDraftStatus} />
                                {gap > 0 && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded text-xs font-semibold text-amber-700 border border-amber-200">
                                        {gap} Attention Needed
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 2: RSCA Scoreboard */}
                        <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-1">
                            <RscaHeadsUpDisplay
                                currentRsca={cumulativeRsca}
                                projectedRsca={cumulativeRsca}
                                rankLabel="Curr. RSCA"
                                showSuffix={false}
                            />
                        </div>
                    </div>

                    {/* 2. Sticky Toolbar (Below Header) */}
                    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 p-4 pt-2">
                        <div className="flex items-center justify-between">
                            {/* Left: Action Buttons */}
                            <div className="flex items-center gap-2">
                                {/* Strategy Workspace */}
                                <button
                                    onClick={onOpenWorkspace}
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg shadow-sm transition-all text-xs font-bold"
                                >
                                    <ArrowRight className="w-3.5 h-3.5" />
                                    <span>Workspace</span>
                                </button>

                                {/* Rank Button */}
                                <button
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-colors text-xs font-medium"
                                    title="Rank Members"
                                >
                                    <ListOrdered className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Rank</span>
                                </button>

                                {/* Waterfall Button */}
                                <button
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-colors text-xs font-medium"
                                    title="Waterfall View"
                                >
                                    <BarChart className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Waterfall</span>
                                </button>
                            </div>

                            {/* Right: Distribution Stats */}
                            <div className="flex items-center gap-2 text-[10px] px-2">
                                {['SP', 'PR', 'P', 'MP', 'EP'].map(key => (
                                    <div key={key} className="flex flex-col items-center justify-center gap-1 min-w-[24px]">
                                        <span className="text-slate-700 font-bold leading-none text-xs">{distribution[key] || 0}</span>
                                        <PromotionBadge recommendation={key} size="sm" className="rounded-[3px]" />
                                    </div>
                                ))}
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
                                        <PromotionBadge recommendation={member.promRec} size="xs" className="rounded-sm px-1.5" />
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
