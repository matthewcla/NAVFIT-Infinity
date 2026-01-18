import { useMemo, useState, useEffect } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { useRedistributionStore } from '@/store/useRedistributionStore';
import type { SummaryGroup, Report } from '@/types';
import type { RosterMember } from '@/types/roster';
import { RscaHeadsUpDisplay } from './RscaHeadsUpDisplay';
import { RscaScattergram } from './RscaScattergram';
// generateSummaryGroups import removed - now using stored summaryGroups directly
import { calculateCumulativeRSCA, calculateEotRsca, getCompetitiveGroupStats } from '@/features/strategy/logic/rsca';
import { getCompetitiveCategory } from '@/features/strategy/logic/competitiveGroupUtils';
import { mapUiPaygradeToDomain } from '@/features/strategy/logic/recommendation';

import {
    Layout,
    Calendar,
    Send
} from 'lucide-react';

import { MemberDetailSidebar } from '@/features/dashboard/components/MemberDetailSidebar';
import { StatusBadge } from './StatusBadge';

import { QuotaHeadsUpDisplay } from './QuotaHeadsUpDisplay';
import { CycleMemberList, type RankedMember } from './CycleMemberList';
import { SubmissionConfirmationModal } from './SubmissionConfirmationModal';
import { createSummaryGroupContext } from '@/features/strategy/logic/validation';
import { DEFAULT_CONSTRAINTS } from '@/domain/rsca/constants';
import { assignRecommendationsByRank } from '@/features/strategy/logic/recommendation';


interface CycleContextPanelProps {
    group: SummaryGroup | null;
    onOpenWorkspace?: () => void;
}

