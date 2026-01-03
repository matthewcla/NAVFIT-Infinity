import { create } from 'zustand';
import type { Tab } from '../components/layout/Sidebar';
import type { RosterMember, ReportingSeniorConfig } from '@/types/roster';
import { INITIAL_ROSTER, INITIAL_RS_CONFIG } from '../data/initialRoster';

// import { type Member } from '@/features/strategy/logic/autoPlan';
import { useRedistributionStore } from './useRedistributionStore';
import { useAuditStore } from './useAuditStore';
import { DEFAULT_CONSTRAINTS } from '@/domain/rsca/constants';
import type { Member as DomainMember } from '@/domain/rsca/types';
import { validateReportState, checkQuota } from '@/features/strategy/logic/validation';

import type { SummaryGroup, Report } from '@/types';

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
    reorderMember: (memberId: string, newIndex: number) => void; // Legacy roster reorder? Or keep for completeness

    // Summary Group / Ranking Mode Actions
    reorderMembers: (groupId: string, draggedId: string, targetIdOrOrder: string | string[]) => void;

    summaryGroups: SummaryGroup[];
    setSummaryGroups: (groups: SummaryGroup[]) => void;
    addSummaryGroup: (group: SummaryGroup) => void;
    updateGroupStatus: (groupId: string, status: string) => void;

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
    setCycleListPhase: (phase) => set({ cycleListPhase: phase }),


    // Data
    roster: INITIAL_ROSTER,
    setRoster: (roster) => set({ roster }),

    summaryGroups: [],
    setSummaryGroups: (groups) => set({ summaryGroups: groups }),
    addSummaryGroup: (group) => set((state) => ({
        summaryGroups: [...state.summaryGroups, group]
    })),
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
        }

        // 3. Update Order Optimistically (Keep old MTA values for now)
        const finalReports = updatedReportList.map((report, index) => {
            // EP Logic: Rank #1 is EP, others MP (User specified heuristic)
            // We keep this simple logic here for immediate feedback, but MTA is handled by engine.
            let newPromo: 'EP' | 'MP' | 'P' | 'Prog' | 'SP' | 'NOB' = index === 0 ? 'EP' : 'MP';
            if (report.isAdverse) newPromo = 'SP';

            return {
                ...report,
                promotionRecommendation: newPromo,
            };
        });

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
        // Optimistic Update with Locking
        set((state) => ({
            projections: {
                ...state.projections,
                [reportId]: value
            },
            summaryGroups: state.summaryGroups.map(g => {
                if (g.id !== groupId) return g;
                return {
                    ...g,
                    reports: g.reports.map(r => r.id === reportId ? { ...r, traitAverage: value, isLocked: true } : r)
                };
            })
        }));

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
             const groupSize = group.reports.length;

             const quotaResult = checkQuota(groupSize, epCount, mpCount);
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

    // Drag State
    draggingItemType: null,
    setDraggingItemType: (type) => set({ draggingItemType: type }),

    // UI Mode State
    isRankMode: false,
    setRankMode: (isRankMode) => set({ isRankMode }),
}));

export const selectActiveCycle = (state: NavfitStore): SummaryGroup | null => {
    if (!state.selectedCycleId) return null;
    return state.summaryGroups.find(g => g.id === state.selectedCycleId) || null;
};
