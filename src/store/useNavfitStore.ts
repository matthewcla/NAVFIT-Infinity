import { create } from 'zustand';
import type { Tab } from '../components/layout/Sidebar';
import type { RosterMember, ReportingSeniorConfig } from '@/types/roster';
import { INITIAL_ROSTER, INITIAL_RS_CONFIG } from '../data/initialRoster';

import { calculateOutcomeBasedGrades, type Member } from '@/features/strategy/logic/autoPlan';

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

    isContextRailOpen: boolean;
    toggleContextRail: () => void; // Toggles open/closed state

    // Data State
    roster: RosterMember[];
    setRoster: (roster: RosterMember[]) => void;
    reorderMember: (memberId: string, newIndex: number) => void;

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

    // Modal State
    isEditingReport: boolean;
    setEditingReport: (isEditing: boolean) => void;
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

    isContextRailOpen: true, // Default open as requested
    toggleContextRail: () => set((state) => ({ isContextRailOpen: !state.isContextRailOpen })),

    // Data
    roster: INITIAL_ROSTER,
    setRoster: (roster) => set({ roster }),
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
                selectedMemberId: null,
                isContextRailOpen: true
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
                selectedReportId: null,
                isContextRailOpen: true
            };
        }
        return { selectedMemberId: null };
    }),


    // Modal State
    isEditingReport: false,
    setEditingReport: (isEditing) => set({ isEditingReport: isEditing }),
}));
