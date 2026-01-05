import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    ChevronLeft,
    ChevronRight,
    Lock,
    Unlock,
    TrendingUp,
    Minus,
    Plus,
    Edit,
    AlertCircle,
    Check,
    RotateCcw,
    RotateCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RankChangeModal } from './RankChangeModal';
import { ConfirmationModal } from './ConfirmationModal';
import { UnsavedChangesModal } from './UnsavedChangesModal';

import type { Report } from '@/types';
import type { RosterMember } from '@/types/roster';
import { checkQuota } from '@/features/strategy/logic/validation';
import { validateRecommendationAgainstTraits } from '@/domain/policy/validation';
import { PromotionRecommendation, type TraitGradeSet, type SummaryGroupContext } from '@/domain/policy/types';
import { useNavfitStore } from '@/store/useNavfitStore';

interface MemberDetailSidebarProps {
    memberId: string;
    onClose: () => void;
    onUpdateMTA: (memberId: string, newMta: number) => void;
    onUpdatePromRec: (memberId: string, rec: 'EP' | 'MP' | 'P' | 'Prog' | 'SP' | 'NOB') => void;
    onNavigateNext: () => void;
    onNavigatePrev: () => void;
    rosterMember: RosterMember;
    currentReport?: Report;

    rankContext?: {
        currentRank: number;
        nextRanks: { mta: number; rank: number }[];
        prevRanks: { mta: number; rank: number }[];
    };

    // New Props for Quota & Validation
    quotaContext?: {
        distribution: { EP: number; MP: number;[key: string]: number };
        totalReports: number;
    };
    groupContext?: SummaryGroupContext;
    groupId?: string; // Added for store actions
    isRankingMode?: boolean;
}

