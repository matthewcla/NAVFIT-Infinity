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
import { planAllSummaryGroups, getCompetitiveGroup } from '@/features/strategy/logic/planSummaryGroups';
import type { User } from '@/domain/auth/types';
import { MOCK_USERS } from '@/domain/auth/mockUsers';

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
    reorderMember: (memberId: string, newIndex: number) => void; // Legacy roster reorder? Or keep for completeness

    // Competitive Group Ranking State (The Master Plan)
    competitiveGroupRankings: Record<string, string[]>; // Key -> Member IDs in rank order
    setCompetitiveGroupRanking: (key: string, memberIds: string[]) => void;
    reorderCompetitiveGroupMember: (key: string, activeId: string, overId: string) => void;

    // Summary Group / Ranking Mode Actions
    reorderMembers: (groupId: string, draggedId: string, targetIdOrOrder: string | string[]) => void;
    applyDefaultAnchors: (groupId: string) => void;

    summaryGroups: SummaryGroup[];
    setSummaryGroups: (groups: SummaryGroup[]) => void;
    addSummaryGroup: (group: SummaryGroup) => void;
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
    strategyViewMode: 'landing' | 'workspace' | 'cycles' | 'planner';
    setStrategyViewMode: (mode: 'landing' | 'workspace' | 'cycles' | 'planner') => void;

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

