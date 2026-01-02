import { create } from 'zustand';
import { debounce } from 'lodash';
import { Member, Constraints, RedistributionResult, RedistributionReasonCode, AuditEvent, ChangedMember } from '@/domain/rsca/types';
import { DEFAULT_CONSTRAINTS } from '@/domain/rsca/constants';
import { useNavfitStore } from './useNavfitStore';

// Define the shape of the worker result to match what we expect
interface WorkerResult {
    mtaVector: number[];
    finalRSCA: number;
    isFeasible: boolean;
    deltas: number[];
    explanation: string;
    diagnostics?: {
        meanMin: number;
        meanMax: number;
        iterations: number;
    };
    changedMembers?: ChangedMember[];
    reasonCodes?: RedistributionReasonCode[];
    infeasibilityReport?: any;
}

interface RedistributionStoreState {
    isCalculating: boolean;
    latestResult: Record<string, RedistributionResult | null>; // Keyed by groupId
    error: string | null;
    worker: Worker | null;

    // Actions
    initWorker: () => void;
    requestRedistribution: (groupId: string, members: Member[], constraints: Constraints, targetRSCA?: number) => void;

    // Explicit API as requested
    setRankOrder: (groupId: string, members: Member[]) => void;
    setAnchors: (groupId: string, anchorMap: Record<string, number>) => void;
    setAnchorMTA: (groupId: string, memberId: string, value: number) => void;
    setConstraints: (groupId: string, constraints: Constraints) => void;
    getRedistributionResult: (groupId: string) => RedistributionResult | null;
}

