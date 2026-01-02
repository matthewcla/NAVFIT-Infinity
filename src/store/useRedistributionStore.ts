import { create } from 'zustand';
import { debounce } from 'lodash';
import { Member, Constraints, RedistributionResult, RedistributionReasonCode, AuditEvent, ChangedMember } from '@/domain/rsca/types';
import { DEFAULT_CONSTRAINTS } from '@/domain/rsca/constants';
import { useNavfitStore } from './useNavfitStore';
import { redistributeMTA } from '@/domain/rsca/redistribution'; // Fallback
import type { WorkerInput, WorkerOutput, AnchorMap, StrategyParams } from '@/features/strategy/workers/types';
import RedistributionWorker from '@/features/strategy/workers/redistribution.worker?worker';

interface RedistributionStoreState {
    isCalculating: boolean;
    latestResult: Record<string, RedistributionResult | null>; // Keyed by groupId
    error: string | null;
    worker: Worker | null;
    latestRequestId: string | null;

    // Actions
    initWorker: () => void;
    requestRedistribution: (groupId: string, members: Member[], constraints: Constraints, targetRSCA?: number) => void;

    // Explicit API
    setRankOrder: (groupId: string, members: Member[]) => void;
    setAnchors: (groupId: string, anchorMap: Record<string, number>) => void;
    setAnchorMTA: (groupId: string, memberId: string, value: number) => void;
    setConstraints: (groupId: string, constraints: Constraints) => void;
    getRedistributionResult: (groupId: string) => RedistributionResult | null;
}

// Map to store context for pending requests (RequestId -> Context)
const requestContexts = new Map<string, { groupId: string; members: Member[] }>();

// Simple UUID generator fallback
function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export const useRedistributionStore = create<RedistributionStoreState>((set, get) => {

    const handleSuccess = (groupId: string, result: RedistributionResult) => {
        set((state) => ({
            isCalculating: false,
            latestResult: {
                ...state.latestResult,
                [groupId]: result
            }
        }));

        // Update NavfitStore
        const navfitStore = useNavfitStore.getState();
        const groupIndex = navfitStore.summaryGroups.findIndex(g => g.id === groupId);

        if (groupIndex !== -1) {
            const group = navfitStore.summaryGroups[groupIndex];
            const updatedMembers = result.updatedMembers;

            const newReports = group.reports.map(report => {
                const updated = updatedMembers.find(m => m.id === report.id);
                if (updated) {
                    return {
                        ...report,
                        traitAverage: updated.mta,
                    };
                }
                return report;
            });

            const newSummaryGroups = [...navfitStore.summaryGroups];
            newSummaryGroups[groupIndex] = { ...group, reports: newReports };

            const newProjections = { ...navfitStore.projections };
            updatedMembers.forEach(m => {
                newProjections[m.id] = m.mta;
            });

            useNavfitStore.setState({
                summaryGroups: newSummaryGroups,
                projections: newProjections
            });
        }
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

        const params: StrategyParams = {
            ...constraints,
            targetRSCA
        };

        if (worker) {
            const input: WorkerInput = { members, anchors, params, requestId };
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

                const engineResult = redistributeMTA(effectiveMembers, constraints, targetRSCA);

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

    return {
        isCalculating: false,
        latestResult: {},
        error: null,
        worker: null,
        latestRequestId: null,

        initWorker: () => {
            if (typeof Worker !== 'undefined' && !get().worker) {
                // Use Vite's native worker import syntax
                const worker = new RedistributionWorker();

                worker.onmessage = (e: MessageEvent<WorkerOutput>) => {
                    const data = e.data;
                    const { latestRequestId } = get();

                    // Latest-only check
                    if (data.requestId !== latestRequestId) {
                        requestContexts.delete(data.requestId); // Cleanup old context
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
                };

                set({ worker });
            }
        },

        requestRedistribution: (groupId, members, constraints, targetRSCA) => {
            debouncedCalculate(groupId, members, constraints, targetRSCA);
        },

        getRedistributionResult: (groupId) => get().latestResult[groupId] || null,

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
                isAnchor: r.isLocked,
                anchorValue: r.traitAverage,
                name: `${r.firstName} ${r.lastName}`
            }));

            get().requestRedistribution(groupId, payloadMembers, constraints, navfitStore.rsConfig.targetRsca);
        },

        setAnchors: (groupId, anchorMap) => {
             const navfitStore = useNavfitStore.getState();
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
                isAnchor: r.isLocked,
                anchorValue: r.traitAverage,
                name: `${r.firstName} ${r.lastName}`
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
                isAnchor: r.isLocked,
                anchorValue: r.traitAverage,
                name: `${r.firstName} ${r.lastName}`
             }));
             get().requestRedistribution(groupId, payloadMembers, constraints, navfitStore.rsConfig.targetRsca);
        }
    };
});
