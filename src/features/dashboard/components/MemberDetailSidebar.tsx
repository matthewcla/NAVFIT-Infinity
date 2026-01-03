import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    ChevronLeft,
    ChevronRight,
    Lock,
    Unlock,
    TrendingUp,
    Minus,
    Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RankChangeModal } from './RankChangeModal';

import type { Member, Report } from '@/types';

interface MemberDetailSidebarProps {
    memberId: string;
    onClose: () => void;
    onUpdateMTA: (memberId: string, newMta: number) => void;
    onUpdatePromRec: (memberId: string, rec: 'EP' | 'MP' | 'P' | 'Prog' | 'SP' | 'NOB') => void;
    onNavigateNext: () => void;
    onNavigatePrev: () => void;
    rosterMember: Member;
    currentReport?: Report;

    rankContext?: {
        currentRank: number;
        nextRankMta?: number;
        prevRankMta?: number;
    };
}

export function MemberDetailSidebar({
    memberId,
    onClose,
    onUpdateMTA,
    onUpdatePromRec,
    onNavigateNext,
    onNavigatePrev,
    rosterMember,
    currentReport,
    rankContext
}: MemberDetailSidebarProps) {

    // --- State Management ---
    const initialMta = currentReport?.traitAverage || 3.00;
    const initialRec = (currentReport?.promotionRecommendation as any) || 'P';

    const [simulatedMta, setSimulatedMta] = useState<number>(initialMta);
    const [simulatedRec, setSimulatedRec] = useState<'EP' | 'MP' | 'P' | 'Prog' | 'SP' | 'NOB'>(initialRec);
    const [isLocked, setIsLocked] = useState(false);

    // Warning Modal State
    const [showWarning, setShowWarning] = useState(false);
    const [pendingMta, setPendingMta] = useState<number | null>(null);
    const [warningDirection, setWarningDirection] = useState<'up' | 'down'>('up');

    // Reset state when member changes
    useEffect(() => {
        setSimulatedMta(currentReport?.traitAverage || 3.00);
        setSimulatedRec((currentReport?.promotionRecommendation as any) || 'P');
        setIsLocked(false);
        setShowWarning(false);
        setPendingMta(null);
    }, [memberId, currentReport]);


    // --- Rank Change Logic ---
    const handleMtaChange = (newValue: number) => {
        if (isLocked) return;

        // Tolerance for floating point/slider precision (optional, but good for UX not to be too annoying)
        // const tolerance = 0.01; 

        // Check Upward Rank Change (Higher MTA > Next Rank's MTA)
        if (rankContext?.nextRankMta !== undefined && newValue > rankContext.nextRankMta) {
            setPendingMta(newValue);
            setWarningDirection('up');
            setShowWarning(true);
            return;
        }

        // Check Downward Rank Change (Lower MTA < Prev Rank's MTA)
        if (rankContext?.prevRankMta !== undefined && newValue < rankContext.prevRankMta) {
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
        // Snap back to boundary? Or just stay at current?
        // Staying at current simulatedMta is safest.
    };


    // --- Derived Metrics ---
    const history = (rosterMember.history || []).slice(-3); // Last 3 reports

    // --- Helpers ---


    const handleApply = () => {
        onUpdateMTA(memberId, simulatedMta);
        onUpdatePromRec(memberId, simulatedRec);
        onNavigateNext();
    };

    return createPortal(
        <div className="flex flex-col h-full bg-white border-l border-slate-200 shadow-2xl w-[530px] fixed right-0 top-0 bottom-0 !z-[100] animate-in slide-in-from-right duration-300">

            {/* --- Header (Sticky) --- */}
            <div className="flex-none bg-white z-10 border-b border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="p-1.5 -ml-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Removed Reports Planned from here */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={onNavigatePrev}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 border border-slate-200 shadow-sm transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={onNavigateNext}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 border border-slate-200 shadow-sm transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Replaced User Icon with Prominent Lock Control */}
                    <button
                        onClick={() => setIsLocked(!isLocked)}
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
                                    {/* Status Badges */}
                                    {currentReport?.promotionStatus === 'FROCKED' && (
                                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded border border-amber-200">FROCKED</span>
                                    )}
                                    {currentReport?.isAdverse && (
                                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 rounded border border-red-200">ADVERSE</span>
                                    )}
                                    <h2 className="text-lg font-bold text-slate-900 leading-tight truncate">
                                        {rosterMember.name}
                                    </h2>
                                </div>
                                <div className="text-sm font-medium text-slate-500">
                                    {rosterMember.rank} {rosterMember.designator}
                                </div>
                            </div>

                            {/* Reports Planned - Moved Here */}
                            <div className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 whitespace-nowrap">
                                {currentReport?.reportsRemaining !== undefined
                                    ? `${currentReport.reportsRemaining} ${currentReport.reportsRemaining === 1 ? 'Report' : 'Reports'} Planned`
                                    : 'PRD Unknown'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Scrollable Content --- */}
            <div className="flex-1 overflow-y-auto">


                {/* --- Section A: The Trajectory --- */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 tracking-wider">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>Member Trajectory</span>
                        </div>
                    </div>

                    <div className="flex gap-4 h-28">
                        {/* Chart Area */}
                        <div className="flex-1 bg-white rounded-lg border border-slate-200 p-2 relative">
                            {/* Simple SVG Sparkline */}
                            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                                {/* Baseline (RSCA) - Grey Line at 50% for mock */}
                                <line x1="0" y1="50" x2="100" y2="50" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 2" />

                                {/* History Line */}
                                {history.length > 0 && (
                                    <polyline
                                        points={history.map((h, i) => {
                                            const x = (i / (Math.max(1, history.length - 1))) * 100;
                                            const y = 100 - ((h.traitAverage - 2.0) / 3.0 * 100); // Scale 2.0-5.0
                                            return `${x},${y}`;
                                        }).join(' ')}
                                        fill="none"
                                        stroke="#6366f1"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                )}
                                {/* Current Projected Point */}
                                {history.length > 0 && (
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

                        {/* Current Delta Metrics (Removed) */}
                    </div>
                </div>

                {/* --- Section B: The Decision Engine --- */}
                <div className="p-5 space-y-6">

                    {/* Promotion Recommendation */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Recommendation</label>
                        <div className="flex bg-slate-100 p-1 rounded-lg shadow-inner">
                            {(['NOB', 'SP', 'Prog', 'P', 'MP', 'EP'] as const).map((rec) => (
                                <button
                                    key={rec}
                                    onClick={() => setSimulatedRec(rec)}
                                    className={cn(
                                        "flex-1 py-1.5 text-xs font-bold rounded-md transition-all",
                                        simulatedRec === rec
                                            ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5 scale-[1.02]"
                                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                    )}
                                >
                                    {rec === 'Prog' ? 'PR' : rec}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Trait Average Tuner */}
                    <div className="space-y-4">
                        <div className="flex items-end justify-between">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                    Trait Average
                                </label>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Lock moved to header, simplified input here */}
                                <input
                                    type="number"
                                    step="0.01"
                                    min="1.00"
                                    max="5.00"
                                    value={simulatedMta}
                                    onChange={(e) => handleMtaChange(parseFloat(e.target.value))}
                                    disabled={isLocked}
                                    className="w-20 text-right text-xl font-bold text-slate-900 bg-transparent border-b-2 border-slate-200 focus:border-indigo-500 focus:outline-none p-0 focus:ring-0 disabled:opacity-50 font-mono"
                                />
                            </div>
                        </div>

                        {/* Robust Slider Control */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleMtaChange(Math.max(1.00, simulatedMta - 0.01))}
                                disabled={isLocked || simulatedMta <= 1.00}
                                className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all disabled:opacity-30 disabled:pointer-events-none"
                            >
                                <Minus className="w-4 h-4" />
                            </button>

                            <div className="relative flex-1 h-8 flex items-center group touch-none select-none">
                                {/* Track Background */}
                                <div className="absolute left-0 right-0 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                    {/* Fill */}
                                    <div
                                        className={cn(
                                            "h-full transition-all duration-75",
                                            isLocked ? "bg-slate-300" : "bg-indigo-500"
                                        )}
                                        style={{ width: `${((simulatedMta - 1.0) / 4.0) * 100}%` }}
                                    />
                                </div>

                                {/* Ticks / Grid (Every 0.5 or 1.0) */}
                                {[3.0, 4.0, 5.0].map(val => (
                                    <div
                                        key={val}
                                        className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-slate-300 pointer-events-none z-0"
                                        style={{ left: `${((val - 1.0) / 4.0) * 100}%` }}
                                    />
                                ))}


                                {/* Ghost Value Marker (Initial) */}
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 w-1.5 h-4 bg-slate-300/80 rounded-sm pointer-events-none z-10 hover:bg-slate-400 transition-colors"
                                    style={{ left: `${((initialMta - 1.0) / 4.0) * 100}%` }}
                                    title={`Initial: ${initialMta.toFixed(2)}`}
                                />

                                {/* Rank Thresholds */}
                                {rankContext?.nextRankMta && (
                                    <div
                                        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-500/60 z-10 pointer-events-none"
                                        style={{ left: `${((rankContext.nextRankMta - 1.0) / 4.0) * 100}%` }}
                                        title="Next Rank Threshold"
                                    />
                                )}
                                {rankContext?.prevRankMta && (
                                    <div
                                        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-red-500/60 z-10 pointer-events-none"
                                        style={{ left: `${((rankContext.prevRankMta - 1.0) / 4.0) * 100}%` }}
                                        title="Prev Rank Threshold"
                                    />
                                )}

                                {/* Range Input (Invisible overlay for interaction) */}
                                <input
                                    type="range"
                                    min="1.00"
                                    max="5.00"
                                    step="0.01"
                                    value={simulatedMta}
                                    onChange={(e) => handleMtaChange(parseFloat(e.target.value))}
                                    disabled={isLocked}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-grab active:cursor-grabbing z-20 disabled:cursor-not-allowed"
                                />

                                {/* Custom Thumb (Visual only, follows value) */}
                                <div
                                    className={cn(
                                        "absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 rounded-full shadow-md pointer-events-none z-10 transition-transform duration-75 ease-out flex items-center justify-center",
                                        isLocked ? "border-slate-300" : "border-indigo-600 scale-100 group-hover:scale-110"
                                    )}
                                    style={{ left: `calc(${((simulatedMta - 1.0) / 4.0) * 100}% - 10px)` }}
                                >
                                    <div className={cn("w-1.5 h-1.5 rounded-full", isLocked ? "bg-slate-300" : "bg-indigo-600")} />
                                </div>
                            </div>

                            <button
                                onClick={() => handleMtaChange(Math.min(5.00, simulatedMta + 0.01))}
                                disabled={isLocked || simulatedMta >= 5.00}
                                className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all disabled:opacity-30 disabled:pointer-events-none"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- Section C: Impact Analysis (Removed) --- */}
                {/* <div className="p-5 bg-slate-50 border-t border-slate-100 mb-20">
                </div> */}
                <div className="mb-20"></div>
            </div>

            {/* --- Footer (Sticky) --- */}
            <div className="flex-none absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setSimulatedMta(initialMta);
                            setSimulatedRec(initialRec);
                        }}
                        className="px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Reset
                    </button>
                    {/* Spacer */}
                    <div className="flex-1" />

                    <button
                        className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                    >
                        Edit Report
                    </button>
                    <button
                        onClick={handleApply}
                        className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg active:transform active:scale-[0.98] transition-all flex items-center gap-2"
                    >
                        Apply & Next
                        <ChevronRight className="w-4 h-4 opacity-70" />
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
                memberName={rosterMember.name}
            />

        </div>
        , document.body);
}
