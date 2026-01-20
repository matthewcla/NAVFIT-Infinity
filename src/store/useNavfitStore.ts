import { create } from 'zustand';
import type { Tab } from '../components/layout/Sidebar';
import type { RosterMember, ReportingSeniorConfig, PayGrade } from '@/types/roster';
import { INITIAL_RS_CONFIG } from '../domain/rsca/constants';

import { useRedistributionStore } from './useRedistributionStore';
import { useAuditStore } from './useAuditStore';
import { defaultAnchorIndices } from '@/domain/rsca/redistribution';
import { validateReportState, checkQuota, createSummaryGroupContext } from '@/features/strategy/logic/validation';

import type { SummaryGroup, Report } from '@/types';
import { assignRecommendationsByRank } from '@/features/strategy/logic/recommendation';
import { fetchInitialData } from '@/services/dataLoader';
import { planAllSummaryGroups } from '@/features/strategy/logic/planSummaryGroups';
import type { User } from '@/domain/auth/types';
import { MOCK_USERS } from '@/domain/auth/mockUsers';
import type { TrajectoryPoint } from '@/features/strategy/logic/optimizer';

interface NavfitStore {
    // Auth State
    currentUser: User | null;
    isAuthenticated: boolean;
    availableUsers: User[];
    login: (userId: string) => void;
    logout: () => void;

    // Loading State
    isLoading: boolean;
    error: string | null;
    loadData: (userId?: string) => Promise<void>;

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

    // Summary Group / Ranking Mode Actions
    reorderMembers: (groupId: string, draggedId: string, targetIdOrOrder: string | string[]) => void;
    applyDefaultAnchors: (groupId: string) => void;

    summaryGroups: SummaryGroup[];
    setSummaryGroups: (groups: SummaryGroup[]) => void;
    addSummaryGroup: (group: SummaryGroup) => void;
    updateSummaryGroup: (groupId: string, updates: Partial<SummaryGroup>) => void;
    updateGroupStatus: (groupId: string, status: 'Draft' | 'Review' | 'Submitted' | 'Final' | 'Planned') => void;

    // State for persistence (Deletions)
    deletedGroupIds: string[];
    deletedReportIds: string[];

    deleteSummaryGroup: (groupId: string) => void;
    deleteReport: (groupId: string, reportId: string) => void;
    toggleReportLock: (groupId: string, reportId: string, targetValue?: number) => void;
    setGroupLockState: (groupId: string, isLocked: boolean, valueMap?: Record<string, number>) => void;

    rsConfig: ReportingSeniorConfig;
    setRsConfig: (config: ReportingSeniorConfig) => void;

    // Feature State
    projections: Record<string, number>;
    updateProjection: (groupId: string, reportId: string, value: number) => void;
    updateReport: (groupId: string, reportId: string, updates: Partial<Report>) => void;
    commitOptimization: (groupId: string, reports: Report[]) => void;

    // Strategy Results Cache (From Worker)
    trajectoryCache: TrajectoryPoint[];
    updateStrategyResults: (groups: SummaryGroup[], trajectory: TrajectoryPoint[]) => void;

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
    cycleSort: 'DueDate' | 'Status' | 'CompGroup';

    selectCycle: (cycleId: string, competitiveGroupKey: string) => void;
    clearSelection: () => void;
    setCycleFilter: (filter: 'All' | 'Officer' | 'Enlisted') => void;
    setCycleSort: (sort: 'DueDate' | 'Status' | 'CompGroup') => void;

    // Drill-Down Navigation State
    strategyViewMode: 'landing' | 'workspace';
    setStrategyViewMode: (mode: 'landing' | 'workspace') => void;

