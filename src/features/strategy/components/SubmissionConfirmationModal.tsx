import { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Lock, ArrowRight, ShieldAlert } from 'lucide-react';
import type { RedistributionResult } from '@/domain/rsca/types';
import { useRedistributionStore } from '@/store/useRedistributionStore';
import { useNavfitStore } from '@/store/useNavfitStore';

interface SubmissionConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    groupId: string;
    result: RedistributionResult;
}

export function SubmissionConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    groupId,
    result
}: SubmissionConfirmationModalProps) {
    const { setAnchorMTA } = useRedistributionStore();
    const { roster } = useNavfitStore();
    const [isApplying, setIsApplying] = useState<string | null>(null);

    if (!isOpen) return null;

    const getMemberName = (id: string) => {
        const m = roster.find(r => r.id === id);
        return m ? `${m.lastName}, ${m.firstName}` : id;
    };

    const handleOverride = (memberId: string, value: number) => {
        setIsApplying(memberId);
        // Apply the anchor
        setAnchorMTA(groupId, memberId, value);
        // We close the modal because a re-calculation will be triggered
        setTimeout(() => {
            onClose();
        }, 500);
    };

    // Determine State
    const isInfeasible = !result.isFeasible;
    const hasAdjustments = result.changedMembers.length > 0;
    const infeasibilityReport = result.infeasibilityReport;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className={`px-6 py-4 border-b flex justify-between items-center sticky top-0 ${isInfeasible ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                        {isInfeasible ? (
                            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                <ShieldAlert className="w-6 h-6" />
                            </div>
                        ) : (
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                        )}
                        <div>
                            <h2 className={`text-lg font-bold ${isInfeasible ? 'text-red-900' : 'text-slate-800'}`}>
                                {isInfeasible ? 'Strategy Infeasible' : 'Confirm Strategy Submission'}
                            </h2>
                            <p className={`text-sm ${isInfeasible ? 'text-red-700' : 'text-slate-500'}`}>
                                {isInfeasible
                                    ? 'The current configuration cannot meet all constraints.'
                                    : 'Please review system-generated adjustments before submitting.'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {isInfeasible && infeasibilityReport && (
                        <div className="space-y-4">
                            <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-800 space-y-2">
                                <p className="font-semibold flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Constraint Violation Detected
                                </p>
                                <p>
                                    The target RSCA band [{infeasibilityReport.targetBand[0].toFixed(2)} - {infeasibilityReport.targetBand[1].toFixed(2)}]
                                    is not achievable with the current anchors and constraints.
                                </p>
                                <p className="text-red-700">
                                    Achievable Range: <span className="font-mono font-bold">{infeasibilityReport.meanMin.toFixed(2)} - {infeasibilityReport.meanMax.toFixed(2)}</span>
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Suggested Overrides</h3>
                                <p className="text-xs text-slate-500">
                                    The system identified the following adjustments that could resolve the conflict.
                                    Click "Lock" to accept a value as a fixed anchor and recalculate.
                                </p>

                                <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                                    {infeasibilityReport.minimalAdjustments?.map((adj) => (
                                        <div key={adj.memberId} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-700">{getMemberName(adj.memberId)}</span>
                                                <span className="text-xs text-slate-500">Suggested Value</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm font-mono font-bold text-indigo-600">{adj.suggestedValue.toFixed(2)}</span>
                                                <button
                                                    onClick={() => handleOverride(adj.memberId, adj.suggestedValue)}
                                                    disabled={!!isApplying}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 text-slate-600 text-xs font-semibold rounded-md transition-all shadow-sm"
                                                >
                                                    {isApplying === adj.memberId ? 'Applying...' : (
                                                        <>
                                                            <Lock className="w-3 h-3" />
                                                            Override & Lock
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {(infeasibilityReport.minimalAdjustments?.length ?? 0) === 0 && (
                                        <div className="p-4 text-center text-sm text-slate-400 italic">
                                            No specific single-member adjustments found. Try relaxing global constraints.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {!isInfeasible && (
                        <div className="space-y-4">
                            {hasAdjustments ? (
                                <>
                                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-900">
                                        <p className="font-semibold flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4" />
                                            System Optimized
                                        </p>
                                        <p className="mt-1">
                                            The strategy is feasible. The system automatically adjusted <strong>{result.changedMembers.length}</strong> member(s) to satisfy monotonicity and RSCA constraints.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">System Generated Adjustments</h3>
                                        <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                                            {result.changedMembers.map((change) => (
                                                <div key={change.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-700">{getMemberName(change.id)}</div>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                            <span className="line-through text-slate-400">{change.oldMta.toFixed(2)}</span>
                                                            <ArrowRight className="w-3 h-3 text-slate-300" />
                                                            <span className="font-mono font-medium text-indigo-600">{change.newMta.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleOverride(change.id, change.newMta)}
                                                        disabled={!!isApplying}
                                                        className="text-xs text-slate-400 hover:text-indigo-600 underline decoration-dotted underline-offset-2"
                                                        title="Lock this value as an anchor"
                                                    >
                                                        Lock Value
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="py-8 text-center space-y-3">
                                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                                        <CheckCircle className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-900">No Adjustments Needed</h3>
                                    <p className="text-sm text-slate-500 max-w-xs mx-auto">
                                        Your manual inputs perfectly satisfy all RSCA constraints.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        {isInfeasible ? 'Close' : 'Cancel'}
                    </button>
                    {!isInfeasible && (
                        <button
                            onClick={onConfirm}
                            className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-all"
                        >
                            Confirm & Submit
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
