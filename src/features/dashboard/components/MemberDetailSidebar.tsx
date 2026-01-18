import { useState, useEffect, useRef } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Lock,
    Unlock,
    TrendingUp,
    Minus,
    Plus,
    AlertCircle,
    Check,
    RotateCcw,
    RotateCw,
    Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
    onPreviewMTA?: (memberId: string, newMta: number) => void; // Real-time preview callback
    onUpdatePromRec: (memberId: string, rec: 'EP' | 'MP' | 'P' | 'Prog' | 'SP' | 'NOB') => void;
    onNavigateNext: () => void;
    onNavigatePrev: () => void;
    rosterMember?: RosterMember;
    currentReport?: Report;
    currentRsca?: number;

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
}

export function MemberDetailSidebar({
    memberId,
    onClose,
    onUpdateMTA,
    onPreviewMTA,
    onUpdatePromRec,
    onNavigateNext,
    onNavigatePrev,
    rosterMember: _passedRosterMember,
    currentReport: _passedCurrentReport,
    currentRsca,
    rankContext,
    quotaContext,
    groupContext,
    groupId
}: MemberDetailSidebarProps) {
    const { roster, toggleReportLock, summaryGroups } = useNavfitStore();

    // Source of Truth: Fetch directly from store if possible
    const rosterMember = roster.find(m => m.id === memberId) || _passedRosterMember;

    // Early return if no roster member found
    if (!rosterMember) {
        return null;
    }

    // Determine "Rank" label logic similar to CycleMemberList
    const isEnlisted = rosterMember.rank?.startsWith('E') ||
        ['E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6', 'E-7', 'E-8', 'E-9'].includes(rosterMember.payGrade || '');

    // Fallback if needed
    const displayRank = (isEnlisted && rosterMember.designator && rosterMember.designator !== '0000')
        ? rosterMember.designator
        : rosterMember.rank;
    const displaySubtext = isEnlisted
        ? `| ${rosterMember.component || 'Active'}`
        : (rosterMember.designator || '');

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

        // Robust check for invalid state
        if (!previousState || typeof previousState.mta !== 'number') {
            console.error('Invalid history state encountered:', previousState);
            // Recover by clearing history or ignoring
            setHistory(prev => prev.slice(0, -1));
            return;
        }

        // Push current to future
        setFuture(prev => [{ mta: simulatedMta, rec: simulatedRec }, ...prev]);

        // Restore previous
        setSimulatedMta(previousState.mta);
        if (previousState.rec) {
            setSimulatedRec(previousState.rec as 'EP' | 'MP' | 'P' | 'Prog' | 'SP' | 'NOB');
        }
        setMtaInputValue(previousState.mta.toFixed(2)); // Sync input

        // Pop from history
        setHistory(prev => prev.slice(0, -1));
    };

    const handleRedo = () => {
        if (future.length === 0) return;
        const nextState = future[0];

        // Robust check
        if (!nextState || typeof nextState.mta !== 'number') {
            console.error('Invalid future state encountered:', nextState);
            setFuture(prev => prev.slice(1));
            return;
        }

        // Push current to history
        setHistory(prev => {
            const newHistory = [...prev, { mta: simulatedMta, rec: simulatedRec }];
            if (newHistory.length > 5) newHistory.shift();
            return newHistory;
        });

        // Restore next
        setSimulatedMta(nextState.mta);
        if (nextState.rec) {
            setSimulatedRec(nextState.rec as 'EP' | 'MP' | 'P' | 'Prog' | 'SP' | 'NOB');
        }
        setMtaInputValue(nextState.mta.toFixed(2));

        // Pop from future
        setFuture(prev => prev.slice(1));
    };

    // --- Slider & Input Interaction Refs ---
    // --- Input Interaction Refs ---
    const mtaFocusRef = useRef<number | null>(null);


    const isDirty = Math.abs(simulatedMta - initialMta) > 0.001 || simulatedRec !== initialRec;

    // --- ESC Key Handler: Cancels changes and closes ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                // Reset to initial values (discard changes)
                setSimulatedMta(initialMta);
                setSimulatedRec(initialRec as 'EP' | 'MP' | 'P' | 'Prog' | 'SP' | 'NOB');
                setMtaInputValue(initialMta.toFixed(2));
                setHistory([]);
                setFuture([]);
                // Close the pane
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose, initialMta, initialRec]);



    // --- Rank Change Logic ---
    const handleMtaChange = (newValue: number, isIntermediate = false) => {
        if (isLocked || simulatedRec === 'NOB') return;

        // Real-time preview: ALWAYS propagate to parent for rank/rec preview updates
        // This must happen for ALL changes (slider, +/-, input) to keep UI synchronized
        if (onPreviewMTA) {
            onPreviewMTA(memberId, newValue);
        }

        if (!isIntermediate) {
            commitToHistory();
        }

        // Directly update without warning
        setSimulatedMta(newValue);
    };




    // --- Derived Metrics ---


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

        if (quotaContext && groupContext) {
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

    const handleApply = () => {
        onUpdateMTA(memberId, simulatedMta);
        onUpdatePromRec(memberId, simulatedRec);

        // Clear history after apply
        setHistory([]);
        setFuture([]);

        // Do NOT close the sidebar - keep it open after applying changes
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

        // Check against focus ref for history
        if (mtaFocusRef.current !== null && Math.abs(mtaFocusRef.current - val) > 0.001) {
            setHistory(prev => {
                const newHistory = [...prev, { mta: mtaFocusRef.current!, rec: simulatedRec }];
                if (newHistory.length > 5) newHistory.shift();
                return newHistory;
            });
            setFuture([]);
        }

        mtaFocusRef.current = null; // Reset

        // We already have the current value, so just sync input
        if (Math.abs(val - simulatedMta) > 0.001) {
            setMtaInputValue(formatted);
            handleMtaChange(parseFloat(formatted), false); // Commit not needed here as we did manual history above, but keep false for consistency? logic check
            // Actually, handleMtaChange(..., false) calls commitToHistory(), which uses current state.
            // But we just manually pushed the OLD state. calling handleMtaChange(..., false) would push the NEW state as "old"?
            // No, commitToHistory pushes CURRENT state (simulatedMta).
            // But wait, simulatedMta has been updating LIVE via handleMtaLocalChange (isIntermediate=true).
            // So simulatedMta is ALREADY `val`.
            // So commitToHistory() would push `val`.
            // We want to push `mtaFocusRef.current`.
            // So we should NOT call handleMtaChange(..., false). We should call it with TRUE to avoid double commit, verify collision?
            // Actually, we just need to ensuer final value is set. handleMtaChange logic:
            // if (!isIntermediate) commitToHistory().

            // WE handled history manually. So pass true.
            handleMtaChange(parseFloat(formatted), true);
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
        }
    };

    // --- Sliding Window Logic (Zoomed Slider) ---
    // The visual window is always 1.0 points wide.
    // It centers on the current MTA, but clamps to [3.0, 4.0] and [4.0, 5.0] at edges.
    const windowSize = 1.0;
    const windowStart = Math.min(Math.max(3.0, simulatedMta - 0.5), 4.0);
    // Helper to map a value to its % position within the VISIBLE window
    const getViewPercent = (val: number) => {
        const pct = ((val - windowStart) / windowSize) * 100;
        return Math.max(0, Math.min(100, pct)); // Clamp visual %
    };

    const sliderRef = useRef<HTMLDivElement>(null);

    const updateFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!sliderRef.current) return;
        const rect = sliderRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const pct = x / rect.width; // 0..1 within the visual window

        // Value = windowStart + offset
        const newValue = windowStart + (pct * windowSize);
        handleMtaChange(newValue, true); // Intermediate update
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (isLocked || simulatedRec === 'NOB') return;
        e.currentTarget.setPointerCapture(e.pointerId);
        updateFromPointer(e);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (isLocked || simulatedRec === 'NOB') return;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            updateFromPointer(e);
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (isLocked || simulatedRec === 'NOB') return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        commitToHistory(); // Commit final value
    };



    return (
        <div className="flex flex-col h-full bg-slate-50/80 border-l border-slate-200 shadow-2xl w-sidebar-standard shrink-0 animate-in slide-in-from-right duration-300">

            {/* --- Header (Sticky) --- */}
            <div className="flex-none bg-white z-10 border-b border-slate-100 px-5 py-4 shadow-[0_4px_12px_-6px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        {currentReport?.promotionStatus === 'FROCKED' && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 rounded border border-amber-200 tracking-wider">FROCKED</span>
                        )}
                        {currentReport?.isAdverse && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-50 text-red-700 rounded border border-red-200 tracking-wider">ADVERSE</span>
                        )}
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
                            "w-11 h-11 rounded-full flex items-center justify-center border transition-all shadow-sm active:scale-95 shrink-0",
                            isLocked
                                ? "bg-red-50 border-red-100 text-red-500 hover:bg-red-100 hover:border-red-200"
                                : "bg-white border-slate-200 text-slate-400 hover:border-indigo-200 hover:text-indigo-500 hover:shadow-md"
                        )}
                        title={isLocked ? "Unlock Editing" : "Lock Editing"}
                    >
                        {isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                    </button>

                    <div className="flex-1 min-w-0">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-black text-slate-800 leading-tight truncate tracking-tight">
                                {rosterMember.lastName}, {rosterMember.firstName}
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-sm font-bold text-slate-500 bg-slate-100 px-1.5 rounded">
                                    {displayRank}
                                </span>
                                <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
                                    {displaySubtext.replace('|', '').trim()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => checkUnsavedChanges(onNavigatePrev)}
                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white bg-slate-50 text-slate-400 hover:text-indigo-600 border border-transparent hover:border-slate-200 hover:shadow-sm transition-all active:scale-95"
                            title="Previous Member"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                            onClick={() => checkUnsavedChanges(onNavigateNext)}
                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white bg-slate-50 text-slate-400 hover:text-indigo-600 border border-transparent hover:border-slate-200 hover:shadow-sm transition-all active:scale-95"
                            title="Next Member"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>

            {/* --- Scrollable Content --- */}
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">

                {/* --- Card 1: Promotion Recommendation --- */}
                <div className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-slate-100/50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 tracking-wider">
                            <TrendingUp className="w-4 h-4 text-slate-300" />
                            <span>Recommendation</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {(['EP', 'MP', 'P', 'Prog', 'SP', 'NOB'] as const).map((rec) => {
                            const { blocked, reason } = getBlockingStatus(rec);
                            const isSelected = simulatedRec === rec;

                            return (
                                <div key={rec} className="relative group/tooltip">
                                    <button
                                        onClick={() => handleRecChange(rec)}
                                        disabled={isLocked || blocked}
                                        className={cn(
                                            "w-full py-3 px-1 rounded-xl text-sm font-bold transition-all duration-200 flex flex-col items-center gap-1 border-2",
                                            getRecStyle(rec, isSelected, isLocked, blocked),
                                            isSelected ? "z-10" : "hover:scale-[1.02] hover:z-10"
                                        )}
                                    >
                                        <span>{rec === 'Prog' ? 'PR' : rec}</span>
                                    </button>

                                    {blocked && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] z-50 hidden group-hover/tooltip:block animate-in fade-in slide-in-from-bottom-1">
                                            <div className="bg-slate-800 text-white text-[10px] rounded-lg px-3 py-2 shadow-xl relative backdrop-blur-md">
                                                <div className="flex items-start gap-2">
                                                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                                                    <span className="font-medium leading-normal">{reason}</span>
                                                </div>
                                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 rotate-45" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* --- Unified Card: Performance & Trajectory --- */}
                <div className="bg-white rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-slate-100/50 relative overflow-hidden group/card">

                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

                    {/* Header */}
                    <div className="relative z-10 p-5 pb-0 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 tracking-wider">
                            <Sparkles className="w-4 h-4 text-slate-300" />
                            <span>Performance & Trajectory</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={handleUndo} disabled={history.length === 0} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-20"><RotateCcw className="w-3.5 h-3.5" /></button>
                            <button onClick={handleRedo} disabled={future.length === 0} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-20"><RotateCw className="w-3.5 h-3.5" /></button>
                        </div>
                    </div>

                    {/* --- Trajectory Chart (Top) --- */}
                    <div className="relative z-0 mt-8 h-48 w-full">
                        {/* Container for Chart */}
                        <div className="absolute inset-x-0 bottom-0 top-0 flex items-end px-4">
                            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                                {/* Optional: Add a subtle path line here if desired, otherwise just points */}
                            </svg>
                            {/* HTML Overlay for Points */}
                            <div className="absolute inset-0 pointer-events-none">
                                {(() => {
                                    // Helper to format date "DD MMM YY"
                                    const formatDate = (dateStr?: string) => {
                                        if (!dateStr) return '';
                                        const d = new Date(dateStr);
                                        if (isNaN(d.getTime())) return '';
                                        const day = d.getDate().toString().padStart(2, '0');
                                        const mon = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                                        const yr = d.getFullYear().toString().slice(-2);
                                        return `${day} ${mon} ${yr}`;
                                    };

                                    const pastPoints = (rosterMember.history || []).map(h => ({
                                        type: 'Past',
                                        val: h.traitAverage,
                                        rsca: h.rscaAtTime,
                                        label: h.promotionRecommendation,
                                        date: h.periodEndDate,
                                        groupSize: undefined,
                                        isVoid: false
                                    }));

                                    const currentPoint = {
                                        type: 'Current',
                                        val: simulatedMta,
                                        rsca: currentRsca,
                                        label: simulatedRec,
                                        date: currentReport?.periodEndDate,
                                        groupSize: quotaContext?.totalReports, // Only for current
                                        isVoid: false
                                    };

                                    let plannedCount = currentReport?.reportsRemaining || 0;
                                    if (!plannedCount && rosterMember.prd && currentReport?.periodEndDate) {
                                        const prdYear = new Date(rosterMember.prd).getFullYear();
                                        const reportYear = new Date(currentReport.periodEndDate).getFullYear();
                                        if (!isNaN(prdYear) && !isNaN(reportYear)) plannedCount = Math.max(0, prdYear - reportYear);
                                    }

                                    const plannedPoints = Array.from({ length: plannedCount || 0 }).map((_, i) => ({
                                        type: (i === (plannedCount || 0) - 1) ? 'Transfer' : 'Planned',
                                        val: simulatedMta, // In real app this might be projected
                                        rsca: currentRsca,
                                        label: (i === (plannedCount || 0) - 1) ? 'PRD' : 'Plan',
                                        date: undefined,
                                        groupSize: undefined,
                                        isVoid: true
                                    }));

                                    const allPoints = [...pastPoints.slice(-3), currentPoint, ...plannedPoints];

                                    const allMtas = allPoints.map(p => p.val);
                                    const allRscas = allPoints.map(p => p.rsca).filter((r): r is number => r !== undefined);
                                    const allValues = [...allMtas, ...allRscas];
                                    const minVal = allValues.length ? Math.min(...allValues) : 3.0;
                                    const maxVal = allValues.length ? Math.max(...allValues) : 5.0;
                                    let range = maxVal - minVal; if (range < 0.2) range = 0.2;
                                    const margin = range * 0.40; // More headroom for labels
                                    const domainMin = Math.max(0, minVal - margin);
                                    const domainMax = Math.min(5.0, maxVal + margin);
                                    const domainRange = domainMax - domainMin || 1;
                                    const getY = (val: number) => 100 - ((val - domainMin) / domainRange * 100);

                                    // Distribute X evenly
                                    const maxIdx = Math.max(1, allPoints.length - 1);
                                    const getX = (i: number) => 10 + (i / maxIdx) * 80;

                                    return allPoints.map((p, i) => {
                                        const x = getX(i);
                                        const y = getY(p.val);
                                        const isTransfer = p.type === 'Transfer';
                                        const isCurrent = p.type === 'Current';

                                        // Calculate Delta from previous point if available
                                        const prevPoint = i > 0 ? allPoints[i - 1] : null;
                                        let deltaLabel = null;
                                        if (prevPoint) {
                                            const diff = p.val - prevPoint.val;
                                            const sign = diff > 0 ? '+' : '';
                                            const colorClass = diff > 0 ? 'text-emerald-600' : (diff < 0 ? 'text-red-500' : 'text-slate-400');
                                            deltaLabel = (
                                                <span className={cn("text-[10px] font-bold bg-white/80 px-1 rounded backdrop-blur-sm", colorClass)}>
                                                    {sign}{diff.toFixed(2)}
                                                </span>
                                            );
                                        }

                                        return (
                                            <div key={i} className="absolute flex flex-col items-center justify-center group/point transition-all duration-300 ease-out z-10" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>

                                                {/* Date Label (Top) */}
                                                {p.date && (
                                                    <div className="absolute bottom-full mb-3 text-[10px] font-semibold text-slate-400 whitespace-nowrap tracking-tight uppercase">
                                                        {formatDate(p.date)}
                                                    </div>
                                                )}

                                                {/* Connecting Line Label (Delta) - Positioned halfway to left? No, simpler to just float left of point */}
                                                {deltaLabel && (
                                                    <div className="absolute right-full mr-3 -mt-4 pointer-events-none opacity-80">
                                                        {deltaLabel}
                                                    </div>
                                                )}

                                                <div className={cn(
                                                    "rounded-full border-2 shadow-sm flex items-center justify-center transition-all bg-white z-20 relative",
                                                    isTransfer ? "border-red-500 bg-red-50 w-8 h-8" : "border-indigo-400 bg-indigo-50 w-8 h-8 text-indigo-700 font-bold text-[10px]",
                                                    isCurrent ? "w-14 h-14 border-[4px] ring-4 ring-indigo-500/10 border-indigo-600 bg-white opacity-100 scale-105 shadow-xl" : "opacity-80"
                                                )}>
                                                    {/* Group Size Center Label */}
                                                    {p.groupSize ? <span>{p.groupSize}</span> : (p.type === 'Past' ? <span className="opacity-30 text-[9px]">-</span> : null)}
                                                </div>

                                                {/* MTA Label */}
                                                {isCurrent ? (
                                                    // Hero Input Overlay for Current
                                                    <div className="absolute top-full mt-3 pointer-events-auto">
                                                        <div className="relative group/input flex flex-col items-center">
                                                            <input
                                                                type="text"
                                                                value={mtaInputValue}
                                                                onChange={(e) => handleMtaLocalChange(e.target.value)}
                                                                onFocus={() => {
                                                                    setIsEditingMta(true);
                                                                    mtaFocusRef.current = simulatedMta;
                                                                }}
                                                                onBlur={handleMtaBlur}
                                                                onKeyDown={handleMtaKeyDown}
                                                                disabled={isLocked || simulatedRec === 'NOB'}
                                                                className="w-24 text-center text-3xl font-black text-slate-800 bg-transparent border-none focus:outline-none focus:ring-0 p-0 disabled:opacity-40 tracking-tight transition-colors hover:text-indigo-900 placeholder:text-slate-200"
                                                            />
                                                            <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 text-slate-300">
                                                                <TrendingUp className="w-3 h-3" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // Static Label for others
                                                    <div className="absolute top-full mt-2 text-[10px] font-bold text-slate-500 bg-white/80 px-1.5 py-0.5 rounded shadow-sm border border-slate-100">
                                                        {p.val.toFixed(2)}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Divider that feels like a 'Ground' for the chart */}
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent my-2" />

                    {/* --- Control Deck (Bottom) --- */}
                    <div className="p-5 pt-2 flex flex-col items-center gap-6 relative z-10">
                        {/* Slider Control Area - Hero Input Removed */}

                        <div className="w-full flex items-center gap-4">
                            <button
                                onClick={() => handleMtaChange(Math.max(3.00, simulatedMta - 0.01))}
                                disabled={isLocked || simulatedMta <= 3.00 || simulatedRec === 'NOB'}
                                className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center hover:border-indigo-300 hover:text-indigo-600 hover:bg-white shadow-sm active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
                            >
                                <Minus className="w-4 h-4" />
                            </button>

                            <div
                                className="relative flex-1 h-12 flex items-center touch-none select-none cursor-pointer"
                                ref={sliderRef}
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                            >
                                {/* Track Background */}
                                <div className="absolute left-0 right-0 h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                    <div
                                        className={cn("h-full transition-all duration-75 ease-out", isLocked || simulatedRec === 'NOB' ? "bg-slate-300" : "bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-600")}
                                        style={{ width: `${getViewPercent(simulatedMta)}%` }}
                                    />
                                </div>

                                {/* Markers / Milestones - Only show if in view */}
                                {[3.0, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.0].map(val => {
                                    // Filter out markers far outside the window to avoid DOM clutter, keeping a small buffer
                                    if (val < windowStart - 0.1 || val > windowStart + windowSize + 0.1) return null;

                                    const isMajor = Math.abs(val % 0.5) < 0.001;
                                    const isLabel = Math.abs(val % 0.5) < 0.001; // Label every 0.5

                                    return (
                                        <div key={val} className="absolute inset-0 pointer-events-none z-0">
                                            <div
                                                className={cn("absolute top-1/2 -translate-y-1/2 w-px bg-slate-300/50 transition-all duration-300 ease-out", isMajor ? "h-3 bg-slate-400/50" : "h-1.5")}
                                                style={{ left: `${getViewPercent(val)}%` }}
                                            />
                                            {/* Labels */}
                                            {isLabel && (
                                                <div
                                                    className="absolute top-[34px] -translate-x-1/2 text-[10px] font-bold text-slate-300 transition-all duration-300 ease-out"
                                                    style={{ left: `${getViewPercent(val)}%` }}
                                                >
                                                    {val.toFixed(1)}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}

                                {/* Rank Markers (Refined) */}
                                {(() => {
                                    if (!rankContext?.nextRanks && !rankContext?.prevRanks) return null;
                                    const next = rankContext?.nextRanks || [];
                                    const prev = rankContext?.prevRanks || [];
                                    const allMarkers = [
                                        ...next.map(r => ({ ...r, type: 'next' as const })),
                                        ...prev.map(r => ({ ...r, type: 'prev' as const }))
                                    ].sort((a, b) => a.rank - b.rank);

                                    return allMarkers.map((marker) => {
                                        if (marker.mta < windowStart - 0.1 || marker.mta > windowStart + windowSize + 0.1) return null;
                                        const isNext = marker.type === 'next';
                                        const pct = getViewPercent(marker.mta);
                                        return (
                                            <div
                                                key={`${marker.type}-${marker.rank}`}
                                                className="absolute top-1/2 -translate-y-1/2 z-10 pointer-events-none transition-all duration-300 ease-out"
                                                style={{ left: `${pct}%` }}
                                            >
                                                {/* Flag / Diamond Marker */}
                                                <div className={cn(
                                                    "w-3 h-3 rotate-45 border-2 -translate-x-1/2 bg-white shadow-sm transition-transform",
                                                    isNext ? "border-emerald-500" : "border-rose-400"
                                                )} />

                                                {/* Tooltip Label */}
                                                <div className={cn(
                                                    "absolute bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity delay-75",
                                                    isNext ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
                                                )}>
                                                    #{marker.rank}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}

                                {/* Thumb */}
                                <div
                                    className={cn(
                                        "absolute top-1/2 -translate-y-1/2 w-7 h-7 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] ring-4 ring-white transition-all duration-75 pointer-events-none z-30 flex items-center justify-center",
                                        isLocked || simulatedRec === 'NOB' ? "grayscale opacity-50" : "scale-100"
                                    )}
                                    style={{ left: `${getViewPercent(simulatedMta)}%`, transform: 'translate(-50%, -50%)' }}
                                >
                                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
                                </div>
                            </div>

                            <button
                                onClick={() => handleMtaChange(Math.min(5.00, simulatedMta + 0.01))}
                                disabled={isLocked || simulatedMta >= 5.00 || simulatedRec === 'NOB'}
                                className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center hover:border-indigo-300 hover:text-indigo-600 hover:bg-white shadow-sm active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mb-20"></div>
            </div>

            <UnsavedChangesModal
                isOpen={showUnsavedModal}
                onApply={handleUnsavedApply}
                onDiscard={handleUnsavedDiscard}
                onCancel={handleUnsavedCancel}
            />

            {/* --- Footer / Floating Actions --- */}
            {!isLocked && isDirty && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2 fade-in">
                    <button
                        onClick={handleApply}
                        className="pl-3 pr-4 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-full hover:bg-black shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center gap-2 ring-4 ring-white"
                    >
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-emerald-950">
                            <Check className="w-3 h-3" strokeWidth={3} />
                        </div>
                        Apply Changes
                    </button>
                </div>
            )}

        </div >
    );
}
