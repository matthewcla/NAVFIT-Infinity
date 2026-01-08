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
import { fetchInitialData } from '@/services/dataLoader';

interface NavfitStore {
    // Loading State
    isLoading: boolean;
    error: string | null;
    loadData: () => Promise<void>;

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
    commitOptimization: (groupId: string, reports: Report[]) => void;


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
    // Loading State
    isLoading: false,
    error: null,
    loadData: async () => {
        set({ isLoading: true, error: null });
        try {
            const { members, summaryGroups } = await fetchInitialData();

            // Map Domain Members to UI RosterMembers if needed
            // The RosterMember interface (from '@/types/roster') and Domain Member (from '@/types/index') are very similar but we should ensure compatibility.
            // RosterMember expects: id, firstName, lastName, rank, payGrade, designator, dateReported, prd, lastTrait, status
            // fetchInitialData returns Member[] which has name, but not split firstName/lastName?
            // Wait, fetchInitialData implementation maps: name: `${detail.lastName}, ${detail.firstName}`
            // But RosterMember in the store interface expects `firstName`, `lastName`.
            // Let's check `fetchInitialData`. It returns Member[].
            // RosterMember interface:
            // export interface RosterMember { id, firstName, lastName, ... }
            // Let's adapt the data from fetchInitialData to match RosterMember.

            // However, looking at fetchInitialData, it returns objects that conform to Member interface.
            // Member interface in src/types/index.ts has `name` (combined).
            // RosterMember in src/types/roster.ts has firstName, lastName.

            // We should inspect the data coming from fetchInitialData.
            // Actually, fetchInitialData maps from raw member details which HAVE firstName and lastName.
            // But it returns Member[].

            // If the store expects RosterMember[], we might need to adjust fetchInitialData or map here.
            // Since I cannot change fetchInitialData easily without potentially breaking other things (though it was just created),
            // I will map it here. Ideally fetchInitialData should probably return what we need or we update the store type.
            // Let's assume we map here for safety.

            // Wait, looking at current `initializeRoster` (which I removed), it was mapping from raw JSON.
            // fetchInitialData does the mapping.

            // Let's look at `members` returned by `fetchInitialData`.
            // It maps: name: "Last, First".
            // It does NOT seem to preserve firstName/lastName in the return object explicitly unless Member has them.
            // src/types/index.ts Member interface:
            // export interface Member { id, name, rank, payGrade?, designator?, rating?, milestone?, prd?, status, gainDate?, ... }
            // It does not have firstName, lastName.

            // But RosterMember does.
            // I should probably update RosterMember or NavfitStore to use Member, OR parse the name back.
            // Or better, let's look at what `fetchInitialData` used. It used `detail.firstName`.
            // I'll update the mapping here to be safe, assuming `fetchInitialData` is the source of truth for "loading data".
            // BUT `fetchInitialData` returns `Member[]`.
            // `useNavfitStore` state `roster` is `RosterMember[]`.

            // If I change `roster` type to `Member[]`, it might break components expecting `firstName`.
            // Let's map it. `Member` objects from `fetchInitialData` don't carry `firstName`.
            // This is a slight mismatch introduced by the new service.
            // I'll assume for now I can parse the name or that the UI can handle `name`.
            // Actually, looking at `fetchInitialData` code in memory:
            /*
            return {
                id: detail.id,
                name: `${detail.lastName}, ${detail.firstName}`,
                ...
            };
            */
            // It drops firstName/lastName.
            // To fix this cleanly, I should probably have `fetchInitialData` return objects that satisfy `RosterMember` (or a superset).
            // But I am in the step of refactoring the store.
            // I will split the name string here to populate firstName/lastName for RosterMember compatibility.

            const roster: RosterMember[] = members.map(m => {
                const parts = m.name.split(', ');
                const lastName = parts[0] || '';
                const firstName = parts[1] || '';
                return {
                    id: m.id,
                    firstName,
                    lastName,
                    rank: m.rank,
                    payGrade: m.payGrade as PayGrade,
                    designator: m.designator || '', // Enlisted now have designator populated from my previous step
                    dateReported: (m as any).dateReported || new Date().toISOString().split('T')[0], // Cast as any if strictly typed Member doesn't have it (but I saw it in fetchInitialData source)
                    prd: m.prd || '',
                    eda: (m as any).eda,
                    edd: (m as any).edd,
                    milestoneTour: (m as any).milestoneTour,
                    lastTrait: m.lastTrait || 0,
                    status: m.status as any,
                    history: m.history || []
                };
            });

            set({
                roster,
                summaryGroups,
                isLoading: false,
                // Reset dependent state
                selectedCycleId: null,
                activeCompetitiveGroup: null,
                selectedReportId: null,
                selectedMemberId: null,
                isContextPanelOpen: false,
                projections: {},
                activeTab: 'strategy' // Reset to default tab? Or keep?
            });
        } catch (err: any) {
            console.error("Failed to load data:", err);
            set({ isLoading: false, error: err.message || "Failed to load data" });
        }
    },

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

            // Requirement says "provide default anchor selection".
            // We strictly set the calculated indices as anchors and unlock others to ensure a clean default state.

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
                    name: r.memberName
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
            name: r.memberName
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

            // 1. Update the value AND mark as locked (anchor)
            // Manual MTA change implies an override - mark as locked so redistribution preserves it
            const updatedReports = group.reports.map(r => r.id === reportId ? { ...r, traitAverage: value, isLocked: true } : r);

            // 2. Strict Sort by MTA (Descending)
            updatedReports.sort((a, b) => b.traitAverage - a.traitAverage);

            // 3. Auto-Assign Recommendations based on Rank
            // This ensures that if the rank order changes due to MTA change, the recommendations update (Automatic Method)
            const finalReports = assignRecommendationsByRank(updatedReports, group);

            const newSummaryGroups = [...state.summaryGroups];
            newSummaryGroups[groupIndex] = { ...group, reports: finalReports };

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
                name: r.memberName
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

    commitOptimization: (groupId, reports) => set((state) => {
        const groupIndex = state.summaryGroups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return {};

        const group = state.summaryGroups[groupIndex];

        // 1. Update Group with new Reports (Optimized)
        const newSummaryGroups = [...state.summaryGroups];
        newSummaryGroups[groupIndex] = {
            ...group,
            reports
        };

        // 2. Clear Projections for these members
        // We want to remove the projection key so the UI falls back to the report's traitAverage (which is now updated)
        const newProjections = { ...state.projections };
        reports.forEach(r => {
            delete newProjections[r.id];
        });

        // 3. Clear any preview projections as well (though usually handled by component state)
        // If we had store-based preview, we'd clear it here.

        return {
            summaryGroups: newSummaryGroups,
            projections: newProjections,
            // Also update loaded state references if needed? 
            // In CycleContextPanel, we use latestGroup from summaryGroups, so this is sufficient.
        };
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

// Initialize
// useNavfitStore.getState().loadData();