    // History View State
    cycleListPhase: 'Active' | 'Archive' | 'Planned';
    setCycleListPhase: (phase: 'Active' | 'Archive' | 'Planned') => void;
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
    // Auth State
    currentUser: MOCK_USERS[0], // Default to first user (M. Clark)
    isAuthenticated: true,
    availableUsers: MOCK_USERS,
    login: (userId: string) => {
        const user = MOCK_USERS.find(u => u.id === userId);
        if (user) {
            set({ currentUser: user, isAuthenticated: true });
            useNavfitStore.getState().loadData(userId);
        }
    },
    logout: () => {
        console.log("Logging out...");
        set({ currentUser: null, isAuthenticated: false });
    },

    // Loading State
    isLoading: false,
    error: null,
    loadData: async (userId) => {
        set({ isLoading: true, error: null });
        try {
            const effectiveUserId = userId || useNavfitStore.getState().currentUser?.id;
            const { members, summaryGroups } = await fetchInitialData(effectiveUserId);

            const roster: RosterMember[] = members.map(m => {
                const parts = m.name.split(', ');
                const lastName = m.lastName || parts[0] || '';
                const firstName = m.firstName || parts[1] || '';
                return {
                    id: m.id,
                    firstName,
                    lastName,
                    rank: m.rank,
                    payGrade: m.payGrade as PayGrade,
                    designator: m.designator || '',
                    dateReported: (m as any).dateReported || new Date().toISOString().split('T')[0],
                    prd: m.prd || '',
                    eda: (m as any).eda,
                    edd: (m as any).edd,
                    milestoneTour: (m as any).milestoneTour,
                    lastTrait: m.lastTrait || 0,
                    status: m.status as any,
                    history: m.history || [],
                    timeInGrade: m.timeInGrade
                };
            });

            const rsConfig = useNavfitStore.getState().rsConfig;
            const plannedResults = planAllSummaryGroups(roster, rsConfig, summaryGroups);
            const plannedGroups = plannedResults.map(r => r.group);
            const allGroups = [...summaryGroups, ...plannedGroups];

            set({
                roster,
                summaryGroups: allGroups,
                isLoading: false,
                // Reset dependent state
                selectedCycleId: null,
                activeCompetitiveGroup: null,
                selectedReportId: null,
                selectedMemberId: null,
                isContextPanelOpen: false,
                projections: {},
                activeTab: 'dashboard' // Reset to default tab
            });

            // Initial Strategy Calculation
            useRedistributionStore.getState().calculateStrategy(allGroups, rsConfig.targetRsca ?? 4.0);

        } catch (err: any) {
            console.error("Failed to load data:", err);
            set({ isLoading: false, error: err.message || "Failed to load data" });
        }
    },

    // Navigation
    activeTab: 'dashboard',
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

