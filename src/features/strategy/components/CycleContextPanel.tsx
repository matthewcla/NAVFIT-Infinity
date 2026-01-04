import { useMemo, useState } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { useRedistributionStore } from '@/store/useRedistributionStore';
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
    Send,
    Sparkles
} from 'lucide-react';

import { MemberDetailSidebar } from '@/features/dashboard/components/MemberDetailSidebar';
import { StatusBadge } from './StatusBadge';

import { QuotaHeadsUpDisplay } from './QuotaHeadsUpDisplay';
import { CycleMemberList, type RankedMember } from './CycleMemberList';
import { SubmissionConfirmationModal } from './SubmissionConfirmationModal';
import { createSummaryGroupContext } from '@/features/strategy/logic/validation';
import { DEFAULT_CONSTRAINTS } from '@/domain/rsca/constants';


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
        addSummaryGroup,
        summaryGroups,

        selectedMemberId,
        selectMember,
        setDraggingItemType,
        updateProjection,
        updateGroupStatus
    } = useNavfitStore();

    const { latestResult, requestRedistribution } = useRedistributionStore();

    // Reactivity Fix: Ensure we use the latest group state from store, even if parent prop is stale
    const latestGroup = useNavfitStore(state =>
        group ? state.summaryGroups.find(g => g.id === group.id) || group : null
    );

    const activeGroup = latestGroup || group;

    const handleOptimize = () => {
        if (!activeGroup || !rsConfig) return;

        // Ensure strict sorting based on current state before optimizing
        const sortedReports = [...activeGroup.reports].sort((a, b) => b.traitAverage - a.traitAverage);

        const domainMembers = sortedReports.map((r, i) => ({
             id: r.id,
             rank: i + 1,
             mta: r.traitAverage,
             isAnchor: !!r.isLocked,
             anchorValue: r.traitAverage,
             name: `${r.firstName} ${r.lastName}`
        }));

        requestRedistribution(
            activeGroup.id,
            domainMembers,
            DEFAULT_CONSTRAINTS,
            rsConfig.targetRsca
        );
    };

    const handleReorderMembers = (groupId: string, droppedId: string, newOrderIds: string[]) => {
        // Fix: If this is an auto-generated group (not in store), we must persist it first.
        const existingGroup = summaryGroups.find(g => g.id === groupId);

        if (!existingGroup && group) {
            // It's transient. Add it to store first.
            addSummaryGroup(group);
            // Now reorder (store will find it by ID)
            reorderMembers(groupId, droppedId, newOrderIds);
        } else {
            // Normal path
            reorderMembers(groupId, droppedId, newOrderIds);
        }
    };

    // Use latestGroup for all derived logic
    // const activeGroup = latestGroup || group; // Moved up for usage in handleOptimize

    // Derived Stats using the "Dashboard" logic for advanced metrics
    const contextData = useMemo(() => {
        if (!activeGroup) return null;

        // Re-generate all groups for cumulative RSCA context
        const allGroups = generateSummaryGroups(roster, rsConfig, 2023, projections);

        // Derive Rank from competitiveGroupKey (e.g., "O-3 1110" -> "O-3") or use paygrade
        const rank = activeGroup.paygrade || (activeGroup.competitiveGroupKey ? activeGroup.competitiveGroupKey.split(' ')[0] : 'Unknown');

        // Calculate Rank-Wide Cumulative Average (Current State of all reports)
        const cumulativeRsca = calculateCumulativeRSCA(allGroups, rank);

        // Stats
        const totalReports = activeGroup.reports.length;
        const assignedEPs = activeGroup.reports.filter(r => r.promotionRecommendation === 'EP').length;
        const maxEPs = Math.floor(totalReports * 0.2); // Simple Rule of thumb
        const gap = Math.max(0, maxEPs - assignedEPs);

        const draftStats = activeGroup.reports.reduce((acc, r) => {
            const status = r.draftStatus || 'Projected';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const derivedStatus = Object.entries(draftStats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Pending';

        // Priority: Use explicit group status if valid, otherwise fallback to derived
        const mainDraftStatus = (activeGroup.status && activeGroup.status !== 'Pending') ? activeGroup.status : derivedStatus;

        // Prepare Member List Data
        const rankedMembers = activeGroup.reports
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
            // Ensure Strict Sorting for Display
            .sort((a, b) => b.mta - a.mta);

        // Calculate Distribution
        const distribution: { [key: string]: number; SP: number; PR: number; P: number; MP: number; EP: number; } = { SP: 0, PR: 0, P: 0, MP: 0, EP: 0 };
        activeGroup.reports.forEach(r => {
            const rec = r.promotionRecommendation;
            if (rec === 'SP') distribution.SP++;
            else if (rec === 'Prog') distribution.PR++;
            else if (rec === 'P') distribution.P++;
            else if (rec === 'MP') distribution.MP++;
            else if (rec === 'EP') distribution.EP++;
        });

        // Create Domain Context
        const domainContext = createSummaryGroupContext(activeGroup);

        return {
            cumulativeRsca,
            rank,
            totalReports,
            gap,
            mainDraftStatus,
            rankedMembers,
            distribution,
            domainContext,
            eotRsca: calculateEotRsca(
                roster,
                cumulativeRsca,
                rsConfig.totalReports || 100, // Fallback if 0
                rsConfig.changeOfCommandDate
            )
        };
    }, [activeGroup, roster, rsConfig, projections]); // Depend on activeGroup

    // Local Rank Mode State
    const [isRankingMode, setIsRankingMode] = useState(false);
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

    // Local Drag State for Live Reordering (iOS-style)
    const [localOrderedMembers, setLocalOrderedMembers] = useState<RankedMember[] | null>(null);
    const [draggedReportId, setDraggedReportId] = useState<string | null>(null);


    if (!activeGroup || !contextData) {
        return (
            <div className="h-full bg-slate-50 border-l border-slate-200 p-8 flex flex-col items-center justify-center text-center text-slate-400">
                <Layout className="w-12 h-12 mb-4 opacity-20" />
                <p>Select a cycle to view details and strategy.</p>
            </div>
        );
    }

    const { cumulativeRsca, gap, mainDraftStatus, rankedMembers, distribution, eotRsca, totalReports, domainContext } = contextData;

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

    const formattedDate = new Date(activeGroup.periodEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const handleConfirmSubmit = () => {
        // Use the newly implemented store action to update status to "Submitted"
        if (updateGroupStatus && activeGroup) {
            updateGroupStatus(activeGroup.id, "Submitted");
        }
        setIsSubmitModalOpen(false);
    };


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
                                    <h2 className="text-2xl font-bold text-slate-900">{cleanTitle(activeGroup.name)}</h2>
                                    {getPromotionStatusBadge(activeGroup.promotionStatus)}
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

                            <div className="flex flex-col items-end gap-1.5 pl-4">
                                {/* Submit Control - Morphing Style */}
                                <button
                                    onClick={() => setIsSubmitModalOpen(true)}
                                    disabled={!latestResult[activeGroup.id] || activeGroup.status === 'Submitted'}
                                    className="group relative flex items-center justify-center h-11 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-full shadow-sm transition-all duration-300 ease-in-out w-11 hover:w-36 overflow-hidden"
                                    title="Submit Strategy to Review"
                                >
                                    <div className="absolute left-0 w-11 h-11 flex items-center justify-center shrink-0">
                                        <Send className="w-5 h-5" />
                                    </div>
                                    <span className="whitespace-nowrap font-bold text-xs uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-300 pl-10 pr-4 delay-75">
                                        Submit Group
                                    </span>
                                </button>
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

                            {/* 2B. Promotion Recommendation Quota HUD (Right) - Framed & Flexible */}
                            <div className="flex-1 rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white/50">
                                <div className="h-full bg-white/95 backdrop-blur-sm transition-all duration-300">
                                    <QuotaHeadsUpDisplay distribution={distribution} totalReports={totalReports} context={domainContext} />
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
                                                onClick={() => {
                                                    setIsRankingMode(false);
                                                    setLocalOrderedMembers(null);
                                                }}
                                                className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent rounded-lg transition-colors text-xs font-medium shadow-sm"
                                                title="Save Order"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Done</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsRankingMode(false);
                                                    setLocalOrderedMembers(null);
                                                }}
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

                                            {/* Optimize Button */}
                                            <button
                                                onClick={handleOptimize}
                                                className="flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-colors text-xs font-medium"
                                                title="Optimize MTA Distribution"
                                            >
                                                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                                <span>Optimize</span>
                                            </button>

                                        </>
                                    )}
                                </div>

                                {/* Right: Workspace Control & Alerts */}
                                <div className="flex items-center gap-3 text-[10px] px-2">

                                    {!isRankingMode && (
                                        <button
                                            onClick={onOpenWorkspace}
                                            className="flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-colors text-xs font-medium"
                                        >
                                            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                                            <span>Workspace</span>
                                        </button>
                                    )}

                                    {/* Moved Alert Badge - Adjusted to be Right-Most Edge */}
                                    {gap > 0 && (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 rounded-md text-xs font-bold text-amber-700 border border-amber-200 shadow-sm animate-in fade-in slide-in-from-right-2">
                                            <span>{gap} Attention Needed</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Member List (Scrollable Main) */}
                <CycleMemberList
                    isRankingMode={isRankingMode}
                    rankedMembers={rankedMembers as RankedMember[]}
                    localOrderedMembers={localOrderedMembers}
                    setLocalOrderedMembers={setLocalOrderedMembers}
                    draggedReportId={draggedReportId}
                    setDraggedReportId={setDraggedReportId}
                    activeGroupId={activeGroup.id}
                    selectedMemberId={selectedMemberId}
                    onSelectMember={selectMember}
                    onReorderMembers={handleReorderMembers}
                    setDraggingItemType={setDraggingItemType}
                />
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
                                status: (m.status as Member['status']) || 'Onboard' // Ensure status matches expected union
                            } as unknown as Member;
                        })()}
                        currentReport={activeGroup.reports.find(r => r.memberId === selectedMemberId)}

                        // Pass Quota Context
                        quotaContext={{
                            distribution,
                            totalReports
                        }}
                        groupContext={domainContext}
                        isRankingMode={isRankingMode}

                        // Pass Rank Context
                        rankContext={(() => {
                            const index = rankedMembers.findIndex(m => m.id === selectedMemberId);
                            if (index === -1) return undefined;

                            // "Next Rank" (Ahead/Better) - Lower indices
                            // Get up to 5 members before current index (reversed to be closest first)
                            const nextStart = Math.max(0, index - 5);
                            const nextRanks = rankedMembers.slice(nextStart, index).reverse().map((m, i) => ({
                                mta: m.mta,
                                rank: index - i // index is current rank-1. So neighbor is rank (index-i)
                            }));

                            // "Prev Rank" (Behind/Worse) - Higher indices
                            // Get up to 5 members after current index
                            const prevEnd = Math.min(rankedMembers.length, index + 6);
                            const prevRanks = rankedMembers.slice(index + 1, prevEnd).map((m, i) => ({
                                mta: m.mta,
                                rank: index + 2 + i // index+1 is next rank (#index+2)
                            }));

                            return {
                                currentRank: index + 1,
                                nextRanks,
                                prevRanks
                            };
                        })()}

                        onClose={() => selectMember(null)}
                        onUpdateMTA={(id, val) => {
                            const report = activeGroup.reports.find(r => r.memberId === id);
                            if (report) {
                                updateProjection(activeGroup.id, report.id, val);
                            }
                        }}
                        onUpdatePromRec={(id, rec) => {
                            // TODO: Integrate with store action
                            console.log('Update PromRec:', id, rec);
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

            {latestResult[activeGroup.id] && (
                <SubmissionConfirmationModal
                    isOpen={isSubmitModalOpen}
                    onClose={() => setIsSubmitModalOpen(false)}
                    onConfirm={handleConfirmSubmit}
                    groupId={activeGroup.id}
                    result={latestResult[activeGroup.id]!}
                />
            )}

        </div >
    );
}
