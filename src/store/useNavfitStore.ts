import { create } from 'zustand';
import type { Tab } from '../components/layout/Sidebar';
import type { RosterMember, ReportingSeniorConfig } from '@/types/roster';
import { INITIAL_ROSTER, INITIAL_RS_CONFIG } from '../data/initialRoster';

interface NavfitStore {
    // Navigation State
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;

    // Layout State
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (collapsed: boolean) => void;
    toggleSidebar: () => void;

    // Data State
    roster: RosterMember[];
    setRoster: (roster: RosterMember[]) => void;

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
}

export const useNavfitStore = create<NavfitStore>((set) => ({
    // Navigation
    activeTab: 'dashboard',
    setActiveTab: (tab) => set({ activeTab: tab }),

    // Layout
    sidebarCollapsed: true,
    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

    // Data
    roster: INITIAL_ROSTER,
    setRoster: (roster) => set({ roster }),

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
}));
