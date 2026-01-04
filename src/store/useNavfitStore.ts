import { create } from 'zustand';
import type { Tab } from '../components/layout/Sidebar';
import type { RosterMember, ReportingSeniorConfig, PayGrade } from '@/types/roster';
import { INITIAL_RS_CONFIG } from '../domain/rsca/constants';

// import { type Member } from '@/features/strategy/logic/autoPlan';
import { useRedistributionStore } from './useRedistributionStore';
import { useAuditStore } from './useAuditStore';
import { DEFAULT_CONSTRAINTS } from '@/domain/rsca/constants';
import { defaultAnchorIndices } from '@/domain/rsca/redistribution';
import type { Member as DomainMember } from '@/domain/rsca/types';
import { validateReportState, checkQuota, createSummaryGroupContext } from '@/features/strategy/logic/validation';

import type { SummaryGroup, Report } from '@/types';
import { assignRecommendationsByRank } from '@/features/strategy/logic/recommendation';

interface NavfitStore {
    // Navigation State
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;

    // View State
    viewMode: 'timeline' | 'list';
    setViewMode: (mode: 'timeline' | 'list') => void;

    // Layout State
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (collapsed: boolean) => void;
    toggleSidebar: () => void;



    // Data State
    roster: RosterMember[];
    setRoster: (roster: RosterMember[]) => void;
    initializeRoster: () => Promise<void>;
    reorderMember: (memberId: string, newIndex: number) => void; // Legacy roster reorder? Or keep for completeness

    // Summary Group / Ranking Mode Actions
    reorderMembers: (groupId: string, draggedId: string, targetIdOrOrder: string | string[]) => void;
    applyDefaultAnchors: (groupId: string) => void;

    summaryGroups: SummaryGroup[];
    setSummaryGroups: (groups: SummaryGroup[]) => void;
    addSummaryGroup: (group: SummaryGroup) => void;
    updateGroupStatus: (groupId: string, status: 'Draft' | 'Review' | 'Submitted' | 'Final' | 'Projected') => void;

    // State for persistence (Deletions)
    deletedGroupIds: string[];
    deletedReportIds: string[];

    deleteSummaryGroup: (groupId: string) => void;
    deleteReport: (groupId: string, reportId: string) => void;
    toggleReportLock: (groupId: string, reportId: string) => void;

    rsConfig: ReportingSeniorConfig;
    setRsConfig: (config: ReportingSeniorConfig) => void;

    // Feature State
    projections: Record<string, number>;
    updateProjection: (groupId: string, reportId: string, value: number) => void;
    updateReport: (groupId: string, reportId: string, updates: Partial<Report>) => void;


    // Cross-Component Requests
    pendingReportRequest: {
        memberId: string;
        name: string;
        rank?: string;
        reportId?: string;
    } | null;
    setPendingReportRequest: (request: NavfitStore['pendingReportRequest']) => void;
    clearPendingReportRequest: () => void;

    // Context Rail State (Selection)
    selectedReportId: string | null;
    selectReport: (id: string | null) => void;

    selectedMemberId: string | null;
    selectMember: (id: string | null) => void;

    // Feature Context
    selectedCompetitiveGroupKey: string | null;
    setSelectedCompetitiveGroupKey: (key: string | null) => void;

    // Modal State
    isEditingReport: boolean;
    setEditingReport: (isEditing: boolean) => void;

    // Context-Driven List State
    selectedCycleId: string | null; // Used to highlight the active card in the left column
    activeCompetitiveGroup: string | null; // e.g., "O-3 1110"
    isContextPanelOpen: boolean;
    cycleFilter: 'All' | 'Officer' | 'Enlisted';
    cycleSort: 'DueDate' | 'Status';

    selectCycle: (cycleId: string, competitiveGroupKey: string) => void;
    clearSelection: () => void;
    setCycleFilter: (filter: 'All' | 'Officer' | 'Enlisted') => void;
    setCycleSort: (sort: 'DueDate' | 'Status') => void;

    // Drill-Down Navigation State
    strategyViewMode: 'landing' | 'workspace';
    setStrategyViewMode: (mode: 'landing' | 'workspace') => void;

