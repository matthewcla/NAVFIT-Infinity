import { create } from 'zustand';
import { debounce } from 'lodash';
import type { Member, Constraints, RedistributionResult, AlgorithmParams } from '@/domain/rsca/types';
import type { SummaryGroup } from '@/types';
import { DEFAULT_CONSTRAINTS } from '@/domain/rsca/constants';
import { useNavfitStore } from './useNavfitStore';
import { useAuditStore } from './useAuditStore';
import { redistributeMTA } from '@/domain/rsca/redistribution'; // Fallback
import { type WorkerInput, type WorkerOutput, type AnchorMap, type StrategyParams, WorkerActionType, type StrategyResult } from '@/features/strategy/workers/types';
import RedistributionWorker from '@/features/strategy/workers/redistribution.worker?worker';

interface RedistributionStoreState {
    isCalculating: boolean;
    latestResult: Record<string, RedistributionResult | null>; // Keyed by groupId
    error: string | null;
    worker: Worker | null;
    latestRequestId: string | null;
    latestStrategyRequestId: string | null; // Track strategy requests separately?

    // Actions
    initWorker: () => void;
    requestRedistribution: (groupId: string, members: Member[], constraints: Constraints, targetRSCA?: number) => void;
    calculateStrategy: (summaryGroups: SummaryGroup[], targetRsca: number) => void;

    // Explicit API
    setRankOrder: (groupId: string, members: Member[]) => void;
    setAnchors: (groupId: string, anchorMap: Record<string, number>) => void;
    setAnchorMTA: (groupId: string, memberId: string, value: number) => void;
    setConstraints: (groupId: string, constraints: Constraints) => void;
    getRedistributionResult: (groupId: string) => RedistributionResult | null;
    reset: () => void;
}

// Map to store context for pending requests (RequestId -> Context)
const requestContexts = new Map<string, { groupId: string; members: Member[] }>();