    summaryGroups: [],
    setSummaryGroups: (groups) => set({ summaryGroups: groups }),
    addSummaryGroup: (group) => {
        set((state) => ({
            summaryGroups: [...state.summaryGroups, group]
        }));
        // Apply default anchors immediately for new group
        useNavfitStore.getState().applyDefaultAnchors(group.id);
    },
    updateSummaryGroup: (groupId, updates) => set((state) => ({
        summaryGroups: state.summaryGroups.map((g) =>
            g.id === groupId ? { ...g, ...updates } : g
        )
    })),
    updateGroupStatus: (groupId, status) => set((state) => ({
        summaryGroups: state.summaryGroups.map((group) => {
            if (group.id !== groupId) return group;

            // Also update status on all reports
            const updatedReports = group.reports.map(r => ({
                ...r,
                draftStatus: status as any
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
    toggleReportLock: (groupId, reportId, targetValue) => {
        set((state) => ({
            summaryGroups: state.summaryGroups.map((group) => {
                if (group.id !== groupId) return group;
                return {
                    ...group,
                    reports: group.reports.map((report) => {
                        if (report.id !== reportId) return report;

                        const willBeLocked = !report.isLocked;
                        const newMta = (willBeLocked && targetValue !== undefined) ? targetValue : report.traitAverage;

                        return {
                            ...report,
                            isLocked: willBeLocked,
                            traitAverage: newMta
                        };
                    })
                };
            })
        }));

        // Trigger Strategy Calculation after lock toggle to update projections for others
        const state = useNavfitStore.getState();
        useRedistributionStore.getState().calculateStrategy(state.summaryGroups, state.rsConfig.targetRsca ?? 4.0);
    },
    setGroupLockState: (groupId, isLocked, valueMap) => {
        set((state) => ({
            summaryGroups: state.summaryGroups.map((group) => {
                if (group.id !== groupId) return group;
                return {
                    ...group,
                    reports: group.reports.map((report) => {
                        const commitValue = (isLocked && valueMap && valueMap[report.id] !== undefined)
                            ? valueMap[report.id]
                            : report.traitAverage;

                        return {
                            ...report,
                            isLocked,
                            traitAverage: commitValue
                        };
                    })
                };
            })
        }));
        // Trigger Strategy Calculation
        const state = useNavfitStore.getState();
        useRedistributionStore.getState().calculateStrategy(state.summaryGroups, state.rsConfig.targetRsca ?? 4.0);
    },
    reorderMember: (memberId, newIndex) => set((state) => {
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

            const updatedReports = group.reports.map((r, i) => ({
                ...r,
                isLocked: anchorIndices.has(i)
            }));

            const newSummaryGroups = [...state.summaryGroups];
            newSummaryGroups[groupIndex] = { ...group, reports: updatedReports };

            // Trigger Strategy
            setTimeout(() => {
                const currentState = useNavfitStore.getState();
                useRedistributionStore.getState().calculateStrategy(currentState.summaryGroups, currentState.rsConfig.targetRsca ?? 4.0);
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
            const newOrderIds = targetIdOrOrder;
            updatedReportList = newOrderIds
                .map(id => currentReports.find(r => r.id === id))
                .filter((r): r is typeof currentReports[0] => !!r);

            const missingReports = currentReports.filter(r => !newOrderIds.includes(r.id));
            updatedReportList = [...updatedReportList, ...missingReports];

        } else {
            const targetId = targetIdOrOrder;
            const draggedIndex = currentReports.findIndex(r => r.id === draggedId);
            const targetIndex = currentReports.findIndex(r => r.id === targetId);

            if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
                return {};
            }

            const [draggedItem] = currentReports.splice(draggedIndex, 1);
            currentReports.splice(targetIndex, 0, draggedItem);
            updatedReportList = currentReports;
            console.warn("reorderMembers called with legacy single-target logic");
        }

        // 2. Auto-Assign Recommendations based on Rank (Optimistic)
        const recReports = assignRecommendationsByRank(updatedReportList, group);

        // 3. Update State Optimistically (Order + Recs)
        const optimisticGroups = [...state.summaryGroups];
        optimisticGroups[groupIndex] = { ...group, reports: recReports, hasManualOrder: true };

        // 4. Trigger Worker for Heavy Calculation (Trajectory + MTA Distribution)
        setTimeout(() => {
            // We pass the optimistically updated groups to the worker
            useRedistributionStore.getState().calculateStrategy(optimisticGroups, state.rsConfig.targetRsca ?? 4.0);
        }, 0);

        useAuditStore.getState().addLog('RANK_ORDER_CHANGE', {
            groupId,
            draggedId,
            newOrderCount: optimisticGroups[groupIndex].reports.length
        });

        // Convert to Domain Members for Redistribution Store (for specific group detailed audit/checks if needed, but calculateStrategy covers the main flow)
        // We keep the old requestRedistribution call for now if it does specific detailed logging or validation,
        // OR we rely on calculateStrategy.
        // The original code called BOTH calculateOptimizedTrajectory AND requestRedistribution.
        // calculateStrategy in worker basically does the calculateOptimizedTrajectory part.
        // Does requestRedistribution do anything extra? It logs 'REDISTRIBUTION_RUN'.
        // Let's keep requestRedistribution trigger for the CURRENT group specifically if we want detailed logs for it,
        // BUT it might be redundant calculation.
        // For now, I will omit the specific requestRedistribution because calculateStrategy should handle updating the store with optimized values.

        return {
            summaryGroups: optimisticGroups
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

            // 1. Update the value AND mark as locked (anchor)
            const updatedReports = group.reports.map(r => r.id === reportId ? { ...r, traitAverage: value, isLocked: true } : r);

            // 2. Strict Sort by MTA (Descending)
            updatedReports.sort((a, b) => {
                const mtaDiff = b.traitAverage - a.traitAverage;
                if (mtaDiff !== 0) return mtaDiff;
                return a.id.localeCompare(b.id);
            });

            // 3. Auto-Assign Recommendations based on Rank
            const finalReports = assignRecommendationsByRank(updatedReports, group);

            const newSummaryGroups = [...state.summaryGroups];
            newSummaryGroups[groupIndex] = { ...group, reports: finalReports };

            // Trigger Strategy
            setTimeout(() => {
                useRedistributionStore.getState().calculateStrategy(newSummaryGroups, state.rsConfig.targetRsca ?? 4.0);
            }, 0);

            return {
                projections: {
                    ...state.projections,
                    [reportId]: value
                },
                summaryGroups: newSummaryGroups
            };
        });
    },

    updateReport: (groupId, reportId, updates) => set((state) => {
        const groupIndex = state.summaryGroups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return {};

        const group = state.summaryGroups[groupIndex];
        const reports = [...group.reports];
        const reportIndex = reports.findIndex(r => r.id === reportId);
        if (reportIndex === -1) return {};

        const originalReport = reports[reportIndex];
        const updatedReport: Report = {
            ...originalReport,
            ...updates
        };

        const rosterMember = state.roster.find(m => m.id === updatedReport.memberId);
        let previousReport: Report | undefined;
        if (rosterMember && rosterMember.history) {
            const sorted = [...rosterMember.history].sort((a, b) => new Date(b.periodEndDate).getTime() - new Date(a.periodEndDate).getTime());
            const currentEndDate = new Date(updatedReport.periodEndDate);
            previousReport = sorted.find(r => new Date(r.periodEndDate) < currentEndDate);
        }

        const violations = validateReportState(updatedReport, group, previousReport);

        if (updates.promotionRecommendation) {
            const tempReports = [...reports];
            tempReports[reportIndex] = updatedReport;
            const epCount = tempReports.filter(r => r.promotionRecommendation === 'EP').length;
            const mpCount = tempReports.filter(r => r.promotionRecommendation === 'MP').length;
            const context = createSummaryGroupContext(group, updatedReport);
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

    commitOptimization: (groupId, reports) => set((state) => {
        const groupIndex = state.summaryGroups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return {};

        const group = state.summaryGroups[groupIndex];

        const newSummaryGroups = [...state.summaryGroups];
        newSummaryGroups[groupIndex] = {
            ...group,
            reports
        };

        const newProjections = { ...state.projections };
        reports.forEach(r => {
            delete newProjections[r.id];
        });

        return {
            summaryGroups: newSummaryGroups,
            projections: newProjections,
        };
    }),

    // Worker Results
    trajectoryCache: [],
    updateStrategyResults: (groups, trajectory) => set({
        summaryGroups: groups,
        trajectoryCache: trajectory
    }),

    // Requests
    pendingReportRequest: null,
    setPendingReportRequest: (request) => set({ pendingReportRequest: request }),
    clearPendingReportRequest: () => set({ pendingReportRequest: null }),

    // Context Rail State (Selection)
    selectedReportId: null,
    selectReport: (id) => set(() => {
        if (id) {
            return {
                selectedReportId: id,
                selectedMemberId: null
            };
        }
        return { selectedReportId: null };
    }),

    selectedMemberId: null,
    selectMember: (id) => set(() => {
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
    strategyViewMode: 'landing',

    selectCycle: (cycleId, competitiveGroupKey) => set({
        selectedCycleId: cycleId,
        activeCompetitiveGroup: competitiveGroupKey,
        isContextPanelOpen: true,
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