    // History View State
    cycleListPhase: 'Active' | 'Archive' | 'Projected';
    setCycleListPhase: (phase: 'Active' | 'Archive' | 'Projected') => void;
    // Drag State
    draggingItemType: string | null;
    setDraggingItemType: (type: string | null) => void;

    // UI Mode State
    isRankMode: boolean;
    setRankMode: (isRankMode: boolean) => void;

    // Data Management
    loadState: (state: { roster: RosterMember[]; summaryGroups: SummaryGroup[]; rsConfig: ReportingSeniorConfig }) => void;
}

export const useNavfitStore = create<NavfitStore>((set) => ({
    // Navigation
    activeTab: 'strategy',
    setActiveTab: (tab) => set({ activeTab: tab }),

    // View State
    viewMode: 'timeline',
    setViewMode: (mode) => set({ viewMode: mode }),

    // Layout
    sidebarCollapsed: true,
    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

    // History View State
    cycleListPhase: 'Active',


    // Data
    roster: [], // Initialized empty
    setRoster: (roster) => set({ roster }),
    initializeRoster: async () => {
        try {
            const response = await fetch('/member_details.json');
            const data = await response.json();

            const ratings = ["ET", "BM", "OS", "YN", "PS", "CS", "MA", "IT"];

            const roster: RosterMember[] = Object.values(data).map((m: any) => {
                let designator = m.designator;

                if (m.payGrade && m.payGrade.startsWith('E')) {
                    const rating = ratings[Math.floor(Math.random() * ratings.length)];
                    const grade = m.payGrade; // e.g. E-6
                    let rateRank = "";

                    if (grade === 'E-9') rateRank = `${rating}CM`; // ETCM
                    else if (grade === 'E-8') rateRank = `${rating}CS`; // ETCS
                    else if (grade === 'E-7') rateRank = `${rating}C`;  // ETC
                    else if (grade === 'E-6') rateRank = `${rating}1`;  // ET1
                    else if (grade === 'E-5') rateRank = `${rating}2`;  // ET2
                    else if (grade === 'E-4') rateRank = `${rating}3`;  // ET3
                    else if (grade === 'E-3') rateRank = `${rating}SN`; // ETSN (Simplified)
                    else if (grade === 'E-2') rateRank = `${rating}SA`; // ETSA
                    else if (grade === 'E-1') rateRank = `${rating}SR`; // ETSR
                    else rateRank = `${rating}${grade.split('-')[1] || ''}`; // Fallback

                    designator = rateRank;
                }

                // Random last trait between 3.50 and 4.80
                const lastTrait = parseFloat((Math.random() * (4.80 - 3.50) + 3.50).toFixed(2));

                return {
                    id: m.id,
                    firstName: m.firstName,
                    lastName: m.lastName,
                    rank: m.rank,
                    payGrade: m.payGrade as PayGrade,
                    designator: designator, // Contains Rate for Enlisted
                    dateReported: m.dateReported || new Date().toISOString().split('T')[0],
                    prd: m.prd || new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0],
                    lastTrait, // Added for UI completeness
                    status: 'Onboard'
                };
            });

            set({ roster });
        } catch (error) {
            console.error("Failed to load roster data:", error);
        }
    },

    summaryGroups: [],
    setSummaryGroups: (groups) => set({ summaryGroups: groups }),
    addSummaryGroup: (group) => {
        set((state) => ({
            summaryGroups: [...state.summaryGroups, group]
        }));
        // Apply default anchors immediately for new group
        useNavfitStore.getState().applyDefaultAnchors(group.id);
    },
    updateGroupStatus: (groupId, status) => set((state) => ({
        summaryGroups: state.summaryGroups.map((group) => {
            if (group.id !== groupId) return group;

            // Also update status on all reports
            const updatedReports = group.reports.map(r => ({
                ...r,
                draftStatus: status
            }));

            return {
                ...group,
                status,
                reports: updatedReports
            };
        })
    })),
    // Deletion Persistence
    deletedGroupIds: [],
    deletedReportIds: [],

    deleteSummaryGroup: (groupId) => set((state) => ({
        deletedGroupIds: [...state.deletedGroupIds, groupId],
        summaryGroups: state.summaryGroups.filter((g) => g.id !== groupId)
    })),
    deleteReport: (groupId, reportId) => set((state) => ({
        deletedReportIds: [...state.deletedReportIds, reportId],
        summaryGroups: state.summaryGroups.map((group) => {
            if (group.id !== groupId) return group;
            return {
                ...group,
                reports: group.reports.filter((r) => r.id !== reportId)
            };
        })
    })),
    toggleReportLock: (groupId, reportId) => {
        set((state) => ({
            summaryGroups: state.summaryGroups.map((group) => {
                if (group.id !== groupId) return group;
                return {
                    ...group,
                    reports: group.reports.map((report) => {
                        if (report.id !== reportId) return report;
                        return {
                            ...report,
                            isLocked: !report.isLocked
                        };
                    })
                };
            })
        }));

        // Trigger Redistribution for Anchor Update
        const state = useNavfitStore.getState(); // Get fresh state
        const group = state.summaryGroups.find(g => g.id === groupId);
        if (group) {
            const report = group.reports.find(r => r.id === reportId);
            // Log the NEW state (which is in `report` because we got fresh state)
            useAuditStore.getState().addLog('ANCHOR_SELECTION_CHANGE', {
                groupId,
                memberId: reportId,
                isLocked: report?.isLocked
            });

            const anchors: Record<string, number> = {};
            group.reports.forEach(r => {
                if (r.isLocked) anchors[r.id] = r.traitAverage;
            });
            useRedistributionStore.getState().setAnchors(groupId, anchors);
        }
    },
    reorderMember: (memberId, newIndex) => set((state) => {
        // Legacy Roster Reorder (Keep for Member Detail View if needed, but primary is now Group-based)
        const currentRoster = [...state.roster];
        const oldIndex = currentRoster.findIndex(m => m.id === memberId);
        if (oldIndex === -1) return {};
        const [movedMember] = currentRoster.splice(oldIndex, 1);
        currentRoster.splice(newIndex, 0, movedMember);
        return { roster: currentRoster };
    }),

    applyDefaultAnchors: (groupId) => {
        set((state) => {
            const groupIndex = state.summaryGroups.findIndex(g => g.id === groupId);
            if (groupIndex === -1) return {};

            const group = state.summaryGroups[groupIndex];
            const N = group.reports.length;
            if (N === 0) return {};

            const { top, bottom } = defaultAnchorIndices(N);
            const anchorIndices = new Set([...top, ...bottom]);

            const newReports = group.reports.map((r, i) => {
                if (anchorIndices.has(i)) {
                    return { ...r, isLocked: true };
                }
                return r; // Don't unlock if already locked? Or strictly reset?
                // Requirement says "provide default anchor selection".
                // Usually implies resetting to this default state.
                // If I'm calling this explicitly (or on creation), I should probably set them.
                // However, if I call this during reorder (which I am not currently planning to enforce every time),
                // it might be disruptive.
                // Since this function is `applyDefaultAnchors`, it implies "Applying" them.
                // I will strictly Apply them (meaning, these become anchors, others might not be).
                // But let's look at `isLocked`.
                // If I strictly set isLocked based on indices, I might unlock someone the user manually locked?
                // For "Default", yes. It's a reset.
                // return { ...r, isLocked: anchorIndices.has(i) };
            });

            // Note: Currently, map above doesn't clear others.
            // If we want strict "Default", we should clear others.
            // But if we use it as "Ensure Default Anchors exist", we might keep others.
            // Prompt says: "The system shall provide default anchor selection...".
            // I will implement it as "Set these as anchors". I will not strictly unlock others unless intended as a full reset.
            // But for a clean "Start", usually you want exactly these.

            const updatedReports = group.reports.map((r, i) => ({
                ...r,
                isLocked: anchorIndices.has(i)
            }));

            const newSummaryGroups = [...state.summaryGroups];
            newSummaryGroups[groupIndex] = { ...group, reports: updatedReports };

            // Trigger Engine
            // We need to convert to domain members and call requestRedistribution
            // We can do this outside the set in a useEffect, but here we can just do it after state update or immediately.
            // But `set` callback returns partial state. We need to trigger side effect.
            // Side effect:
            setTimeout(() => {
                const updatedGroup = useNavfitStore.getState().summaryGroups[groupIndex];
                if (!updatedGroup) return;

                 const domainMembers: DomainMember[] = updatedGroup.reports.map((r, i) => ({
                    id: r.id,
                    rank: i + 1,
                    mta: r.traitAverage,
                    isAnchor: !!r.isLocked,
                    anchorValue: r.traitAverage,
                    name: `${r.firstName} ${r.lastName}`
                }));

                useAuditStore.getState().addLog('ANCHOR_SELECTION_CHANGE', {
                    groupId,
                    message: "Applied Default Anchors (Top/Bottom 10%)"
                });

                useRedistributionStore.getState().requestRedistribution(
                    groupId,
                    domainMembers,
                    DEFAULT_CONSTRAINTS,
                    state.rsConfig.targetRsca
                );
            }, 0);

            return { summaryGroups: newSummaryGroups };
        });
    },

    reorderMembers: (groupId, draggedId, targetIdOrOrder) => set((state) => {
        const groupIndex = state.summaryGroups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return {};

        const group = state.summaryGroups[groupIndex];
        const currentReports = [...group.reports];

        let updatedReportList: typeof currentReports = [];

        if (Array.isArray(targetIdOrOrder)) {
            // Bulk Reorder based on ID list
            const newOrderIds = targetIdOrOrder;
            // Map current reports to the new order
            updatedReportList = newOrderIds
                .map(id => currentReports.find(r => r.id === id))
                .filter((r): r is typeof currentReports[0] => !!r);

            // Append any missing reports (robustness)
            const missingReports = currentReports.filter(r => !newOrderIds.includes(r.id));
            updatedReportList = [...updatedReportList, ...missingReports];

        } else {
            // Legacy Single-Item Move
            const targetId = targetIdOrOrder;

            // 1. Identification
            const draggedIndex = currentReports.findIndex(r => r.id === draggedId);
            const targetIndex = currentReports.findIndex(r => r.id === targetId);

            if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
                return {};
            }

            // 2. Atomic Move (Remove and Insert)
            const [draggedItem] = currentReports.splice(draggedIndex, 1);
            currentReports.splice(targetIndex, 0, draggedItem);
            updatedReportList = currentReports;

            // 2b. Auto-Calculate MTA for the moved item (Interpolation)
            // Note: We use targetIndex because draggedItem is now at targetIndex
            const prevReport = updatedReportList[targetIndex - 1];
            const nextReport = updatedReportList[targetIndex + 1];

            let newMta = draggedItem.traitAverage;

            if (prevReport && nextReport) {
                newMta = (prevReport.traitAverage + nextReport.traitAverage) / 2;
            } else if (prevReport) {
                // Moved to bottom (or end)
                newMta = Math.max(2.0, prevReport.traitAverage - 0.1);
            } else if (nextReport) {
                // Moved to top
                newMta = Math.min(5.0, nextReport.traitAverage + 0.1);
            }

            // Simple Collision Avoidance (Nudge if identical)
            if (prevReport && newMta >= prevReport.traitAverage) {
                newMta = prevReport.traitAverage - 0.01;
            }
            if (nextReport && newMta <= nextReport.traitAverage) {
                newMta = nextReport.traitAverage + 0.01;
            }

            updatedReportList[targetIndex] = {
                ...draggedItem,
                traitAverage: parseFloat(newMta.toFixed(2))
            };
        }

        // 3. Auto-Assign Recommendations based on Rank and Policy
        const finalReports = assignRecommendationsByRank(updatedReportList, group);

        // 4. Update State
        const newSummaryGroups = [...state.summaryGroups];
        newSummaryGroups[groupIndex] = {
            ...group,
            reports: finalReports
        };

        // 5. Trigger Redistribution Engine
        // Convert to Domain Members
        const domainMembers: DomainMember[] = finalReports.map((r, i) => ({
            id: r.id,
            rank: i + 1,
            mta: r.traitAverage, // Send current MTA as baseline
            isAnchor: !!r.isLocked,
            anchorValue: r.traitAverage,
            name: `${r.firstName} ${r.lastName}`
        }));

        useAuditStore.getState().addLog('RANK_ORDER_CHANGE', {
            groupId,
            draggedId,
            targetIdOrOrder
        });

        // Do NOT call setRankOrder to avoid cycle (setRankOrder calls reorderMembers)
        // Call requestRedistribution directly
        useRedistributionStore.getState().requestRedistribution(groupId, domainMembers, DEFAULT_CONSTRAINTS, state.rsConfig.targetRsca);

        return {
            summaryGroups: newSummaryGroups,
            // Projections will be updated by the store subscription/callback
        };
    }),

    rsConfig: INITIAL_RS_CONFIG,
    setRsConfig: (config) => set({ rsConfig: config }),

    // Feature
    projections: {},
    updateProjection: (groupId, reportId, value) => {
        // Optimistic Update with Locking and Strict Sorting
        set((state) => {
            const groupIndex = state.summaryGroups.findIndex(g => g.id === groupId);
            if (groupIndex === -1) return {};

            const group = state.summaryGroups[groupIndex];

            // 1. Update the value
            const updatedReports = group.reports.map(r => r.id === reportId ? { ...r, traitAverage: value, isLocked: true } : r);

            // 2. Strict Sort by MTA (Descending)
            updatedReports.sort((a, b) => b.traitAverage - a.traitAverage);

            const newSummaryGroups = [...state.summaryGroups];
            newSummaryGroups[groupIndex] = { ...group, reports: updatedReports };

            return {
                projections: {
                    ...state.projections,
                    [reportId]: value
                },
                summaryGroups: newSummaryGroups
            };
        });

        // Trigger Engine
        const state = useNavfitStore.getState();
        const group = state.summaryGroups.find(g => g.id === groupId);
        if (group) {
            useAuditStore.getState().addLog('ANCHOR_MTA_EDIT', {
                groupId,
                memberId: reportId,
                value
            });

            const domainMembers: DomainMember[] = group.reports.map((r, i) => ({
                id: r.id,
                rank: i + 1,
                mta: r.traitAverage,
                isAnchor: !!r.isLocked,
                anchorValue: r.traitAverage,
                name: `${r.firstName} ${r.lastName}`
            }));
            useRedistributionStore.getState().requestRedistribution(groupId, domainMembers, DEFAULT_CONSTRAINTS, state.rsConfig.targetRsca);
        }
    },

    updateReport: (groupId, reportId, updates) => set((state) => {
        const groupIndex = state.summaryGroups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return {};

        const group = state.summaryGroups[groupIndex];
        const reports = [...group.reports];
        const reportIndex = reports.findIndex(r => r.id === reportId);
        if (reportIndex === -1) return {};

        // 1. Apply Updates
        const originalReport = reports[reportIndex];
        const updatedReport: Report = {
            ...originalReport,
            ...updates
        };

        // 2. Validate Domain Policy (Traits, NOB, SP, O1/O2)
        // Find previous report for SP logic (simplified: looking in roster or ignoring for now if complexity too high)
        // Ideally we check history in roster.
        const rosterMember = state.roster.find(m => m.id === updatedReport.memberId);
        // Sort history by date desc, find one before this report's period
        // For now, passing undefined to validateReportState unless we strictly need SP withdrawal check to work.
        // Prompt requires it.
        let previousReport: Report | undefined;
        if (rosterMember && rosterMember.history) {
            // Basic sort
            const sorted = [...rosterMember.history].sort((a, b) => new Date(b.periodEndDate).getTime() - new Date(a.periodEndDate).getTime());
            // The report being edited might be in history or not? If it's a draft, maybe not fully in history array or is the latest.
            // We look for the first one strictly before this report's end date.
            const currentEndDate = new Date(updatedReport.periodEndDate);
            previousReport = sorted.find(r => new Date(r.periodEndDate) < currentEndDate);
        }

        const violations = validateReportState(updatedReport, group, previousReport);

        // 3. Validate Quotas (Group Level)
        // If recommendation changed to EP or MP, we need to check limits.
        if (updates.promotionRecommendation) {
            const tempReports = [...reports];
            tempReports[reportIndex] = updatedReport;

            const epCount = tempReports.filter(r => r.promotionRecommendation === 'EP').length;
            const mpCount = tempReports.filter(r => r.promotionRecommendation === 'MP').length;

            // Generate Context for Validation
            const context = createSummaryGroupContext(group, updatedReport);

            // Ensure size matches report array
            // Note: If we just added a report, group.reports might be outdated if we don't use tempReports,
            // but updateReport assumes report exists.
            const quotaResult = checkQuota(context, epCount, mpCount);

            if (!quotaResult.isValid && quotaResult.message) {
                violations.push({
                    code: 'QUOTA_EXCEEDED',
                    message: quotaResult.message,
                    severity: 'ERROR',
                    affectedFields: ['promotionRecommendation']
                });
            }
        }

        updatedReport.violations = violations;
        reports[reportIndex] = updatedReport;

        const newSummaryGroups = [...state.summaryGroups];
        newSummaryGroups[groupIndex] = {
            ...group,
            reports
        };

        return { summaryGroups: newSummaryGroups };
    }),

    // Requests
    pendingReportRequest: null,
    setPendingReportRequest: (request) => set({ pendingReportRequest: request }),
    clearPendingReportRequest: () => set({ pendingReportRequest: null }),

    // Context Rail State (Selection)
    selectedReportId: null,
    selectReport: (id) => set(() => {
        // If selecting a report (id is not null), clear member selection and open rail
        if (id) {
            return {
                selectedReportId: id,
                selectedMemberId: null
            };
        }
        // If clearing, just clear it (optionally keep rail open or closed? request just says "selectReport should open context rail")
        return { selectedReportId: null };
    }),

    selectedMemberId: null,
    selectMember: (id) => set(() => {
        // If selecting a member, clear report selection and open rail
        if (id) {
            return {
                selectedMemberId: id,
                selectedReportId: null
            };
        }
        return { selectedMemberId: null };
    }),

    selectedCompetitiveGroupKey: null,
    setSelectedCompetitiveGroupKey: (key) => set({ selectedCompetitiveGroupKey: key }),


    // Modal State
    isEditingReport: false,
    setEditingReport: (isEditing) => set({ isEditingReport: isEditing }),

    // Context-Driven List State
    selectedCycleId: null,
    activeCompetitiveGroup: null,
    isContextPanelOpen: false,
    cycleFilter: 'All',
    cycleSort: 'DueDate',
    strategyViewMode: 'landing', // Default to landing

    selectCycle: (cycleId, competitiveGroupKey) => set({
        selectedCycleId: cycleId,
        activeCompetitiveGroup: competitiveGroupKey,
        isContextPanelOpen: true,
        // Also sync legacy selection if needed, or keep distinct?
        // User request didn't specify syncing with selectedCompetitiveGroupKey, but activeCompetitiveGroup seems to serve that purpose.
    }),
    clearSelection: () => set({
        selectedCycleId: null,
        activeCompetitiveGroup: null,
        isContextPanelOpen: false
    }),
    setCycleFilter: (filter) => set({ cycleFilter: filter }),
    setCycleSort: (sort) => set({ cycleSort: sort }),
    setStrategyViewMode: (mode) => set({ strategyViewMode: mode }),
    setCycleListPhase: (phase) => set({ cycleListPhase: phase }),

    // Drag State
    draggingItemType: null,
    setDraggingItemType: (type) => set({ draggingItemType: type }),

    // UI Mode State
    isRankMode: false,
    setRankMode: (isRankMode) => set({ isRankMode }),

    // Data Management
    loadState: (loadedState) => set({
        roster: loadedState.roster,
        summaryGroups: loadedState.summaryGroups,
        rsConfig: loadedState.rsConfig,
        // Reset selections and temporary state
        selectedCycleId: null,
        activeCompetitiveGroup: null,
        selectedReportId: null,
        selectedMemberId: null,
        isContextPanelOpen: false,
        projections: {},
    }),
}));

export const selectActiveCycle = (state: NavfitStore): SummaryGroup | null => {
    if (!state.selectedCycleId) return null;
    return state.summaryGroups.find(g => g.id === state.selectedCycleId) || null;
};