export function CycleContextPanel({ group }: CycleContextPanelProps) {

    const {
        roster,
        rsConfig,
        projections,

        reorderMembers,
        addSummaryGroup,
        summaryGroups,

        selectedMemberId,
        selectMember,
        updateProjection,
        updateGroupStatus,
        updateReport
    } = useNavfitStore();

    const { latestResult, requestRedistribution } = useRedistributionStore();

    // Reactivity Fix: Ensure we use the latest group state from store, even if parent prop is stale
    const latestGroup = useNavfitStore(state =>
        group ? state.summaryGroups.find(g => g.id === group.id) || group : null
    );

    const activeGroup = latestGroup || group;

    // Real-time preview projections for MTA slider (merged with store projections in useMemo)
    const [previewProjections, setPreviewProjections] = useState<Record<string, number>>({});

    // Handler for real-time MTA preview during slider drag
    const handlePreviewMTA = (memberId: string, newMta: number) => {
        if (!activeGroup) return;
        const report = activeGroup.reports.find(r => r.memberId === memberId);
        if (report) {
            setPreviewProjections(prev => ({
                ...prev,
                [report.id]: newMta
            }));
        }
    };

    // Clear preview when member selection changes
    const handleMemberSelect = (id: string | null) => {
        setPreviewProjections({});
        selectMember(id);
    };

    // Local Rank Mode State
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

    // Optimization Review State
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [proposedReports, setProposedReports] = useState<Report[] | null>(null);

    // Watch for Optimization Result - PARANOID/HARDENED VERSION
    useEffect(() => {
        if (!isOptimizing || !activeGroup || !latestResult[activeGroup.id]) return;

        // Process Result
        const result = latestResult[activeGroup.id]!;
        const currentReports = [...activeGroup.reports];

        // Step 1: Hydrate from Worker Result
        const optimizedMtas: Record<string, number> = {};
        result.updatedMembers.forEach(m => {
            optimizedMtas[m.id] = parseFloat(Number(m.mta).toFixed(2));
        });

        // Step 2: Sanitize Phase 1 - Apply MTAs and Force NOB to 0.00
        const hydrated = currentReports.map(r => {
            const isNob = r.promotionRecommendation === 'NOB';
            // Use worker result if available, otherwise keep existing
            const newMta = optimizedMtas[r.id] !== undefined ? optimizedMtas[r.id] : r.traitAverage;

            // Force NOB to 0.00, otherwise ensure precision
            const finalMta = isNob ? 0.00 : parseFloat(Number(newMta).toFixed(2));

            return {
                ...r,
                traitAverage: finalMta
            };
        });

        // Step 3: Sort Phase 1 - Descending MTA
        hydrated.sort((a, b) => b.traitAverage - a.traitAverage);

        // Tracer Log 1
        console.log('[Optimize Pipeline] Post-Sort Phase 1 (NOBs should be at bottom):',
            hydrated.filter(r => r.promotionRecommendation === 'NOB').map(r => ({ id: r.id, mta: r.traitAverage }))
        );

        // Step 4: Assign Recommendations based on Rank
        const reallocated = assignRecommendationsByRank(hydrated, activeGroup);

        // Step 5: Sanitize Phase 2 - Safety Net
        const sanitized = reallocated.map(r => {
            if (r.promotionRecommendation === 'NOB') {
                return { ...r, traitAverage: 0.00 };
            }
            return r;
        });

        // Tracer Log 2
        console.log('[Optimize Pipeline] Post-Sanitize Phase 2 (NOBs confirmed 0.00):',
            sanitized.filter(r => r.promotionRecommendation === 'NOB').map(r => ({ id: r.id, mta: r.traitAverage }))
        );

        // Step 6: Sanitize Phase 3 - Enforce Enlisted/Officer Logic and Restrictions
        // Specifically: ENS (O1) and LTJG (O2) are not allowed EP and MP unless they are LDO.
        const enforced = sanitized.map(r => {
            // Determine Paygrade from report or generic group context
            const paygradeStr = r.grade || activeGroup.paygrade;
            // Map to Domain Paygrade (e.g. "O1", "O2")
            // Note: r.grade might be "O-1", mapUiPaygradeToDomain handles "O-1" -> "O1"
            const paygrade = mapUiPaygradeToDomain(paygradeStr);

            // Determine Competitive Category (LDO check)
            // Use report designator if available (preferred), else group default
            const designator = r.designator || activeGroup.designator || '';
            const category = getCompetitiveCategory(designator);
            const isLDO = category.code === 'LDO_ACTIVE' || category.code === 'LDO_CWO_RESERVE';

            // Check Condition: O1/O2 AND Not LDO
            const isJuniorOfficer = paygrade === 'O1' || paygrade === 'O2';

            if (isJuniorOfficer && !isLDO) {
                // Check if they were assigned EP or MP
                if (r.promotionRecommendation === 'EP' || r.promotionRecommendation === 'MP') {
                    console.log(`[Optimize Pipeline] Enforcing O1/O2 Restriction for ${r.memberName} (${paygrade}/${designator}): Downgrading ${r.promotionRecommendation} -> P`);
                    return {
                        ...r,
                        promotionRecommendation: 'P' as Report['promotionRecommendation']
                    };
                }
            }
            return r;
        });

        // Step 7: Sort Phase 2 - Final Index Integrity
        enforced.sort((a, b) => b.traitAverage - a.traitAverage);

        // Step 8: Commit
        setProposedReports(enforced);

        // Defer isOptimizing=false to next animation frame
        requestAnimationFrame(() => {
            setIsOptimizing(false);
        });

    }, [latestResult, isOptimizing, activeGroup]);

    const handleAcceptOptimization = () => {
        if (!activeGroup || !proposedReports) return;

        // Commit to Store
        // Use the dedicated commitOptimization action which handles updating reports AND clearing stale projections
        useNavfitStore.getState().commitOptimization(activeGroup.id, proposedReports);

        // State update handled by store, we just clear local
        // const newGroup = { ...activeGroup, reports: proposedReports };
        // const allGroups = summaryGroups.map(g => g.id === activeGroup.id ? newGroup : g);
        // useNavfitStore.getState().setSummaryGroups(allGroups);

        setProposedReports(null);
        setPreviewProjections({});
    };

    const handleCancelOptimization = () => {
        setProposedReports(null);
        setPreviewProjections({});
    };


    const handleOptimize = () => {
        if (!activeGroup || !rsConfig) return;

        setIsOptimizing(true);
        setProposedReports(null);

        // Ensure strict sorting based on current state before optimizing
        const sortedReports = [...activeGroup.reports].sort((a, b) => b.traitAverage - a.traitAverage);

        const domainMembers = sortedReports.map((r, i) => ({
            id: r.id,
            rank: i + 1,
            mta: r.traitAverage,
            isAnchor: !!r.isLocked,
            anchorValue: r.traitAverage,
            name: r.memberName || 'Unknown'
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

        // Determine Effective Reports (Active vs Proposed)
        const effectiveReports = proposedReports || activeGroup.reports;

        // Use stored summaryGroups but override the active group with proposed state for calculation context
        const allGroups = summaryGroups.map(g =>
            (g.id === activeGroup.id && proposedReports)
                ? { ...g, reports: proposedReports }
                : g
        );


        // Rank Logic
        // Derive Rank from competitiveGroupKey (e.g., "O-3 1110" -> "O-3") or use paygrade
        const rank = activeGroup.paygrade || (activeGroup.competitiveGroupKey ? activeGroup.competitiveGroupKey.split(' ')[0] : 'Unknown');
        // Robust Enlisted Check: Start with E or explicitly matched paygrades
        const isEnlisted = rank.startsWith('E') || ['E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6', 'E-7', 'E-8', 'E-9'].includes(activeGroup.paygrade || '');


        // Calculate Projected RSCA (Includes Final + [Submitted, Review, Draft])
        // We include "Submitted", "Review", "Draft" to see the "Projected" impact.
        // We do NOT include "Rejected".
        // Merge store projections with real-time preview for live slider updates
        const effectiveProjections = { ...projections, ...previewProjections };

        // Optimization Preview Overlay:
        // If we have proposed reports, their MTAs are the "projections" we want to see.
        // We should override effectiveProjections with the proposed values so the HeadsUpDisplay updates.
        if (proposedReports) {
            proposedReports.forEach(r => {
                effectiveProjections[r.id] = r.traitAverage;
            });
        }

        const projectedRsca = calculateCumulativeRSCA(
            allGroups,
            rank,
            ['Final', 'Submitted', 'Review', 'Draft'],
            effectiveProjections
        );

        // Calculate Baseline (Current RSCA - Only Final Reports)
        // Strictly "Current" means what is on the books.
        // We exclude the current active group and any other drafts.
        // Note: Logic in rsca.ts excludes activeGroup.id if passed to getCompetitiveGroupStats, 
        // but here we primarily rely on Status Filter 'Final'.
        // If the active group is somehow 'Final' (not possible here given context, but logic holds), it would be included if we didn't exclude.
        // Safe bet: currentRsca is HISTORICAL FINAL.
        const baselineStats = getCompetitiveGroupStats(
            allGroups,
            rank,
            activeGroup.id,
            ['Final']
        );
        const currentRsca = baselineStats.average;

        // Stats (Moved up for use in EOT calc)
        const totalReports = effectiveReports.length;
        // Exclude NOB reports from effective size for quota calculations (matches assignment logic)
        const nobCount = effectiveReports.filter(r => r.promotionRecommendation === 'NOB').length;
        const effectiveSize = totalReports - nobCount;
        const assignedEPs = effectiveReports.filter(r => r.promotionRecommendation === 'EP').length;
        const maxEPs = Math.floor(effectiveSize * 0.2); // Use effectiveSize for quota calc
        const gap = Math.max(0, maxEPs - assignedEPs);


        // Calculate EOT Projection
        const eotResult = calculateEotRsca(
            roster,
            projectedRsca, // Use Projected as baseline for future
            (rsConfig.totalReports || 0) + totalReports,
            rsConfig.changeOfCommandDate,
            rank
        );

        // Handle Return: rsca.ts now returns object { eotRsca, memberProjections }
        // Ensure we handle potential legacy return if hot-reload hasn't caught up (though we just edited it).
        // TypeScript might complain if types aren't fully synced. Assuming updated signature:
        const globalEotRsca = typeof eotResult === 'object' ? eotResult.eotRsca : eotResult;
        const memberEotProjections = typeof eotResult === 'object' ? eotResult.memberProjections : {};

        const draftStats = effectiveReports.reduce((acc, r) => {
            const status = r.draftStatus || 'Planned';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const derivedStatus = Object.entries(draftStats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Pending';

        // Priority: Use explicit group status if valid, otherwise fallback to derived
        const mainDraftStatus = (activeGroup.status && activeGroup.status !== 'Pending') ? activeGroup.status : derivedStatus;

        // Prepare Member List Data
        const rankedMembers = effectiveReports
            .map(report => {
                const member = roster.find(m => m.id === report.memberId);
                // Use effectiveProjections (includes proposed values during optimization), not projections
                // FIX: For locked reports (except NOB), always use committed traitAverage to prevent reversion
                const isLockedNonNob = report.isLocked && report.promotionRecommendation !== 'NOB';
                const currentMta = isLockedNonNob
                    ? report.traitAverage
                    : (effectiveProjections[report.id] ?? report.traitAverage ?? 0);
                const rscaMargin = currentMta - projectedRsca; // Margin against Projected RSCA

                // Robust Fallback: Use Report Snapshot if Roster Lookup Fails
                const name = member
                    ? `${member.lastName}, ${member.firstName}`
                    : (report.memberName || 'Unknown');

                // For Enlisted: strictly use member.rank (e.g. "BM1") if available.
                // Fallback to report.memberRank, then to paygrade "rank" variable.
                const memberRank = member?.rank || report.memberRank || report.grade || rank;
                const memberDesignator = member?.designator || report.designator || '';

                let reportsRemaining = report.reportsRemaining;
                if (reportsRemaining === undefined && member?.prd && report.periodEndDate) {
                    const prdYear = new Date(member.prd).getFullYear();
                    const reportYear = new Date(report.periodEndDate).getFullYear();
                    if (!isNaN(prdYear) && !isNaN(reportYear)) {
                        reportsRemaining = Math.max(0, prdYear - reportYear);
                    }
                }

                // EOT Projection for this member
                const eotMta = memberEotProjections[report.memberId] || 0;

                // Calculate Delta vs Last Report
                let delta = 0;
                if (member?.history && member.history.length > 0) {
                    const currentEndDate = new Date(report.periodEndDate);

                    const previousReport = member.history
                        .filter(h => new Date(h.periodEndDate) < currentEndDate)
                        .sort((a, b) => new Date(b.periodEndDate).getTime() - new Date(a.periodEndDate).getTime())[0];

                    if (previousReport) {
                        delta = currentMta - previousReport.traitAverage;
                    }
                }
                return {
                    id: report.memberId, // Use memberId for selection
                    reportId: report.id,
                    name,
                    rank: memberRank,
                    designator: memberDesignator,
                    promRec: report.promotionRecommendation || 'NOB',
                    mta: currentMta,
                    delta,
                    rscaMargin,
                    eotMta, // New Prop
                    reportsRemaining,
                    report
                };
            });

        // Conditional Sorting Logic:
        // - If hasManualOrder is false/undefined (initial load): sort by MTA descending
        // - If hasManualOrder is true (user has manually reordered): preserve storage order
        if (!activeGroup.hasManualOrder) {
            rankedMembers.sort((a, b) => b.mta - a.mta);
        }

        // DEBUG: Log rankedMembers computation
        console.log('[UI DEBUG] rankedMembers computed', {
            effectiveProjections,
            rankedOrder: rankedMembers.map(m => ({
                id: m.id,
                name: m.name,
                mta: m.mta,
                reportMta: m.report.traitAverage,
                locked: m.report.isLocked
            }))
        });

        // Compute preview MTA-sorted position for real-time rank updates
        // This allows the member list to show updated ranks as the slider moves
        const previewMtaSortedMembers = [...rankedMembers].sort((a, b) => b.mta - a.mta);
        const previewMtaRankMap = new Map<string, number>();
        previewMtaSortedMembers.forEach((m, idx) => {
            previewMtaRankMap.set(m.reportId, idx + 1);
        });

        // Compute preview promotion recommendations based on MTA-sorted rank order
        // This ensures promotion recs update in real-time as the slider moves
        const previewPromRecMap = new Map<string, string>();
        if (previewMtaSortedMembers.length > 0) {
            // Create temporary reports with MTA-sorted order and current preview MTAs
            const tempReports = previewMtaSortedMembers.map(m => ({
                ...m.report,
                traitAverage: m.mta // Use the preview MTA value
            }));

            // Run assignment algorithm on the preview-sorted reports
            const previewAssignedReports = assignRecommendationsByRank(tempReports, activeGroup);

            // Map reportId to preview promotion recommendation
            previewAssignedReports.forEach(r => {
                previewPromRecMap.set(r.id, r.promotionRecommendation || 'P');
            });
        }

        // Calculate Distribution (use preview recs if available for accurate display)
        const distribution: { [key: string]: number; SP: number; PR: number; P: number; MP: number; EP: number; } = { SP: 0, PR: 0, P: 0, MP: 0, EP: 0 };
        effectiveReports.forEach(r => {
            // Use preview rec if available, otherwise use stored rec
            const rec = previewPromRecMap.get(r.id) || r.promotionRecommendation;
            if (rec === 'SP') distribution.SP++;
            else if (rec === 'Prog') distribution.PR++;
            else if (rec === 'P') distribution.P++;
            else if (rec === 'MP') distribution.MP++;
            else if (rec === 'EP') distribution.EP++;
        });

        // Create Domain Context
        const domainContext = createSummaryGroupContext(activeGroup);

        return {
            currentRsca,
            projectedRsca,
            rank,
            totalReports,
            effectiveSize, // NOB-excluded size for quota calculations
            gap,
            mainDraftStatus,
            rankedMembers,
            previewMtaSortedMembers,
            previewMtaRankMap,
            previewPromRecMap,
            distribution,
            domainContext,
            eotRsca: globalEotRsca,
            isEnlisted
        };
    }, [activeGroup, roster, rsConfig, projections, previewProjections, summaryGroups, proposedReports]); // Added proposedReports dependency




    if (!activeGroup || !contextData) {
        return (
            <div className="h-full bg-slate-50 border-l border-slate-200 p-8 flex flex-col items-center justify-center text-center text-slate-400">
                <Layout className="w-12 h-12 mb-4 opacity-20" />
                <p>Select a cycle to view details and strategy.</p>
            </div>
        );
    }

    const { currentRsca, projectedRsca, mainDraftStatus, rankedMembers, previewMtaSortedMembers, previewMtaRankMap, previewPromRecMap, distribution, eotRsca, totalReports, effectiveSize, domainContext, isEnlisted } = contextData;

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
                    <div className="px-6 pb-6 pt-6">
                        {/* Row 1: Title & Status Badges */}
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-bold text-slate-900">{activeGroup.name}</h2>
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
                                {/* Submit Control - Only shown when all reports are locked */}
                                {activeGroup.reports.every(r => r.isLocked) && (
                                    <button
                                        onClick={() => setIsSubmitModalOpen(true)}
                                        disabled={
                                            !latestResult[activeGroup.id] ||
                                            activeGroup.status === 'Submitted'
                                        }
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
                                )}
                            </div>
                        </div>

                        {/* Row 2: RSCA Scoreboard Container - Full Width Equal Distribution */}
                        <div className="flex justify-between items-stretch gap-4 w-full h-32">
                            {/* 2A. RSCA Heads Up Display (Left) */}
                            <div className="flex-1 min-w-0 rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white/50">
                                <RscaHeadsUpDisplay
                                    currentRsca={currentRsca}
                                    projectedRsca={projectedRsca}
                                    eotRsca={eotRsca}
                                    showSuffix={false}
                                />
                            </div>

                            {/* 2B. Scattergram (Middle) */}
                            <div className="flex-1 min-w-0 rounded-xl border border-slate-200 shadow-sm overflow-visible bg-white relative z-30">
                                <RscaScattergram
                                    members={rankedMembers}
                                    rsca={projectedRsca}
                                />
                            </div>

                            {/* 2C. Promotion Recommendation Scoreboard (Right) */}
                            <div className="flex-1 min-w-0 rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white/50">
                                <div className="h-full bg-white/95 backdrop-blur-sm transition-all duration-300">
                                    <QuotaHeadsUpDisplay distribution={distribution} totalReports={effectiveSize} context={domainContext} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Member List (Scrollable Main) */}
                <div className={`flex-1 flex flex-col overflow-hidden relative ${proposedReports ? 'ring-4 ring-emerald-500/20' : ''}`}>
                    {/* Blocking Overlay during Review - intercepts all clicks */}
                    {proposedReports && (
                        <div className="absolute inset-0 z-50 bg-emerald-50/20 cursor-not-allowed" aria-hidden="true" />
                    )}

                    <CycleMemberList
                        isEnlisted={isEnlisted}
                        rankedMembers={rankedMembers as RankedMember[]}
                        previewMtaRankMap={previewMtaRankMap}
                        previewPromRecMap={previewPromRecMap}
                        activeGroupId={activeGroup.id}
                        selectedMemberId={selectedMemberId}
                        onSelectMember={(id) => {
                            if (!proposedReports) selectMember(id);
                        }}
                        onReorderMembers={(g, d, t) => {
                            if (!proposedReports) handleReorderMembers(g, d, t);
                        }}
                        onOptimize={handleOptimize}
                        onAcceptOptimization={handleAcceptOptimization}
                        onCancelOptimization={handleCancelOptimization}
                        isOptimizing={isOptimizing}
                        hasProposedReports={!!proposedReports}
                    />
                </div>
            </div>

            {/* Sidebar: Hidden during optimization review to prevent any edits */}
            {
                selectedMemberId && !proposedReports && (
                    <MemberDetailSidebar
                        memberId={selectedMemberId}
                        rosterMember={(() => {
                            const m = roster.find(memb => memb.id === selectedMemberId);
                            if (m) return m;

                            return {
                                id: selectedMemberId,
                                firstName: 'Unknown',
                                lastName: 'Member',
                                rank: 'UNK',
                                payGrade: 'O-1',
                                designator: '0000',
                                dateReported: new Date().toISOString().split('T')[0],
                                prd: new Date().toISOString().split('T')[0],
                                history: [],
                                status: 'Onboard'
                            } as RosterMember;
                        })()}
                        currentReport={activeGroup.reports.find(r => r.memberId === selectedMemberId)}

                        quotaContext={{
                            distribution,
                            totalReports
                        }}
                        groupContext={domainContext}
                        groupId={activeGroup.id}
                        onPreviewMTA={handlePreviewMTA}

                        // Pass Rank Context - use MTA-sorted order for accurate slider markers
                        rankContext={(() => {
                            // Use MTA-sorted order to show actual rank positions based on current MTA values
                            const index = previewMtaSortedMembers.findIndex(m => m.id === selectedMemberId);
                            if (index === -1) return undefined;

                            // "Next Rank" (Ahead/Better) - Lower indices (higher MTA)
                            // Get up to 5 members before current index (reversed to be closest first)
                            const nextStart = Math.max(0, index - 5);
                            const nextRanks = previewMtaSortedMembers.slice(nextStart, index).reverse().map((m, i) => ({
                                mta: m.mta,
                                rank: index - i // index is current rank-1. So neighbor is rank (index-i)
                            }));

                            // "Prev Rank" (Behind/Worse) - Higher indices (lower MTA)
                            // Get up to 5 members after current index
                            const prevEnd = Math.min(previewMtaSortedMembers.length, index + 6);
                            const prevRanks = previewMtaSortedMembers.slice(index + 1, prevEnd).map((m, i) => ({
                                mta: m.mta,
                                rank: index + 2 + i // index+1 is next rank (#index+2)
                            }));

                            return {
                                currentRank: index + 1,
                                nextRanks,
                                prevRanks
                            };
                        })()}

                        onClose={() => handleMemberSelect(null)}
                        onUpdateMTA={(id, val) => {
                            const report = activeGroup.reports.find(r => r.memberId === id);
                            if (report) {
                                updateProjection(activeGroup.id, report.id, val);
                            }
                        }}
                        onUpdatePromRec={(id, rec) => {
                            const report = activeGroup.reports.find(r => r.memberId === id);
                            if (report) {
                                // Manual Update: Call updateReport (Method 2)
                                // This action includes quota validation but does not FORCE auto-assignment of others
                                // preserving the "Manual" nature of this specific interaction.
                                updateReport(activeGroup.id, report.id, { promotionRecommendation: rec });
                            }
                        }}
                        currentRsca={activeGroup.rsca}
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
