import React, { useMemo } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import type { SummaryGroup, Member } from '@/types';
import { RscaHeadsUpDisplay } from './RscaHeadsUpDisplay';
import { generateSummaryGroups } from '@/features/strategy/logic/reportGenerator';
import { calculateCumulativeRSCA, calculateEotRsca } from '@/features/strategy/logic/rsca';

import {
    ArrowRight,
    Layout,
    BarChart,
    ListOrdered,
    Calendar,
    Check,
    X,
    GripVertical
} from 'lucide-react';

import { MemberDetailSidebar } from '@/features/dashboard/components/MemberDetailSidebar';
import { StatusBadge } from './StatusBadge';
import { PromotionBadge } from './PromotionBadge';
import { MemberReportRow } from './MemberReportRow';


interface CycleContextPanelProps {
    group: SummaryGroup | null;
    onOpenWorkspace?: () => void;
}

export function CycleContextPanel({ group, onOpenWorkspace }: CycleContextPanelProps) {

    const {
        roster,
        rsConfig,
        projections,

        reorderMembers,
        updateReportMTA,
        updateReportPromRec,
        selectedMemberId,
        selectMember,
        setDraggingItemType
    } = useNavfitStore();
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
            });

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
            distribution,
            eotRsca: calculateEotRsca(
                roster,
                cumulativeRsca,
                rsConfig.totalReports || 100, // Fallback if 0
                rsConfig.changeOfCommandDate
            )
        };
    }, [group, roster, rsConfig, projections]);

    // Local Rank Mode State
    const [isRankingMode, setIsRankingMode] = React.useState(false);




    if (!group || !contextData) {
        return (
            <div className="h-full bg-slate-50 border-l border-slate-200 p-8 flex flex-col items-center justify-center text-center text-slate-400">
                <Layout className="w-12 h-12 mb-4 opacity-20" />
                <p>Select a cycle to view details and strategy.</p>
            </div>
        );
    }

    const { cumulativeRsca, gap, mainDraftStatus, rankedMembers, distribution, eotRsca } = contextData;

    // Helper for Badge
    const getPromotionStatusBadge = (s?: string) => {
        if (!s) return null;
        const normalized = s.toUpperCase();
        const badgeBase = "flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border shadow-sm leading-none tracking-wide";

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
                                    <StatusBadge
                                        status={mainDraftStatus}
                                        className="!px-2.5 !py-1 !text-xs !font-semibold !rounded !shadow-sm !leading-none !tracking-wide"
                                    />
                                </div>
                                <div className="flex items-center text-sm text-slate-500 font-medium">
                                    <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                                    {formattedDate}
                                </div>
                            </div>

                            {/* Status Badges (Moved to Top Right) */}
                            <div className="flex flex-col items-end gap-1.5">
                                {gap > 0 && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded text-xs font-semibold text-amber-700 border border-amber-200">
                                        {gap} Attention Needed
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 2: RSCA Scoreboard Container */}
                        <div className="flex items-stretch gap-2">
                            {/* 2A. RSCA Heads Up Display (Left) - Framed */}
                            <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white/50 shrink-0">
                                <RscaHeadsUpDisplay
                                    currentRsca={cumulativeRsca}
                                    projectedRsca={cumulativeRsca}
                                    eotRsca={eotRsca}
                                    rankLabel="Curr. RSCA"
                                    showSuffix={false}
                                />
                            </div>

                            {/* 2B. Promotion Recommendation Scoreboard (Right) - Framed & Flexible */}
                            <div className="flex-1 rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white/50">
                                <div className="flex items-center justify-around h-full px-4 bg-white/95 backdrop-blur-sm transition-all duration-300">
                                    {['SP', 'PR', 'P', 'MP', 'EP'].map((key) => (
                                        <div key={key} className="flex flex-col items-center gap-1 min-w-[32px]">
                                            <span className="text-xl font-bold text-slate-700 leading-none">
                                                {distribution[key] || 0}
                                            </span>
                                            <PromotionBadge
                                                recommendation={key}
                                                size="sm"
                                                className="rounded-[3px] !text-[10px] !py-0.5 !px-2 h-auto min-h-0 uppercase tracking-wider"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Sticky Toolbar (Below Header) */}
                    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 p-4 pt-2">
                        <div className="flex items-center justify-between">
                            {/* Left: Action Buttons */}
                            <div className="flex items-center gap-2">

                                <div className="flex items-center gap-2">

                                    {isRankingMode ? (
                                        <>
                                            <button
                                                onClick={() => setIsRankingMode(false)}
                                                className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent rounded-lg transition-colors text-xs font-medium shadow-sm"
                                                title="Save Order"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Done</span>
                                            </button>
                                            <button
                                                onClick={() => setIsRankingMode(false)}
                                                className="flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-colors text-xs font-medium"
                                                title="Cancel Reordering"
                                            >
                                                <X className="w-3.5 h-3.5 text-slate-500" />
                                                <span>Cancel</span>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            {/* Rank Button */}
                                            <button
                                                onClick={() => setIsRankingMode(true)}
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
                                        </>
                                    )}
                                </div>

                                {/* Right: Workspace Control */}
                                <div className="flex items-center gap-2 text-[10px] px-2">
                                    {!isRankingMode && (
                                        <button
                                            onClick={onOpenWorkspace}
                                            className="flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-colors text-xs font-medium"
                                        >
                                            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                                            <span>Workspace</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Member List (Scrollable Main) */}
                <div className="flex-1 overflow-y-auto">
                    {isRankingMode && (
                        <div className="sticky top-0 z-20 bg-indigo-50 border-b border-indigo-100 px-4 py-2 text-xs font-medium text-indigo-700 flex items-center justify-center">
                            Drag to reorder members by performance. Grades and projected RSCA will update automatically.
                        </div>
                    )}
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                            {isRankingMode ? (
                                <tr>
                                    <th className="px-4 py-3 border-b border-slate-200 w-12 text-center">#</th>
                                    <th className="w-10 px-2 py-3 border-b border-slate-200 text-center"></th>
                                    <th className="px-4 py-3 border-b border-slate-200 text-left">Name</th>
                                    <th className="px-4 py-3 border-b border-slate-200 text-center font-mono">Proj. MTA</th>
                                    <th className="px-4 py-3 border-b border-slate-200 text-center">Rec</th>
                                </tr>
                            ) : (
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
                            )}
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {isRankingMode ? (
                                rankedMembers.map((member, idx) => (
                                    <tr
                                        key={member.reportId}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('text/plain', member.reportId);
                                            e.dataTransfer.effectAllowed = 'move';
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.dataTransfer.dropEffect = 'move';
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            const draggedId = e.dataTransfer.getData('text/plain');
                                            const targetId = member.reportId;
                                            console.log('Dropped:', draggedId, 'on', targetId);
                                            if (draggedId && targetId && draggedId !== targetId && group) {
                                                reorderMembers(group.id, draggedId, targetId);
                                            }
                                        }}
                                        className="group bg-white hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors cursor-move"
                                    >
                                        <td className="px-4 py-3 text-center text-sm font-medium text-slate-500 w-12">
                                            {idx + 1}
                                        </td>
                                        <td className="w-10 px-2 py-3 text-center touch-none">
                                            <div
                                                className="flex items-center justify-center p-1 rounded hover:bg-slate-200/50 text-slate-400 group-hover:text-slate-600 transition-colors"
                                            >
                                                <GripVertical className="w-4 h-4" />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                            {member.name}
                                            <span className="ml-2 text-xs font-normal text-slate-400">{member.rank}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 text-center font-mono">
                                            {member.mta.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <PromotionBadge recommendation={member.promRec} size="sm" />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                rankedMembers.map((member, idx) => (
                                    <MemberReportRow
                                        key={member.id}
                                        id={member.id}
                                        reportId={member.reportId}
                                        groupId={group.id}
                                        index={idx}
                                        name={member.name}
                                        designator={member.designator}
                                        reportsRemaining={member.reportsRemaining}
                                        promRec={member.promRec}
                                        mta={member.mta}
                                        delta={member.delta}
                                        rscaMargin={member.rscaMargin}
                                        isSelected={selectedMemberId === member.id}
                                        isRankMode={false}
                                        onClick={() => selectMember(selectedMemberId === member.id ? null : member.id)}
                                        onDragStart={(e, data) => {
                                            setDraggingItemType('member_report');
                                            e.dataTransfer.setData('member_report', JSON.stringify(data));
                                        }}
                                        onDragEnd={() => setDraggingItemType(null)}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


            {
                selectedMemberId && (
                    <MemberDetailSidebar
                        memberId={selectedMemberId}
                        rosterMember={(() => {
                            const m = roster.find(memb => memb.id === selectedMemberId);
                            if (!m) {
                                return {
                                    id: selectedMemberId,
                                    name: 'Unknown Member',
                                    rank: 'UNK',
                                    designator: '0000',
                                    status: 'Onboard',
                                    history: []
                                } as Member;
                            }
                            return {
                                ...m,
                                name: `${m.lastName}, ${m.firstName}`,
                                history: m.history || [],
                                status: (m.status as any) || 'Onboard' // Ensure status matches expected union
                            } as unknown as Member;
                        })()}
                        currentReport={group.reports.find(r => r.memberId === selectedMemberId)}
                        groupStats={{ currentRSCA: cumulativeRsca, projectedRSCA: cumulativeRsca }} // TODO: Calculate actual proj RSCA
                        onClose={() => selectMember(null)}
                        onUpdateMTA={(id, val) => {
                            const report = group.reports.find(r => r.memberId === id);
                            if (report) {
                                updateReportMTA(group.id, report.id, val);
                            }
                        }}
                        onUpdatePromRec={(id, rec) => {
                            const report = group.reports.find(r => r.memberId === id);
                            if (report) {
                                updateReportPromRec(group.id, report.id, rec);
                            }
                        }}
                        onNavigatePrev={() => {
                            const idx = rankedMembers.findIndex(m => m.id === selectedMemberId);
                            if (idx > 0) selectMember(rankedMembers[idx - 1].id);
                        }}
                        onNavigateNext={() => {
                            const idx = rankedMembers.findIndex(m => m.id === selectedMemberId);
                            if (idx < rankedMembers.length - 1) selectMember(rankedMembers[idx + 1].id);
                        }}
                    />
                )
            }


        </div >
    );
}