export function MemberDetailSidebar({
    memberId,
    onClose,
    onUpdateMTA,
    onUpdatePromRec,
    onNavigateNext,
    onNavigatePrev,
    rosterMember: _passedRosterMember,
    currentReport: _passedCurrentReport,
    rankContext,
    quotaContext,
    groupContext,
    groupId,
    isRankingMode = false
}: MemberDetailSidebarProps) {
    const { roster, toggleReportLock, summaryGroups } = useNavfitStore();

    // Source of Truth: Fetch directly from store if possible
    const rosterMember = roster.find(m => m.id === memberId) || _passedRosterMember;

    // Determine "Rank" label logic similar to CycleMemberList
    const isEnlisted = rosterMember.rank?.startsWith('E') ||
                       ['E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6', 'E-7', 'E-8', 'E-9'].includes(rosterMember.payGrade || '');

    // Fallback if needed
    const displayRank = isEnlisted ? rosterMember.rank : rosterMember.rank; // Title for Officer, Rating/Rank for Enlisted?
    const displaySubtext = isEnlisted
        ? (rosterMember.rank || rosterMember.payGrade)
        : (rosterMember.designator || rosterMember.rank);

    // Find latest report if we have a groupId, or fallback to passed report
    let currentReport = _passedCurrentReport;
    if (groupId) {
        const group = summaryGroups.find(g => g.id === groupId);
        const foundReport = group?.reports.find(r => r.memberId === memberId);
        if (foundReport) {
            currentReport = foundReport;
        }
    }

    // --- State Management ---
    const initialMta = currentReport?.traitAverage || 3.00;
    const initialRec = currentReport?.promotionRecommendation || 'P';

    const isLocked = currentReport?.isLocked || false;

    const [simulatedMta, setSimulatedMta] = useState<number>(initialMta);
    const [simulatedRec, setSimulatedRec] = useState<'EP' | 'MP' | 'P' | 'Prog' | 'SP' | 'NOB'>(initialRec);
    const [previousMta, setPreviousMta] = useState<number | null>(null);

    // History for Undo/Redo
    const [history, setHistory] = useState<{ mta: number; rec: string }[]>([]);
    const [future, setFuture] = useState<{ mta: number; rec: string }[]>([]);

    // Warning Modal State
    const [showWarning, setShowWarning] = useState(false);
    const [showCollisionWarning, setShowCollisionWarning] = useState(false);
    const [pendingMta, setPendingMta] = useState<number | null>(null);
    const [warningDirection, setWarningDirection] = useState<'up' | 'down'>('up');
    const [collisionNudge, setCollisionNudge] = useState<number | null>(null);

    // Unsaved Changes Modal State
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

    // Reset state when member changes
    useEffect(() => {
        setTimeout(() => {
            const mta = currentReport?.traitAverage || 3.00;
            setSimulatedMta(mta);
            setMtaInputValue(mta.toFixed(2)); // Init string value
            setSimulatedRec(currentReport?.promotionRecommendation || 'P');
            setPreviousMta(null);
            setShowWarning(false);
            setPendingMta(null);
            setShowCollisionWarning(false);
            setCollisionNudge(null);

            // Reset History
            setHistory([]);
            setFuture([]);
            setShowUnsavedModal(false);
            setPendingAction(null);
        }, 0);
    }, [memberId, currentReport]);

    // Local string state for input field to allow typing "3." without auto-formatting
    const [mtaInputValue, setMtaInputValue] = useState((currentReport?.traitAverage || 3.00).toFixed(2));
    const [isEditingMta, setIsEditingMta] = useState(false);

    // Sync input with simulatedMta when not editing (e.g. slider usage)
    useEffect(() => {
        if (!isEditingMta) {
            setMtaInputValue(simulatedMta.toFixed(2));
        }
    }, [simulatedMta, isEditingMta]);


    // --- History Logic ---
    const commitToHistory = () => {
        setHistory(prev => {
            const newHistory = [...prev, { mta: simulatedMta, rec: simulatedRec }];
            if (newHistory.length > 5) {
                newHistory.shift(); // Keep max 5
            }
            return newHistory;
        });
        setFuture([]); // Clear redo stack on new action
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const previousState = history[history.length - 1];

        // Push current to future
        setFuture(prev => [{ mta: simulatedMta, rec: simulatedRec }, ...prev]);

        // Restore previous
        setSimulatedMta(previousState.mta);
        setSimulatedRec(previousState.rec as any);
        setMtaInputValue(previousState.mta.toFixed(2)); // Sync input

        // Pop from history
        setHistory(prev => prev.slice(0, -1));
    };

    const handleRedo = () => {
        if (future.length === 0) return;
        const nextState = future[0];

        // Push current to history
        setHistory(prev => {
            const newHistory = [...prev, { mta: simulatedMta, rec: simulatedRec }];
            if (newHistory.length > 5) newHistory.shift();
            return newHistory;
        });

        // Restore next
        setSimulatedMta(nextState.mta);
        setSimulatedRec(nextState.rec as any);
        setMtaInputValue(nextState.mta.toFixed(2));

        // Pop from future
        setFuture(prev => prev.slice(1));
    };

    // --- Slider & Input Interaction Refs ---
    const dragStartMtaRef = useRef<number | null>(null);

    const handleSliderMouseDown = () => {
        dragStartMtaRef.current = simulatedMta;
    };

    const handleSliderMouseUp = () => {
        if (dragStartMtaRef.current !== null && Math.abs(dragStartMtaRef.current - simulatedMta) > 0.001) {
            setHistory(prev => {
                 const newHistory = [...prev, { mta: dragStartMtaRef.current!, rec: simulatedRec }];
                 if (newHistory.length > 5) newHistory.shift();
                 return newHistory;
            });
            setFuture([]);
        }
        dragStartMtaRef.current = null;
    };


    // --- Rank Change Logic ---
    const handleMtaChange = (newValue: number, isIntermediate = false) => {
        if (isLocked || simulatedRec === 'NOB') return;

        if (!isIntermediate) {
             commitToHistory();
        }

        // 1. Check for MTA Collision (Strict Uniqueness)
        const hasCollision =
            rankContext?.nextRanks.some(r => Math.abs(r.mta - newValue) < 0.001) ||
            rankContext?.prevRanks.some(r => Math.abs(r.mta - newValue) < 0.001);

        if (hasCollision) {
            let nudged = newValue - 0.01;
            setCollisionNudge(parseFloat(nudged.toFixed(2)));
            setPendingMta(newValue);
            setShowCollisionWarning(true);
            return;
        }

        // Check Upward Rank Change (Higher MTA > ANY Next Rank's MTA)
        const immediateNext = rankContext?.nextRanks?.[0];
        if (immediateNext && newValue > immediateNext.mta) {
            setPendingMta(newValue);
            setWarningDirection('up');
            setShowWarning(true);
            return;
        }

        // Check Downward Rank Change (Lower MTA < Prev Rank's MTA)
        const immediatePrev = rankContext?.prevRanks?.[0];
        if (immediatePrev && newValue < immediatePrev.mta) {
            setPendingMta(newValue);
            setWarningDirection('down');
            setShowWarning(true);
            return;
        }

        // If no crossing, just update
        setSimulatedMta(newValue);
    };

    const confirmMtaChange = () => {
        if (pendingMta !== null) {
            setSimulatedMta(pendingMta);
            setShowWarning(false);
            setPendingMta(null);
        }
    };

    const cancelMtaChange = () => {
        setShowWarning(false);
        setPendingMta(null);
        setShowCollisionWarning(false);
        setCollisionNudge(null);
    };

    const confirmCollision = () => {
        if (collisionNudge !== null) {
            setSimulatedMta(collisionNudge);
            setShowCollisionWarning(false);
            setCollisionNudge(null);
            setPendingMta(null);
        }
    };


    // --- Derived Metrics ---
    const historyData = (rosterMember.history || []).slice(-3); // Last 3 reports

    // --- Validation Logic (Blocking) ---
    const handleRecChange = (newRec: 'EP' | 'MP' | 'P' | 'Prog' | 'SP' | 'NOB') => {
        if (isLocked) return;
        const { blocked } = getBlockingStatus(newRec);
        if (blocked) return;

        commitToHistory();

        if (newRec === 'NOB') {
            if (simulatedRec !== 'NOB') {
                if (simulatedMta > 0) {
                    setPreviousMta(simulatedMta);
                }
                setSimulatedMta(0.00);
            }
        } else {
            if (simulatedRec === 'NOB') {
                if (previousMta !== null) {
                    setSimulatedMta(previousMta);
                } else {
                    setSimulatedMta(3.00);
                }
            }
        }
        setSimulatedRec(newRec);
    };

    const getBlockingStatus = (rec: string): { blocked: boolean; reason?: string } => {
        if (currentReport?.traitGrades) {
            let enumRec: PromotionRecommendation | null = null;
            switch (rec) {
                case 'EP': enumRec = PromotionRecommendation.EARLY_PROMOTE; break;
                case 'MP': enumRec = PromotionRecommendation.MUST_PROMOTE; break;
                case 'P': enumRec = PromotionRecommendation.PROMOTABLE; break;
                case 'Prog': enumRec = PromotionRecommendation.SIGNIFICANT_PROBLEMS; break;
                case 'SP': enumRec = PromotionRecommendation.SIGNIFICANT_PROBLEMS; break;
                case 'NOB': enumRec = PromotionRecommendation.NOB; break;
            }

            if (enumRec) {
                const violations = validateRecommendationAgainstTraits(
                    currentReport.traitGrades as TraitGradeSet,
                    enumRec,
                    {} as any
                );
                if (violations.length > 0) {
                    return { blocked: true, reason: violations[0].message };
                }
            }
        }

        if (isRankingMode && quotaContext && groupContext) {
            const { distribution, totalReports } = quotaContext;
            const currentAssignedRec = currentReport?.promotionRecommendation;

            if (currentAssignedRec === rec) return { blocked: false };

            let epCount = distribution.EP || 0;
            let mpCount = distribution.MP || 0;

            if (currentAssignedRec === 'EP') epCount--;
            if (currentAssignedRec === 'MP') mpCount--;

            if (rec === 'EP') epCount++;
            if (rec === 'MP') mpCount++;

            const effectiveContext = { ...groupContext, size: totalReports };

            const check = checkQuota(effectiveContext, epCount, mpCount);
            if (!check.isValid) {
                return { blocked: true, reason: check.message };
            }
        }

        return { blocked: false };
    };


    // --- Helpers ---
    const getRecStyle = (rec: string, isSelected: boolean, locked: boolean, blocked: boolean) => {
        if (blocked) return "text-slate-300 bg-slate-50 opacity-40 cursor-not-allowed border-transparent decoration-slice"; // Blocked style

        if (locked && !isSelected) return "text-slate-300 bg-slate-50 opacity-50 cursor-not-allowed border-transparent";
        if (locked && isSelected) return "bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed opacity-80";

        const base = "border transition-all duration-200";
        const selected = isSelected ? "shadow-md ring-1 ring-black/5 scale-[1.02] font-extrabold" : "opacity-60 hover:opacity-100 hover:shadow-sm bg-white";

        switch (rec) {
            case 'EP': return cn(base, selected, isSelected ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "text-emerald-700 border-emerald-100 hover:bg-emerald-50");
            case 'MP': return cn(base, selected, isSelected ? "bg-yellow-100 text-yellow-800 border-yellow-300" : "text-yellow-700 border-yellow-100 hover:bg-yellow-50");
            case 'P': return cn(base, selected, isSelected ? "bg-slate-100 text-slate-700 border-slate-300" : "text-slate-600 border-slate-100 hover:bg-slate-50");
            case 'Prog': return cn(base, selected, isSelected ? "bg-orange-100 text-orange-700 border-orange-300" : "text-orange-600 border-orange-100 hover:bg-orange-50");
            case 'SP': return cn(base, selected, isSelected ? "bg-red-100 text-red-700 border-red-300" : "text-red-600 border-red-100 hover:bg-red-50");
            case 'NOB': return cn(base, selected, isSelected ? "bg-gray-100 text-gray-500 border-gray-300" : "text-gray-500 border-gray-100 hover:bg-gray-50");
            default: return cn(base, selected, "bg-white border-slate-200 text-slate-500");
        }
    };

    const isDirty = Math.abs(simulatedMta - initialMta) > 0.001 || simulatedRec !== initialRec;

    const handleApply = () => {
        onUpdateMTA(memberId, simulatedMta);
        onUpdatePromRec(memberId, simulatedRec);

        // Clear history after apply
        setHistory([]);
        setFuture([]);
    };

    // Navigation Interception
    const checkUnsavedChanges = (action: () => void) => {
        if (isDirty) {
            setPendingAction(() => action);
            setShowUnsavedModal(true);
        } else {
            action();
        }
    };

    const handleUnsavedApply = () => {
        handleApply();
        setShowUnsavedModal(false);
        if (pendingAction) pendingAction();
    };

    const handleUnsavedDiscard = () => {
        // Reset to initial
        setSimulatedMta(initialMta);
        setSimulatedRec(initialRec as any);
        setHistory([]);
        setFuture([]);
        setShowUnsavedModal(false);
        if (pendingAction) pendingAction();
    };

    const handleUnsavedCancel = () => {
        setShowUnsavedModal(false);
        setPendingAction(null);
    };

    const handleMtaBlur = () => {
        setIsEditingMta(false);
        let val = parseFloat(mtaInputValue);
        if (isNaN(val)) val = simulatedMta;
        val = Math.max(3.00, Math.min(5.00, val));

        const formatted = val.toFixed(2);

        if (Math.abs(val - simulatedMta) > 0.001) {
             commitToHistory();
             setMtaInputValue(formatted);
             handleMtaChange(parseFloat(formatted));
        } else {
             setMtaInputValue(formatted);
        }
    };

    const handleMtaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    const handleMtaLocalChange = (strVal: string) => {
        setMtaInputValue(strVal);
        const floatVal = parseFloat(strVal);
        if (!isNaN(floatVal)) {
            handleMtaChange(floatVal, true);
        }
    };

    // Calculate Slider Positions (Scale 3.00 - 5.00)
    const getPercent = (val: number) => ((Math.max(3.0, Math.min(5.0, val)) - 3.0) / 2.0) * 100;

    return createPortal(
        <div className="flex flex-col h-full bg-white border-l border-slate-200 shadow-2xl w-[530px] fixed right-0 top-0 bottom-0 !z-[100] animate-in slide-in-from-right duration-300">

            {/* --- Header (Sticky) --- */}
            <div className="flex-none bg-white z-10 border-b border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => checkUnsavedChanges(onClose)}
                            className="p-1.5 -ml-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => checkUnsavedChanges(onNavigatePrev)}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 border border-slate-200 shadow-sm transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => checkUnsavedChanges(onNavigateNext)}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 border border-slate-200 shadow-sm transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            if (currentReport && groupId) {
                                toggleReportLock(groupId, currentReport.id);
                            }
                        }}
                        className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all shadow-sm active:scale-95 shrink-0",
                            isLocked
                                ? "bg-red-50 border-red-200 text-red-500 hover:bg-red-100 hover:border-red-300"
                                : "bg-white border-indigo-100 text-indigo-500 hover:border-indigo-200 hover:shadow-md ring-2 ring-indigo-500/10"
                        )}
                        title={isLocked ? "Unlock Editing" : "Lock Editing"}
                    >
                        {isLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
                    </button>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-0.5">
                                    {currentReport?.promotionStatus === 'FROCKED' && (
                                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded border border-amber-200">FROCKED</span>
                                    )}
                                    {currentReport?.isAdverse && (
                                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 rounded border border-red-200">ADVERSE</span>
                                    )}
                                    <h2 className="text-lg font-bold text-slate-900 leading-tight truncate">
                                        {rosterMember.lastName}, {rosterMember.firstName}
                                    </h2>
                                </div>
                                <div className="text-sm font-medium text-slate-500">
                                    {displayRank} {displaySubtext}
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                <button
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Edit Report Details"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>

                                <div className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 whitespace-nowrap">
                                    {currentReport?.reportsRemaining !== undefined
                                        ? `${currentReport.reportsRemaining} ${currentReport.reportsRemaining === 1 ? 'Report' : 'Reports'} Planned`
                                        : 'PRD Unknown'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Scrollable Content --- */}
            <div className="flex-1 overflow-y-auto">

                {/* --- Section A: The Trajectory --- */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 mt-2.5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 tracking-wider">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>Member Trajectory</span>
                        </div>
                    </div>

                    <div className="flex gap-4 h-28">
                        <div className="flex-1 bg-white rounded-lg border border-slate-200 p-2 relative">
                            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <line x1="0" y1="50" x2="100" y2="50" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 2" />
                                {historyData.length > 0 && (
                                    <polyline
                                        points={historyData.map((h, i) => {
                                            const x = (i / (Math.max(1, historyData.length - 1))) * 100;
                                            const y = 100 - ((h.traitAverage - 2.0) / 3.0 * 100);
                                            return `${x},${y}`;
                                        }).join(' ')}
                                        fill="none"
                                        stroke="#6366f1"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                )}
                                {historyData.length > 0 && (
                                    <circle
                                        cx="100"
                                        cy={100 - ((simulatedMta - 2.0) / 3.0 * 100)}
                                        r="3"
                                        fill="#6366f1"
                                        className="animate-pulse"
                                    />
                                )}
                            </svg>
                        </div>
                    </div>
                </div>

                {/* --- Section B: The Decision Engine --- */}
                <div className="p-5 space-y-6">

                    {/* Promotion Recommendation */}
                    <div className="space-y-3 mb-6">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Recommendation</label>
                        <div className="flex gap-1 p-0.5 rounded-lg">
                            {(['NOB', 'SP', 'Prog', 'P', 'MP', 'EP'] as const).map((rec) => {
                                const { blocked, reason } = getBlockingStatus(rec);

                                return (
                                    <div key={rec} className="flex-1 relative group/tooltip">
                                        <button
                                            onClick={() => handleRecChange(rec)}
                                            disabled={isLocked || blocked}
                                            className={cn(
                                                "w-full py-1.5 text-xs font-bold rounded-md transition-all",
                                                getRecStyle(rec, simulatedRec === rec, isLocked, blocked)
                                            )}
                                        >
                                            {rec === 'Prog' ? 'PR' : rec}
                                        </button>

                                        {/* Inline Reason / Tooltip for Blocked Actions */}
                                        {blocked && (
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] z-50 hidden group-hover/tooltip:block animate-in fade-in slide-in-from-bottom-1">
                                                <div className="bg-slate-800 text-white text-[10px] rounded px-2 py-1.5 shadow-lg relative">
                                                    <div className="flex items-start gap-1.5">
                                                        <AlertCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                                                        <span className="font-medium">{reason}</span>
                                                    </div>
                                                    {/* Arrow */}
                                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Trait Average Tuner */}
                    <div className="space-y-4">
                        <div className="flex items-end justify-between">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                    Trait Average Adjustment
                                </label>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                <input
                                    type="text"
                                    value={mtaInputValue}
                                    onChange={(e) => handleMtaLocalChange(e.target.value)}
                                    onFocus={() => setIsEditingMta(true)}
                                    onBlur={handleMtaBlur}
                                    onKeyDown={handleMtaKeyDown}
                                    disabled={isLocked || simulatedRec === 'NOB'}
                                    className="w-24 text-right text-2xl font-black text-slate-900 bg-transparent border-b-2 border-slate-200 focus:border-indigo-500 focus:outline-none p-0 focus:ring-0 disabled:opacity-50 font-mono"
                                />
                            </div>
                        </div>

                        {/* Robust Slider Control */}
                        <div className="flex items-center gap-3 mt-8">
                            <button
                                onClick={() => handleMtaChange(Math.max(3.00, simulatedMta - 0.01))}
                                disabled={isLocked || simulatedMta <= 3.00 || simulatedRec === 'NOB'}
                                className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all disabled:opacity-30 disabled:pointer-events-none"
                            >
                                <Minus className="w-4 h-4" />
                            </button>

                            <div className="relative flex-1 h-8 flex items-center group touch-none select-none">
                                <div className="absolute left-0 right-0 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                    <div
                                        className={cn(
                                            "h-full transition-all duration-75",
                                            isLocked || simulatedRec === 'NOB' ? "bg-slate-300" : "bg-indigo-500"
                                        )}
                                        style={{ width: `${getPercent(simulatedMta)}%` }}
                                    />
                                </div>

                                {/* Slider Track Markers... (omitted for brevity, unchanged) */}
                                {(() => {
                                    // Simplified markers render for clarity in diff, reusing existing logic
                                    const next = rankContext?.nextRanks?.[0]?.mta;
                                    const prev = rankContext?.prevRanks?.[0]?.mta;

                                    if (next !== undefined && prev !== undefined) {
                                        const start = Math.max(3.0, Math.min(next, prev));
                                        const end = Math.min(5.0, Math.max(next, prev));

                                        if (end < 3.0 || start > 5.0) return null;
                                        const leftStart = getPercent(start);
                                        const width = getPercent(end) - leftStart;
                                        return (
                                            <div
                                                className="absolute top-1/2 -translate-y-1/2 h-4 bg-emerald-50/80 border-x border-emerald-100 z-0 pointer-events-none"
                                                style={{ left: `${leftStart}%`, width: `${width}%` }}
                                            />
                                        );
                                    }
                                    return null;
                                })()}


                                {[3.0, 3.5, 4.0, 4.5, 5.0].map(val => (
                                    <div key={val} className="absolute inset-0 pointer-events-none z-0">
                                        <div
                                            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-slate-200"
                                            style={{ left: `${getPercent(val)}%` }}
                                        />
                                        <div
                                            className="absolute top-6 -translate-x-1/2 text-xs font-bold text-slate-300"
                                            style={{ left: `${getPercent(val)}%` }}
                                        >
                                            {val.toFixed(1)}
                                        </div>
                                    </div>
                                ))}


                                {initialMta >= 3.0 && initialMta <= 5.0 && (
                                    <div
                                        className="absolute top-1/2 -translate-y-1/2 w-1.5 h-4 bg-slate-200/50 rounded-sm pointer-events-none z-0"
                                        style={{ left: `${getPercent(initialMta)}%` }}
                                        title={`Initial: ${initialMta.toFixed(2)}`}
                                    />
                                )}

                                {(() => {
                                    if (!rankContext?.nextRanks && !rankContext?.prevRanks) return null;
                                    const next = rankContext?.nextRanks || [];
                                    const prev = rankContext?.prevRanks || [];
                                    const allMarkers = [
                                        ...next.map(r => ({ ...r, type: 'next' as const })),
                                        ...prev.map(r => ({ ...r, type: 'prev' as const }))
                                    ].sort((a, b) => a.rank - b.rank);
                                    const positionedMarkers: (typeof allMarkers[0] & { pct: number; level: number })[] = [];
                                    allMarkers.forEach((marker, i) => {
                                        const pct = getPercent(marker.mta);
                                        let level = 0;
                                        for (let j = 0; j < i; j++) {
                                            const other = positionedMarkers[j];
                                            if (Math.abs(pct - other.pct) < 4.0) {
                                                level = Math.max(level, other.level + 1);
                                            }
                                        }
                                        positionedMarkers.push({ ...marker, pct, level });
                                    });

                                    return positionedMarkers.map((marker) => {
                                        if (marker.mta < 3.0 || marker.mta > 5.0) return null;
                                        const isNext = marker.type === 'next';
                                        const colorClass = isNext ? "text-emerald-700 border-emerald-100/50" : "text-red-700 border-red-100/50";
                                        const lineColor = isNext ? "bg-emerald-400/40" : "bg-red-400/40";
                                        const verticalShift = marker.level * 24;
                                        return (
                                            <div
                                                key={`${marker.type}-${marker.rank}`}
                                                className="absolute z-10 pointer-events-none flex flex-col items-center gap-1 transition-all duration-300"
                                                style={{ left: `${marker.pct}%`, transform: 'translateX(-50%)', top: '50%', }}
                                            >
                                                <div className={cn("w-0.5 transition-all opacity-70", lineColor)} style={{ height: `${32 + verticalShift}px` }} />
                                                <span className={cn("text-[10px] font-black uppercase tracking-widest whitespace-nowrap bg-white/80 px-1 rounded backdrop-blur-sm shadow-sm border -mt-1", colorClass)}>
                                                    #{marker.rank}
                                                </span>
                                            </div>
                                        );
                                    });
                                })()}

                                <input
                                    type="range"
                                    min="3.00"
                                    max="5.00"
                                    step="0.01"
                                    value={simulatedMta}
                                    onMouseDown={handleSliderMouseDown}
                                    onMouseUp={handleSliderMouseUp}
                                    onTouchStart={handleSliderMouseDown}
                                    onTouchEnd={handleSliderMouseUp}
                                    onChange={(e) => handleMtaChange(parseFloat(e.target.value), true)}
                                    disabled={isLocked || simulatedRec === 'NOB'}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-grab active:cursor-grabbing z-20 disabled:cursor-not-allowed"
                                />

                                <div
                                    className={cn(
                                        "absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 rounded-full shadow-md pointer-events-none z-10 transition-transform duration-75 ease-out flex items-center justify-center",
                                        isLocked || simulatedRec === 'NOB' ? "border-slate-300" : "border-indigo-600 scale-100 group-hover:scale-110"
                                    )}
                                    style={{ left: `calc(${getPercent(simulatedMta)}% - 10px)` }}
                                >
                                    <div className={cn("w-1.5 h-1.5 rounded-full", isLocked || simulatedRec === 'NOB' ? "bg-slate-300" : "bg-indigo-600")} />
                                </div>
                            </div>

                            <button
                                onClick={() => handleMtaChange(Math.min(5.00, simulatedMta + 0.01))}
                                disabled={isLocked || simulatedMta >= 5.00 || simulatedRec === 'NOB'}
                                className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all disabled:opacity-30 disabled:pointer-events-none"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mb-20"></div>
            </div>

            {/* --- Footer (Sticky) --- */}
            <div className="flex-none absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-3">

                    {/* Undo / Redo */}
                    <div className="flex items-center gap-1">
                        {(isDirty || history.length > 0) && (
                            <button
                                onClick={handleUndo}
                                disabled={history.length === 0}
                                className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                title="Undo"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        )}
                        {(future.length > 0) && (
                            <button
                                onClick={handleRedo}
                                disabled={future.length === 0}
                                className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                title="Redo"
                            >
                                <RotateCw className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex-1" />

                    {/* Apply Changes (Only if dirty) */}
                    {!isLocked && isDirty && (
                        <button
                            onClick={handleApply}
                            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg active:transform active:scale-[0.98] transition-all flex items-center gap-2"
                        >
                            <Check className="w-4 h-4" />
                            Apply
                        </button>
                    )}

                    {/* Close (Always Visible) */}
                    <button
                        onClick={() => checkUnsavedChanges(onClose)}
                        className="px-6 py-2.5 bg-white text-slate-700 text-sm font-bold rounded-lg border border-slate-300 hover:bg-slate-50 shadow-sm transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>

            <RankChangeModal
                isOpen={showWarning}
                onClose={cancelMtaChange}
                onConfirm={confirmMtaChange}
                direction={warningDirection}
                currentRank={rankContext?.currentRank || 0}
                newRank={(rankContext?.currentRank || 0) + (warningDirection === 'up' ? -1 : 1)}
                memberName={`${rosterMember.firstName} ${rosterMember.lastName}`}
            />

            <ConfirmationModal
                isOpen={showCollisionWarning}
                onClose={cancelMtaChange}
                onConfirm={confirmCollision}
                title="MTA Value Conflict"
                description={`The value ${pendingMta?.toFixed(2)} is already assigned to another member. To maintain strict rank ordering, would you like to use ${collisionNudge?.toFixed(2)} instead?`}
                confirmText={`Use ${collisionNudge?.toFixed(2)}`}
                cancelText="Cancel"
                variant="neutral"
            />

            <UnsavedChangesModal
                isOpen={showUnsavedModal}
                onApply={handleUnsavedApply}
                onDiscard={handleUnsavedDiscard}
                onCancel={handleUnsavedCancel}
            />

        </div>
        , document.body);
}
