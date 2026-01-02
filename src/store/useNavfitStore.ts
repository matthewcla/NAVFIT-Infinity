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
    reorderMember: (memberId: string, newIndex: number) => void;

    summaryGroups: SummaryGroup[];
    setSummaryGroups: (groups: SummaryGroup[]) => void;
    addSummaryGroup: (group: SummaryGroup) => void;
    // State for persistence (Deletions)
    deletedGroupIds: string[];
    deletedReportIds: string[];

    deleteSummaryGroup: (groupId: string) => void;
    deleteReport: (groupId: string, reportId: string) => void;

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
    reorderMember: (memberId, newIndex) => set((state) => {
        const currentRoster = [...state.roster];
        const oldIndex = currentRoster.findIndex(m => m.id === memberId);

        if (oldIndex === -1) return {};

        // 1. Move the member
        const [movedMember] = currentRoster.splice(oldIndex, 1);
        currentRoster.splice(newIndex, 0, movedMember);

        // 2. Update rankOrder based on new array position (1-based)
        const updatedRoster = currentRoster.map((member, index) => ({
            ...member,
            rankOrder: index + 1
        }));

        // 3. Prepare Auto-Plan Input
        // Map RosterMember to the Auto-Plan Member interface
        // We ensure we have default values for any missing optional fields
        const autoPlanInput: Member[] = updatedRoster.map(m => ({
            id: m.id,
            rankOrder: m.rankOrder || 99,
            reportsRemaining: m.reportsRemaining || 1,
            status: m.status || 'Promotable',
            proposedTraitAverage: 0 // Reset for calculation
        }));

        // 4. Calculate Grades
        // Use RSCA from config or default to 4.20 if missing
        const rscaTarget = state.rsConfig.targetRsca || 4.20;
        // Note: We might want strategy config from state later

        const calculatedResults = calculateOutcomeBasedGrades(autoPlanInput, rscaTarget);

        // 5. Update Projections
        const newProjections = { ...state.projections };
        calculatedResults.forEach(res => {
            if (res.proposedTraitAverage) {
                // Update projection using memberId as key (supported by reportGenerator now)
                newProjections[res.id] = res.proposedTraitAverage;
            }
        });

        return {
            roster: updatedRoster,
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