export const useRedistributionStore = create<RedistributionStoreState>((set, get) => {

    // Create the debounced calculation function
    // We use a map to store debounced functions per group if needed, or just one global debounced trigger?
    // Since requestRedistribution might be called frequently for the same group, we debounce it.

    const debouncedCalculate = debounce((groupId: string, members: Member[], constraints: Constraints, targetRSCA?: number) => {
        const { worker } = get();
        if (!worker) {
            console.warn("Redistribution worker not initialized");
            return;
        }

        set({ isCalculating: true, error: null });

        // Offload to worker
        worker.onmessage = (e) => {
            const data = e.data;
            if (data.error) {
                set({ isCalculating: false, error: data.error });
            } else if (data.result) {
                const engineResult: WorkerResult = data.result;

                // Convert Engine Result to Store Result
                const updatedMembers = members.map((m, i) => ({
                    ...m,
                    mta: engineResult.mtaVector[i]
                }));

                const result: RedistributionResult = {
                    updatedMembers,
                    rsca: engineResult.finalRSCA,
                    isFeasible: engineResult.isFeasible,
                    auditTrail: [{
                        timestamp: new Date(),
                        message: engineResult.explanation,
                        severity: engineResult.isFeasible ? 'info' : 'warning',
                        details: engineResult.diagnostics
                    }],
                    changedMembers: engineResult.changedMembers || [],
                    reasonCodes: engineResult.reasonCodes || [],
                    infeasibilityReport: engineResult.infeasibilityReport
                };

                set((state) => ({
                    isCalculating: false,
                    latestResult: {
                        ...state.latestResult,
                        [groupId]: result
                    }
                }));

                // Update NavfitStore with the new values
                // This closes the loop.
                const navfitStore = useNavfitStore.getState();

                // We need to map the updatedMembers back to SummaryGroup reports
                // Assuming navfitStore has an action or we use setSummaryGroups directly
                // But setSummaryGroups replaces everything. Ideally we have updateGroupReports.
                // Re-using reorderMembers logic might be tricky.
                // Let's manually update the group in NavfitStore.

                const groupIndex = navfitStore.summaryGroups.findIndex(g => g.id === groupId);
                if (groupIndex !== -1) {
                    const group = navfitStore.summaryGroups[groupIndex];
                    const newReports = group.reports.map(report => {
                        const updated = updatedMembers.find(m => m.id === report.id);
                        if (updated) {
                            return {
                                ...report,
                                traitAverage: updated.mta,
                                // Update promotion recommendation if needed?
                                // The engine currently doesn't output promotion recommendation, only MTA.
                                // We might need to keep existing logic for EP/MP based on rank.
                            };
                        }
                        return report;
                    });

                    const newSummaryGroups = [...navfitStore.summaryGroups];
                    newSummaryGroups[groupIndex] = { ...group, reports: newReports };

                    // Also update projections
                    const newProjections = { ...navfitStore.projections };
                    updatedMembers.forEach(m => {
                        newProjections[m.id] = m.mta;
                    });

                    // Update via setState for robustness
                    useNavfitStore.setState({
                        summaryGroups: newSummaryGroups,
                        projections: newProjections
                    });
                }
            }
        };

        worker.postMessage({ members, constraints, targetRSCA });

    }, 100); // 100ms debounce

    return {
        isCalculating: false,
        latestResult: {},
        error: null,
        worker: null,

        initWorker: () => {
            if (typeof Worker !== 'undefined' && !get().worker) {
                const worker = new Worker(new URL('../workers/redistribution.worker.ts', import.meta.url), { type: 'module' });
                set({ worker });
            }
        },

        requestRedistribution: (groupId, members, constraints, targetRSCA) => {
            debouncedCalculate(groupId, members, constraints, targetRSCA);
        },

        getRedistributionResult: (groupId) => get().latestResult[groupId] || null,

        // -- Requested API --

        setRankOrder: (groupId, members) => {
            // 1. Update UI immediately (Optimistic) via NavfitStore
            // Note: `members` here are Domain Members. We need to map IDs to Navfit Reports.
            const navfitStore = useNavfitStore.getState();

            // Call reorderMembers?
            // reorderMembers expects (groupId, draggedId, targetIdOrOrder).
            // If we have the full new list `members`, we can extract IDs.
            const newOrderIds = members.map(m => m.id);
            navfitStore.reorderMembers(groupId, "", newOrderIds); // "" as draggedId is ignored if array passed

            // 2. Trigger Calculation
            // We need to fetch the LATEST state from NavfitStore because reorderMembers might have changed things (like proposedTraitAverage)
            // or we just use the passed members?
            // The passed `members` might not have the correct `mta` if they were just dragged.
            // But usually we just need the Rank Order.
            // The engine needs the current MTAs (to start with) and Anchors.

            // Let's reconstruct the redistribution payload from the *updated* NavfitStore
            const updatedGroup = navfitStore.summaryGroups.find(g => g.id === groupId);
            if (!updatedGroup) return;

            const currentReports = updatedGroup.reports;
            const constraints = DEFAULT_CONSTRAINTS; // Or fetch from store/config
            // TODO: Where are constraints stored? `rsConfig` has some, but maybe not all.
            // Using DEFAULT for now, but should ideally come from rsConfig.

            const payloadMembers: Member[] = currentReports.map((r, index) => ({
                id: r.id,
                rank: index + 1,
                mta: r.traitAverage,
                isAnchor: r.isLocked,
                anchorValue: r.traitAverage, // Assuming locked means traitAverage is the anchor
                name: `${r.firstName} ${r.lastName}`
            }));

            get().requestRedistribution(groupId, payloadMembers, constraints, navfitStore.rsConfig.targetRsca);
        },

        setAnchors: (groupId, anchorMap) => {
             const navfitStore = useNavfitStore.getState();
             // Update locks in NavfitStore
             // This might be inefficient if we iterate.
             // Assuming anchorMap is { id: value }.
             // But usually we toggle one by one.
             // If we set a batch, we need a new action in NavfitStore or loop.

             // For now, let's assume we just trigger redistribution with updated anchors
             // But we MUST update the source of truth (NavfitStore)

             // Implementation detail: Use NavfitStore actions to set locks?
             // There isn't a "setAnchors" batch action.
             // Let's iterate.
             const groupIndex = navfitStore.summaryGroups.findIndex(g => g.id === groupId);
             if (groupIndex === -1) return;

             const group = navfitStore.summaryGroups[groupIndex];
             const newReports = group.reports.map(r => {
                 if (anchorMap.hasOwnProperty(r.id)) {
                     return { ...r, isLocked: true, traitAverage: anchorMap[r.id] };
                 }
                 return r;
             });

             const newGroups = [...navfitStore.summaryGroups];
             newGroups[groupIndex] = { ...group, reports: newReports };
             navfitStore.setSummaryGroups(newGroups);

             // Trigger
             const payloadMembers = newReports.map((r, i) => ({
                id: r.id,
                rank: i + 1,
                mta: r.traitAverage,
                isAnchor: r.isLocked,
                anchorValue: r.traitAverage,
                name: `${r.firstName} ${r.lastName}`
            }));
            get().requestRedistribution(groupId, payloadMembers, DEFAULT_CONSTRAINTS, navfitStore.rsConfig.targetRsca);
        },

        setAnchorMTA: (groupId, memberId, value) => {
             const navfitStore = useNavfitStore.getState();
             // Update specific report
             const groupIndex = navfitStore.summaryGroups.findIndex(g => g.id === groupId);
             if (groupIndex === -1) return;

             const group = navfitStore.summaryGroups[groupIndex];
             const newReports = group.reports.map(r => {
                 if (r.id === memberId) {
                     return { ...r, isLocked: true, traitAverage: value };
                 }
                 return r;
             });

             const newGroups = [...navfitStore.summaryGroups];
             newGroups[groupIndex] = { ...group, reports: newReports };
             navfitStore.setSummaryGroups(newGroups);

             // Trigger
             const payloadMembers = newReports.map((r, i) => ({
                id: r.id,
                rank: i + 1,
                mta: r.traitAverage,
                isAnchor: r.isLocked,
                anchorValue: r.traitAverage,
                name: `${r.firstName} ${r.lastName}`
             }));
             get().requestRedistribution(groupId, payloadMembers, DEFAULT_CONSTRAINTS, navfitStore.rsConfig.targetRsca);
        },

        setConstraints: (groupId, constraints) => {
            // Update constraints. Currently these might be in RS Config or local to the calculation.
            // If they are in RS Config, update them.
            // Note: RS Config seems global, not per group.
            // If `groupId` implies we can have per-group constraints, we might need to store them.
            // For now, let's just trigger calculation with new constraints.

            const navfitStore = useNavfitStore.getState();
            const group = navfitStore.summaryGroups.find(g => g.id === groupId);
            if (!group) return;

             const payloadMembers = group.reports.map((r, i) => ({
                id: r.id,
                rank: i + 1,
                mta: r.traitAverage,
                isAnchor: r.isLocked,
                anchorValue: r.traitAverage,
                name: `${r.firstName} ${r.lastName}`
             }));

             // Save constraints to store? The interface doesn't have a place in NavfitStore for full Constraints object yet.
             // We'll pass them to the engine.
             get().requestRedistribution(groupId, payloadMembers, constraints, navfitStore.rsConfig.targetRsca);
        }
    };
});