// Simple UUID generator fallback
function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export const useRedistributionStore = create<RedistributionStoreState>((set, get) => {

    const handleSuccess = (groupId: string, result: RedistributionResult) => {
        // Log Redistribution Run
        useAuditStore.getState().addLog('REDISTRIBUTION_RUN', {
            groupId,
            rsca: result.rsca,
            isFeasible: result.isFeasible,
            updatedMembersCount: result.updatedMembers.length
        });

        if (!result.isFeasible && result.infeasibilityReport) {
            useAuditStore.getState().addLog('INFEASIBILITY_DETECTED', {
                groupId,
                infeasibilityReport: result.infeasibilityReport
            });
        }

        set((state) => ({
            isCalculating: false,
            latestResult: {
                ...state.latestResult,
                [groupId]: result
            }
        }));

        // Update NavfitStore - Projections Only
        const navfitStore = useNavfitStore.getState();
        const updatedMembers = result.updatedMembers;
        const currentGroup = navfitStore.summaryGroups.find(g => g.id === groupId);

        const newProjections = { ...navfitStore.projections };
        updatedMembers.forEach(m => {
            // Skip if anchor (user explicitly set this value)
            if (m.isAnchor) return;

            // FIX: Check if report is locked (and not NOB) - preserve committed traitAverage
            if (currentGroup) {
                const report = currentGroup.reports.find(r => r.id === m.id);
                if (report?.isLocked && report?.promotionRecommendation !== 'NOB') {
                    return; // Skip - locked reports should not have projections override their committed value
                }
            }

            newProjections[m.id] = m.mta;
        });

        useNavfitStore.setState({
            projections: newProjections
        });
    };

    const handleStrategySuccess = (result: StrategyResult) => {
        // Update NavfitStore with optimized groups and trajectory
        // We assume useNavfitStore has updateStrategyResults action (will be added)
        // Or we can set state directly if we have access, but action is cleaner.
        // Since we are in the store file, useNavfitStore.getState().updateStrategyResults(...) is preferred.
        // Assuming I will add it. If not, I can use setState.
        // useNavfitStore.setState({ summaryGroups: result.optimizedGroups, trajectoryCache: result.trajectory });

        // I'll call the action I plan to create.
        const navfitStore = useNavfitStore.getState();
        if (navfitStore.updateStrategyResults) {
            navfitStore.updateStrategyResults(result.optimizedGroups, result.trajectory);
        } else {
            console.warn("updateStrategyResults not found on NavfitStore, falling back to setState");
            // Fallback during transition
            useNavfitStore.setState({
                summaryGroups: result.optimizedGroups,
                // @ts-ignore - trajectoryCache might not exist yet in types
                trajectoryCache: result.trajectory
            });
        }

        set({ isCalculating: false });
    };

    const debouncedCalculate = debounce((groupId: string, members: Member[], constraints: Constraints, targetRSCA?: number) => {
        const { worker } = get();
        const requestId = generateUUID();

        set({ isCalculating: true, error: null, latestRequestId: requestId });

        // Store context
        requestContexts.set(requestId, { groupId, members });

        // Extract anchors
        const anchors: AnchorMap = {};
        members.forEach(m => {
            if (m.isAnchor && m.anchorValue !== undefined) {
                anchors[m.id] = m.anchorValue;
            }
        });

        const algorithmParams: AlgorithmParams = {
            delta: (constraints as unknown as { delta?: number }).delta ?? 0.1,
            p: (constraints as unknown as { p?: number }).p ?? 1.0,
            alpha: (constraints as unknown as { alpha?: number }).alpha ?? 0.1,
            tau: (constraints as unknown as { tau?: number }).tau ?? 0.05
        };

        const params: StrategyParams = {
            ...constraints,
            targetRSCA,
            algorithmParams
        };

        if (worker) {
            const input: WorkerInput = {
                type: WorkerActionType.REDISTRIBUTE,
                members,
                anchors,
                params,
                requestId
            };
            worker.postMessage(input);
        } else {
            // Fallback: Synchronous execution
            try {
                // Simulate worker logic: merge anchors
                const effectiveMembers = members.map(m => {
                    const anchorVal = anchors[m.id];
                    if (anchorVal !== undefined) {
                        return { ...m, isAnchor: true, anchorValue: anchorVal, mta: anchorVal };
                    }
                    return m;
                });

                const engineResult = redistributeMTA(effectiveMembers, constraints, algorithmParams);

                const updatedMembers = effectiveMembers.map((m, i) => ({
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

                // Only update if this is still the latest request
                if (get().latestRequestId === requestId) {
                    handleSuccess(groupId, result);
                }

            } catch (err) {
                if (get().latestRequestId === requestId) {
                    set({ isCalculating: false, error: (err as Error).message });
                }
            }

            // Cleanup context
            requestContexts.delete(requestId);
        }
    }, 100);

    const debouncedStrategyCalculate = debounce((summaryGroups: SummaryGroup[], targetRsca: number) => {
        const { worker } = get();
        const requestId = generateUUID();

        set({ isCalculating: true, error: null, latestStrategyRequestId: requestId });

        if (worker) {
            const input: WorkerInput = {
                type: WorkerActionType.CALCULATE_STRATEGY,
                summaryGroups,
                targetRsca,
                requestId
            };
            worker.postMessage(input);
        } else {
            console.error("Worker not initialized for strategy calculation. Synchronous fallback not implemented for strategy.");
            set({ isCalculating: false, error: "Worker not available" });
        }
    }, 100);

    return {
        isCalculating: false,
        latestResult: {},
        error: null,
        worker: null,
        latestRequestId: null,
        latestStrategyRequestId: null,

        initWorker: () => {
            if (typeof Worker !== 'undefined' && !get().worker) {
                // Use Vite's native worker import syntax
                const worker = new RedistributionWorker();

                worker.onmessage = (e: MessageEvent<WorkerOutput>) => {
                    const data = e.data;
                    const { latestRequestId, latestStrategyRequestId } = get();

                    // Check type and handle accordingly
                    if (data.type === WorkerActionType.CALCULATE_STRATEGY) {
                         if (data.requestId !== latestStrategyRequestId) {
                             return; // Ignore stale strategy results
                         }
                         if (data.success) {
                             handleStrategySuccess(data.result);
                         } else {
                             set({ isCalculating: false, error: data.error });
                         }
                         return;
                    }

                    if (data.type === WorkerActionType.REDISTRIBUTE) {
                         if (data.requestId !== latestRequestId) {
                             requestContexts.delete(data.requestId);
                             return;
                         }
                         const context = requestContexts.get(data.requestId);
                         if (!context) return;

                         if (!data.success) {
                             set({ isCalculating: false, error: data.error });
                         } else {
                             handleSuccess(context.groupId, data.result);
                         }
                         requestContexts.delete(data.requestId);
                         return;
                    }
                };

                set({ worker });
            }
        },

        requestRedistribution: (groupId, members, constraints, targetRSCA) => {
            debouncedCalculate(groupId, members, constraints, targetRSCA);
        },

        calculateStrategy: (summaryGroups, targetRsca) => {
            debouncedStrategyCalculate(summaryGroups, targetRsca);
        },

        getRedistributionResult: (groupId) => get().latestResult[groupId] || null,

        reset: () => {
            set({
                isCalculating: false,
                latestResult: {},
                error: null,
                latestRequestId: null,
                latestStrategyRequestId: null
            });
        },

        // -- Requested API --

        setRankOrder: (groupId, members) => {
            const navfitStore = useNavfitStore.getState();
            const newOrderIds = members.map(m => m.id);
            navfitStore.reorderMembers(groupId, "", newOrderIds);

            const updatedGroup = navfitStore.summaryGroups.find(g => g.id === groupId);
            if (!updatedGroup) return;

            const currentReports = updatedGroup.reports;
            const constraints = DEFAULT_CONSTRAINTS;

            const payloadMembers: Member[] = currentReports.map((r, index) => ({
                id: r.id,
                rank: index + 1,
                mta: r.traitAverage,
                isAnchor: !!r.isLocked,
                anchorValue: r.traitAverage,
                name: r.memberName
            }));

            get().requestRedistribution(groupId, payloadMembers, constraints, navfitStore.rsConfig.targetRsca);
        },

        setAnchors: (groupId, _anchorMap) => {
            const navfitStore = useNavfitStore.getState();
            const group = navfitStore.summaryGroups.find(g => g.id === groupId);
            if (!group) return;

            const payloadMembers = group.reports.map((r, i) => ({
                id: r.id,
                rank: i + 1,
                mta: r.traitAverage,
                isAnchor: !!r.isLocked,
                anchorValue: r.traitAverage,
                name: r.memberName
            }));

            get().requestRedistribution(groupId, payloadMembers, DEFAULT_CONSTRAINTS, navfitStore.rsConfig.targetRsca);
        },

        setAnchorMTA: (groupId, memberId, value) => {
            const navfitStore = useNavfitStore.getState();
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

            const payloadMembers = newReports.map((r, i) => ({
                id: r.id,
                rank: i + 1,
                mta: r.traitAverage,
                isAnchor: !!r.isLocked,
                anchorValue: r.traitAverage,
                name: r.memberName
            }));
            get().requestRedistribution(groupId, payloadMembers, DEFAULT_CONSTRAINTS, navfitStore.rsConfig.targetRsca);
        },

        setConstraints: (groupId, constraints) => {
            const navfitStore = useNavfitStore.getState();
            const group = navfitStore.summaryGroups.find(g => g.id === groupId);
            if (!group) return;

            const payloadMembers = group.reports.map((r, i) => ({
                id: r.id,
                rank: i + 1,
                mta: r.traitAverage,
                isAnchor: !!r.isLocked,
                anchorValue: r.traitAverage,
                name: r.memberName
            }));
            get().requestRedistribution(groupId, payloadMembers, constraints, navfitStore.rsConfig.targetRsca);
        }
    };
});