export const useNavfitStore = create<NavfitStore>((set, get) => ({
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
                const lastName = parts[0] || '';
                const firstName = parts[1] || '';
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

            // Auto-generate planned summary groups
            const rsConfig = useNavfitStore.getState().rsConfig;
            const plannedResults = planAllSummaryGroups(roster, rsConfig, summaryGroups);
            const plannedGroups = plannedResults.map(r => r.group);
            const allGroups = [...summaryGroups, ...plannedGroups];

            // Initialize Competitive Group Rankings
            // Sort by Last Trait Descending initially
            const rankings: Record<string, string[]> = {};

            // Group members by Competitive Group Key
            roster.forEach(m => {
                const key = getCompetitiveGroup(m).label;
                if (!rankings[key]) rankings[key] = [];
                rankings[key].push(m.id);
            });

            // Sort each group
            Object.keys(rankings).forEach(key => {
                rankings[key].sort((idA, idB) => {
                    const memberA = roster.find(m => m.id === idA);
                    const memberB = roster.find(m => m.id === idB);
                    const traitA = memberA?.lastTrait || 0;
                    const traitB = memberB?.lastTrait || 0;
                    // Sort Descending (Higher Trait first)
                    if (traitB !== traitA) return traitB - traitA;
                    // Tie-break with name
                    const nameA = memberA ? `${memberA.lastName}, ${memberA.firstName}` : '';
                    const nameB = memberB ? `${memberB.lastName}, ${memberB.firstName}` : '';
                    return nameA.localeCompare(nameB);
                });
            });


            set({
                roster,
                summaryGroups: allGroups,
                competitiveGroupRankings: rankings,
                isLoading: false,
                // Reset dependent state
                selectedCycleId: null,
                activeCompetitiveGroup: null,
                selectedReportId: null,
                selectedMemberId: null,
                isContextPanelOpen: false,
                projections: {},
                activeTab: 'strategy'
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

    // Competitive Group Rankings
    competitiveGroupRankings: {},
    setCompetitiveGroupRanking: (key, memberIds) => set((state) => ({
        competitiveGroupRankings: {
            ...state.competitiveGroupRankings,
            [key]: memberIds
        }
    })),
    reorderCompetitiveGroupMember: (key, activeId, overId) => set((state) => {
        const currentList = state.competitiveGroupRankings[key] || [];
        const oldIndex = currentList.indexOf(activeId);
        const newIndex = currentList.indexOf(overId);

        if (oldIndex === -1 || newIndex === -1) return {};

        const newList = [...currentList];
        const [movedItem] = newList.splice(oldIndex, 1);
        newList.splice(newIndex, 0, movedItem);

        // SYNC TO SUMMARY GROUPS (Planned/Draft)
        // Update all relevant summary groups to reflect this new order
        const updatedSummaryGroups = state.summaryGroups.map(group => {
            if (group.competitiveGroupKey === key && (group.status === 'Planned' || group.status === 'Draft')) {
                // Clone reports array to ensure immutability at array level
                const reports = [...group.reports];

                // 1. Sort Reports by New Master Rank
                reports.sort((a, b) => {
                    const idxA = newList.indexOf(a.memberId);
                    const idxB = newList.indexOf(b.memberId);
                    // Members in master list come first
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    if (idxA !== -1) return -1;
                    if (idxB !== -1) return 1;
                    return 0;
                });

                // 2. Redistribute MTAs to enforce monotonicity (Assign by Rank)
                // We preserve the set of MTA values in the group (keeping RSCA constant)
                // but assign the highest values to the highest ranks.
                const mtas = reports.map(r => r.traitAverage).sort((a, b) => b - a); // Descending

                // Map reports to new objects if we are changing them
                const updatedReports = reports.map((r, i) => {
                    if (!r.isLocked && r.traitAverage !== mtas[i]) {
                        return { ...r, traitAverage: mtas[i] };
                    }
                    return r;
                });

                return { ...group, reports: updatedReports };
            }
            return group;
        });

        return {
            competitiveGroupRankings: {
                ...state.competitiveGroupRankings,
                [key]: newList
            },
            summaryGroups: updatedSummaryGroups
        };
    }),


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
    toggleReportLock: (groupId, reportId, targetValue) => {
        // DEBUG: Entry point
        const preState = useNavfitStore.getState();
        const preGroup = preState.summaryGroups.find(g => g.id === groupId);
        const preReport = preGroup?.reports.find(r => r.id === reportId);
        const preRank = preGroup?.reports.findIndex(r => r.id === reportId);

        set((state) => ({
            summaryGroups: state.summaryGroups.map((group) => {
                if (group.id !== groupId) return group;
                return {
                    ...group,
                    reports: group.reports.map((report) => {
                        if (report.id !== reportId) return report;

                        const willBeLocked = !report.isLocked;
                        // If locking and a target value is provided, commit it.
                        // Otherwise (unlocking or no value), keep existing traitAverage.
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

        // Trigger Redistribution for Anchor Update
        const state = useNavfitStore.getState(); // Get fresh state
        const group = state.summaryGroups.find(g => g.id === groupId);
        if (group) {
            const report = group.reports.find(r => r.id === reportId);
            useAuditStore.getState().addLog('ANCHOR_SELECTION_CHANGE', {
                groupId,
                memberId: reportId,
                isLocked: report?.isLocked,
                value: report?.traitAverage
            });
        }
    },
    setGroupLockState: (groupId, isLocked, valueMap) => {
        set((state) => ({
            summaryGroups: state.summaryGroups.map((group) => {
                if (group.id !== groupId) return group;
                return {
                    ...group,
                    reports: group.reports.map((report) => {
                        // If locking, check if we have a specific value to commit for this report
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

        // Trigger Redistribution
        const state = useNavfitStore.getState();
        const group = state.summaryGroups.find(g => g.id === groupId);
        if (group) {
            useAuditStore.getState().addLog('ANCHOR_SELECTION_CHANGE', {
                groupId,
                message: isLocked ? "Locked All Reports" : "Unlocked All Reports"
            });
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

            const updatedReports = group.reports.map((r, i) => ({
                ...r,
                isLocked: anchorIndices.has(i)
            }));

            const newSummaryGroups = [...state.summaryGroups];
            newSummaryGroups[groupIndex] = { ...group, reports: updatedReports };

            // Trigger Engine side effect
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
        let newOrderIds: string[] = [];

        if (Array.isArray(targetIdOrOrder)) {
            // Bulk Reorder based on ID list
            newOrderIds = targetIdOrOrder;
            updatedReportList = newOrderIds
                .map(id => currentReports.find(r => r.id === id))
                .filter((r): r is typeof currentReports[0] => !!r);

            const missingReports = currentReports.filter(r => !newOrderIds.includes(r.id));
            updatedReportList = [...updatedReportList, ...missingReports];

        } else {
            // Legacy Single-Item Move
            const targetId = targetIdOrOrder;
            const draggedIndex = currentReports.findIndex(r => r.id === draggedId);
            const targetIndex = currentReports.findIndex(r => r.id === targetId);

            if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
                return {};
            }

            const [draggedItem] = currentReports.splice(draggedIndex, 1);
            currentReports.splice(targetIndex, 0, draggedItem);
            updatedReportList = currentReports;
            newOrderIds = updatedReportList.map(r => r.id);

            // Interpolation Logic...
            const prevReport = updatedReportList[targetIndex - 1];
            const nextReport = updatedReportList[targetIndex + 1];
            let newMta = draggedItem.traitAverage;

            if (prevReport && nextReport) {
                newMta = (prevReport.traitAverage + nextReport.traitAverage) / 2;
            } else if (prevReport) {
                newMta = Math.max(2.0, prevReport.traitAverage - 0.1);
            } else if (nextReport) {
                newMta = Math.min(5.0, nextReport.traitAverage + 0.1);
            }

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

        const finalReports = assignRecommendationsByRank(updatedReportList, group);
        const newSummaryGroups = [...state.summaryGroups];
        newSummaryGroups[groupIndex] = {
            ...group,
            reports: finalReports
        };

        // SYNC TO COMPETITIVE GROUP PLAN (MASTER RANK)
        // We need to update the Master List based on this specific Summary Group change.
        // Logic: Extract the relative order of members in this Summary Group, and impose that relative order on the Master List.
        const compGroupKey = group.competitiveGroupKey;
        const masterList = state.competitiveGroupRankings[compGroupKey];

        let newMasterList = masterList ? [...masterList] : [];
        if (masterList && masterList.length > 0) {
            // Extract Member IDs from the finalized report list (which is in the new correct order)
            const newMemberOrder = finalReports.map(r => r.memberId);
            const membersInGroup = new Set(newMemberOrder);

            // 1. Identify indices of these members in the Master List
            const relevantIndices = masterList
                .map((id, index) => membersInGroup.has(id) ? index : -1)
                .filter(idx => idx !== -1);

            // 2. We simply overwrite the slots identified by relevantIndices with the newMemberOrder in sequence.

            if (relevantIndices.length > 0) {
                 const validNewOrder = newMemberOrder.filter(id => masterList.includes(id));

                 if (validNewOrder.length === relevantIndices.length) {
                     validNewOrder.forEach((memberId, i) => {
                        newMasterList[relevantIndices[i]] = memberId;
                     });
                 }
            }
        }

        // Trigger Redistribution Engine
        const domainMembers: DomainMember[] = finalReports.map((r, i) => ({
            id: r.id,
            rank: i + 1,
            mta: r.traitAverage,
            isAnchor: !!r.isLocked,
            anchorValue: r.traitAverage,
            name: r.memberName
        }));

        useAuditStore.getState().addLog('RANK_ORDER_CHANGE', {
            groupId,
            draggedId,
            targetIdOrOrder
        });

        useRedistributionStore.getState().requestRedistribution(groupId, domainMembers, DEFAULT_CONSTRAINTS, state.rsConfig.targetRsca);

        return {
            summaryGroups: newSummaryGroups,
            // Update Master List
            competitiveGroupRankings: {
                ...state.competitiveGroupRankings,
                [compGroupKey]: newMasterList
            }
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
            // FIX: Use stable sort with secondary key (id) to prevent rank jumping with equal MTA values.
            updatedReports.sort((a, b) => {
                const mtaDiff = b.traitAverage - a.traitAverage;
                if (mtaDiff !== 0) return mtaDiff;
                return a.id.localeCompare(b.id); // Tiebreaker for stability
            });

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
        const rosterMember = state.roster.find(m => m.id === updatedReport.memberId);
        let previousReport: Report | undefined;
        if (rosterMember && rosterMember.history) {
            const sorted = [...rosterMember.history].sort((a, b) => new Date(b.periodEndDate).getTime() - new Date(a.periodEndDate).getTime());
            const currentEndDate = new Date(updatedReport.periodEndDate);
            previousReport = sorted.find(r => new Date(r.periodEndDate) < currentEndDate);
        }

        const violations = validateReportState(updatedReport, group, previousReport);

        // 3. Validate Quotas (Group Level)
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
    strategyViewMode: 'landing', // Default to landing

    selectCycle: (cycleId, competitiveGroupKey) => set({
        selectedCycleId: cycleId,
        activeCompetitiveGroup: competitiveGroupKey,
        isContextPanelOpen: true,
        // When drilling down, switch to workspace view
        strategyViewMode: 'workspace'
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
