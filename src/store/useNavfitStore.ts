import { create } from 'zustand';
import type { Tab } from '../components/layout/Sidebar';
import type { RosterMember, ReportingSeniorConfig } from '@/types/roster';
import { INITIAL_ROSTER, INITIAL_RS_CONFIG } from '../data/initialRoster';

import { calculateOutcomeBasedGrades, type Member } from '@/features/strategy/logic/autoPlan';

import type { SummaryGroup } from '@/types';

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
    reorderMembers: (groupId: string, newOrder: string[]) => void;

    summaryGroups: SummaryGroup[];
    setSummaryGroups: (groups: SummaryGroup[]) => void;
    addSummaryGroup: (group: SummaryGroup) => void;
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
    updateProjection: (reportId: string, value: number) => void;


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
    toggleReportLock: (groupId, reportId) => set((state) => ({
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
    })),
    reorderMember: (memberId, newIndex) => set((state) => {
        // Legacy Roster Reorder (Keep for Member Detail View if needed, but primary is now Group-based)
        const currentRoster = [...state.roster];
        const oldIndex = currentRoster.findIndex(m => m.id === memberId);
        if (oldIndex === -1) return {};
        const [movedMember] = currentRoster.splice(oldIndex, 1);
        currentRoster.splice(newIndex, 0, movedMember);
        return { roster: currentRoster };
    }),

    reorderMembers: (groupId, newOrder) => set((state) => {
        const groupIndex = state.summaryGroups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return {};

        const group = state.summaryGroups[groupIndex];
        const currentReports = [...group.reports];

        // 1. Reorder Reports based on newOrder (array of report IDs)
        // Create a map for O(1) lookup
        const reportMap = new Map(currentReports.map(r => [r.id, r]));

        const reorderedReports = newOrder.map(id => reportMap.get(id)).filter((r): r is import('@/types').Report => !!r);

        // Append any reports not in newOrder (safety fallback)
        currentReports.forEach(r => {
            if (!newOrder.includes(r.id)) {
                reorderedReports.push(r);
            }
        });

        // 2. Prepare Auto-Plan Input
        // Map Reports to Auto-Plan Member interface
        // Note: 'status' needs to come from Member Roster or be inferred. 
        // For now, we'll infer 'Promotable' unless we can look up the Member status, 
        // OR we just use a default since we don't have easy access to the full Roster map here without expensive lookup.
        // Actually, we can just say everyone is 'Promotable' for simple ranking unless we have that data on the Report.
        // The Report has `reportsRemaining`. `status` is not explicitly on Report, but `isAdverse` is?
        // Let's assume 'Promotable' for standard calculations for now.

        const autoPlanInput: Member[] = reorderedReports.map((r, index) => ({
            id: r.id, // Using Report ID as Member ID for the calculator context to map back easily
            rankOrder: index + 1,
            reportsRemaining: r.reportsRemaining || 1, // Default to 1 if missing
            status: r.isAdverse ? 'Adverse' : 'Promotable', // Basic inference
            proposedTraitAverage: r.traitAverage, // Current value
            isLocked: r.isLocked
        }));

        // 3. Calculate Grades
        const rscaTarget = state.rsConfig.targetRsca || 4.20;
        const calculatedResults = calculateOutcomeBasedGrades(autoPlanInput, rscaTarget);

        // 4. Update Reports with Results & Promo Recs
        const updatedReports = reorderedReports.map((report, index) => {
            const result = calculatedResults.find(res => res.id === report.id);

            // EP Logic: Rank #1 is EP, others MP (User specified heuristic)
            // Unless manually locked? The plan said "Rank #1 as 'EP' and all others as 'MP'... You can manually adjust this afterwards."
            // So we overwrite.
            let newPromo: 'EP' | 'MP' | 'P' | 'Prog' | 'SP' | 'NOB' = index === 0 ? 'EP' : 'MP';
            if (report.isAdverse) newPromo = 'SP'; // Preserve adverse flag impact if any

            // Check lock for Promo Rec? Plan didn't explicitly say to lock Rec, only Grade.
            // "Members with isLocked: true will have their traitAverage preserved... they will effectively be skipped by the math engine"
            // Assuming lock applies to Traits mostly. I'll default overwrite Recs for now as requested.

            return {
                ...report,
                traitAverage: result?.proposedTraitAverage ?? report.traitAverage,
                promotionRecommendation: newPromo,
                // Also ensure summaryGroupAvg is updated? We assume the group average changes? 
                // We don't calculate group avg here, usually typically calculated on read.
            };
        });

        // 5. Update State
        const newSummaryGroups = [...state.summaryGroups];
        newSummaryGroups[groupIndex] = {
            ...group,
            reports: updatedReports
        };

        const newProjections = { ...state.projections };
        updatedReports.forEach(r => {
            newProjections[r.id] = r.traitAverage; // Map Report ID to Projection
        });

        return {
            summaryGroups: newSummaryGroups,
            projections: newProjections
        };
    }),

    rsConfig: INITIAL_RS_CONFIG,
    setRsConfig: (config) => set({ rsConfig: config }),

    // Feature
    projections: {},
    updateProjection: (reportId, value) =>
        set((state) => ({
            projections: {
                ...state.projections,
                [reportId]: value
            }
        })),

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
