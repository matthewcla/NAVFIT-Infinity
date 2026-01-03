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
    Plus,
    Edit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RankChangeModal } from './RankChangeModal';

import type { Member, Report, SummaryGroup } from '@/types';
import { computeEpMax, computeMpMax, computeEpMpCombinedMax } from '@/domain/policy/quotas';
import { Paygrade, RankCategory, PromotionRecommendation } from '@/domain/policy/types';
import { validateRecommendationAgainstTraits } from '@/domain/policy/validation';

interface MemberDetailSidebarProps {
    memberId: string;
    group?: SummaryGroup; // Needed for quota context, optional for non-group contexts
    onClose: () => void;
    onUpdateMTA: (memberId: string, newMta: number) => void;
    onUpdatePromRec: (memberId: string, rec: 'EP' | 'MP' | 'P' | 'Prog' | 'SP' | 'NOB') => void;
    onNavigateNext: () => void;
    onNavigatePrev: () => void;
    rosterMember: Member;
    currentReport?: Report;

    rankContext?: {
        currentRank: number;
        nextRanks: { mta: number; rank: number }[];
        prevRanks: { mta: number; rank: number }[];
    };
}

export function MemberDetailSidebar({
    memberId,
    group,
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
    const initialRec = currentReport?.promotionRecommendation || 'P';

    const [simulatedMta, setSimulatedMta] = useState<number>(initialMta);
    const [simulatedRec, setSimulatedRec] = useState<'EP' | 'MP' | 'P' | 'Prog' | 'SP' | 'NOB'>(initialRec);
    const [isLocked, setIsLocked] = useState(false);

    // Warning Modal State
    const [showWarning, setShowWarning] = useState(false);
    const [pendingMta, setPendingMta] = useState<number | null>(null);
    const [warningDirection, setWarningDirection] = useState<'up' | 'down'>('up');

    // Reset state when member changes
    useEffect(() => {
        setTimeout(() => {
            setSimulatedMta(currentReport?.traitAverage || 3.00);
            setSimulatedRec(currentReport?.promotionRecommendation || 'P');
            setIsLocked(false);
            setShowWarning(false);
            setPendingMta(null);
        }, 0);
    }, [memberId, currentReport]);


    // --- Rank Change Logic ---
    const handleMtaChange = (newValue: number) => {
        if (isLocked) return;

        // Tolerance for floating point/slider precision (optional, but good for UX not to be too annoying)
        // const tolerance = 0.01; 

        // Check Upward Rank Change (Higher MTA > ANY Next Rank's MTA)
        // We only care about the immediate next rank for the warning, or potentially all of them?
        // Usually, crossing the *immediate* next rank is the trigger.
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
        // Snap back to boundary? Or just stay at current?
        // Staying at current simulatedMta is safest.
    };


    // --- Derived Metrics ---
    const history = (rosterMember.history || []).slice(-3); // Last 3 reports

    // --- Quota & Constraint Logic ---
    const checkConstraints = (rec: string) => {
        if (!group) return { disabled: false, reason: null };
        const reports = group.reports;
        const total = reports.length;

        // Exclude current member's existing rec from usage counts
        const otherReports = reports.filter(r => r.memberId !== memberId);
        const epUsed = otherReports.filter(r => r.promotionRecommendation === 'EP').length;
        const mpUsed = otherReports.filter(r => r.promotionRecommendation === 'MP').length;

        const paygrade = (group.paygrade?.replace('-', '') || 'O1') as Paygrade;
        const context = {
            size: total,
            paygrade,
            rankCategory: paygrade.startsWith('W') ? RankCategory.WARRANT : paygrade.startsWith('E') ? RankCategory.ENLISTED : RankCategory.OFFICER,
            isLDO: (group.designator || '').startsWith('6'),
            isCWO: (group.designator || '').startsWith('7') || (group.designator || '').startsWith('8')
        };

        // 1. Quota Checks
        const epMax = computeEpMax(total, context);
        // Note: MP Max depends on EP used. If I select EP, EP usage increases.
        // If I select MP, MP usage increases.
        // But MP max formula: max MP = combinedMax - (EP used).
        // If I select MP, EP used is `epUsed` (others).
        const mpMax = computeMpMax(total, context, epUsed);

        // Combined Check
        const combinedMax = computeEpMpCombinedMax(total, context);

        if (rec === 'EP') {
            // Check EP limit
            if (epUsed >= epMax) {
                return { disabled: true, reason: `EP Quota Full (${epUsed}/${epMax})` };
            }
            // Check Combined limit (EP+MP)
            if ((epUsed + 1) + mpUsed > combinedMax) {
                return { disabled: true, reason: `Combined Quota Full (${epUsed + mpUsed}/${combinedMax})` };
            }
        }

        if (rec === 'MP') {
            // Check MP limit
            if (mpUsed >= mpMax) {
                 return { disabled: true, reason: `MP Quota Full (${mpUsed}/${mpMax})` };
            }
             // Check Combined limit
            if (epUsed + (mpUsed + 1) > combinedMax) {
                return { disabled: true, reason: `Combined Quota Full (${epUsed + mpUsed}/${combinedMax})` };
            }
        }

        // 2. Trait Validation Checks
        if (currentReport?.traitGrades) {
            let domainRec: PromotionRecommendation;
            switch(rec) {
                case 'EP': domainRec = PromotionRecommendation.EARLY_PROMOTE; break;
                case 'MP': domainRec = PromotionRecommendation.MUST_PROMOTE; break;
                case 'P': domainRec = PromotionRecommendation.PROMOTABLE; break;
                case 'Prog': domainRec = PromotionRecommendation.SIGNIFICANT_PROBLEMS; break; // Prog mapped to SP usually? Or distinct? Domain validation uses SP.
                // Wait, validation.ts treats Prog/SP as SP usually, or distinct.
                // Let's assume validation expects standard ENUMS.
                // UI 'Prog' usually is 'Progressing'. 'SP' is 'Significant Problems'.
                // If domain validation has checks for 'Prog', we map it.
                // Domain types has 'PROMOTABLE', 'MUST_PROMOTE', 'EARLY_PROMOTE', 'SIGNIFICANT_PROBLEMS', 'NOB'.
                // 'Progressing' is only for Enlisted E1-E6 usually.
                // If mapRecommendation in validation.ts maps 'Prog' -> SP, that's wrong strictly speaking, but let's stick to simple mapping for block checks.
                // The blocking rules (1.0 blocks P/MP/EP, 2.0 blocks MP/EP) apply to upper recs.
                // So checking P, MP, EP is enough.
                case 'SP': domainRec = PromotionRecommendation.SIGNIFICANT_PROBLEMS; break;
                case 'NOB': domainRec = PromotionRecommendation.NOB; break;
                default: domainRec = PromotionRecommendation.PROMOTABLE;
            }

            // Map 'Prog' to something safe or handle explicitly?
            // If validation doesn't support Progressing, we skip for Prog.
            if (rec !== 'Prog') {
                 const violations = validateRecommendationAgainstTraits(currentReport.traitGrades, domainRec, context);
                 if (violations.length > 0) {
                     // Just show the first reason
                     return { disabled: true, reason: violations[0].message };
                 }
            }
        }

        return { disabled: false, reason: null };
    };

    // --- Helpers ---
    const getRecStyle = (rec: string, isSelected: boolean, locked: boolean, constraint: { disabled: boolean, reason: string | null }) => {
        if (constraint.disabled && !isSelected) {
            return "opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200 grayscale";
        }

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
        onNavigateNext();
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

                            <div className="flex flex-col items-end gap-1">
                                {/* Edit Report Button (Moved from Footer) */}
                                <button
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Edit Report Details"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>

                                {/* Reports Planned */}
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
                    <div className="space-y-3 mb-6">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Recommendation</label>
                        <div className="flex gap-1 p-0.5 rounded-lg">
                            {(['NOB', 'SP', 'Prog', 'P', 'MP', 'EP'] as const).map((rec) => {
                                const constraint = checkConstraints(rec);
                                return (
                                    <div key={rec} className="flex-1 group/tooltip relative">
                                        <button
                                            onClick={() => !isLocked && !constraint.disabled && setSimulatedRec(rec)}
                                            disabled={isLocked || constraint.disabled}
                                            className={cn(
                                                "w-full py-1.5 text-xs font-bold rounded-md transition-all",
                                                getRecStyle(rec, simulatedRec === rec, isLocked, constraint)
                                            )}
                                        >
                                            {rec === 'Prog' ? 'PR' : rec}
                                        </button>
                                        {/* Tooltip for Disabled State */}
                                        {constraint.disabled && (
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                                {constraint.reason}
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Trait Average Tuner */}
                    <div className="space-y-4"> {/* Reverted top margin to keep label aligned */}
                        <div className="flex items-end justify-between">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                    Trait Average Adjustment
                                </label>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                {/* Lock moved to header, simplified input here */}
                                <input
                                    type="number"
                                    step="0.01"
                                    min="3.00"
                                    max="5.00"
                                    value={simulatedMta}
                                    onChange={(e) => handleMtaChange(parseFloat(e.target.value))}
                                    disabled={isLocked}
                                    className="w-24 text-right text-2xl font-black text-slate-900 bg-transparent border-b-2 border-slate-200 focus:border-indigo-500 focus:outline-none p-0 focus:ring-0 disabled:opacity-50 font-mono"
                                />
                            </div>
                        </div>

                        {/* Robust Slider Control */}
                        <div className="flex items-center gap-3 mt-8"> {/* Increased specific slider margin (32px) */}
                            <button
                                onClick={() => handleMtaChange(Math.max(3.00, simulatedMta - 0.01))}
                                disabled={isLocked || simulatedMta <= 3.00}
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
                                        style={{ width: `${getPercent(simulatedMta)}%` }}
                                    />
                                </div>

                                {/* Rank Safe Zone & Thresholds */}
                                {(() => {
                                    const next = rankContext?.nextRanks?.[0]?.mta;
                                    const prev = rankContext?.prevRanks?.[0]?.mta;

                                    // Safe Zone Calculation - Scale 3.0 to 5.0
                                    // Range is 2.0 (5-3)
                                    // Formula: (val - 3.0) / 2.0 * 100

                                    if (next !== undefined && prev !== undefined) {
                                        const start = Math.max(3.0, Math.min(next, prev));
                                        const end = Math.min(5.0, Math.max(next, prev));

                                        // If outside visible range
                                        if (end < 3.0 || start > 5.0) return null;

                                        const leftStart = getPercent(start);
                                        const width = getPercent(end) - leftStart;

                                        return (
                                            <>
                                                {/* Safe Zone Highlight */}
                                                <div
                                                    className="absolute top-1/2 -translate-y-1/2 h-4 bg-emerald-50/80 border-x border-emerald-100 z-0 pointer-events-none"
                                                    style={{
                                                        left: `${leftStart}%`,
                                                        width: `${width}%`
                                                    }}
                                                />
                                            </>
                                        );
                                    }
                                    return null;
                                })()}


                                {/* Ticks / Grid (Every 0.5) */}
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


                                {/* Ghost Value Marker (Initial) */}
                                {initialMta >= 3.0 && initialMta <= 5.0 && (
                                    <div
                                        className="absolute top-1/2 -translate-y-1/2 w-1.5 h-4 bg-slate-200/50 rounded-sm pointer-events-none z-0"
                                        style={{ left: `${getPercent(initialMta)}%` }}
                                        title={`Initial: ${initialMta.toFixed(2)}`}
                                    />
                                )}

                                {/* Combined Rank Markers with Collision Detection */}
                                {(() => {
                                    if (!rankContext?.nextRanks && !rankContext?.prevRanks) return null;

                                    const next = rankContext?.nextRanks || [];
                                    const prev = rankContext?.prevRanks || [];

                                    // Combine and sort by Rank (Best/Smallest # to Worst/Largest #)
                                    // e.g. #1, #2, #3...
                                    // This ensures Higher Ranks (smaller numbers) get priority for the top position.
                                    const allMarkers = [
                                        ...next.map(r => ({ ...r, type: 'next' as const })),
                                        ...prev.map(r => ({ ...r, type: 'prev' as const }))
                                    ].sort((a, b) => a.rank - b.rank);

                                    // Compute offsets
                                    // Compute offsets
                                    // Use explicit type definition to handle the array construction
                                    const positionedMarkers: (typeof allMarkers[0] & { pct: number; level: number })[] = [];

                                    allMarkers.forEach((marker, i) => {
                                        const pct = getPercent(marker.mta);
                                        let level = 0;

                                        // Check against all *previously processed* (aka Higher Rank) markers
                                        for (let j = 0; j < i; j++) {
                                            const other = positionedMarkers[j];
                                            // 3.5% threshold for collision (approx visual width of label)
                                            if (Math.abs(pct - other.pct) < 4.0) {
                                                // If we overlap with someone at level X, we must be at least X + 1
                                                level = Math.max(level, other.level + 1);
                                            }
                                        }

                                        positionedMarkers.push({ ...marker, pct, level });
                                    });

                                    return positionedMarkers.map((marker) => {
                                        if (marker.mta < 3.0 || marker.mta > 5.0) return null;

                                        const isNext = marker.type === 'next';
                                        const colorClass = isNext ? "text-emerald-700 border-emerald-100/50" : "text-red-700 border-red-100/50";
                                        const lineColor = isNext ? "bg-emerald-400/40" : "bg-red-400/40"; // No opacity calculation mess, cleaner

                                        // Vertical Stagger Calculation
                                        // "Lower rank label sits lower"
                                        const verticalShift = marker.level * 24; // 24px per level of overlap

                                        return (
                                            <div
                                                key={`${marker.type}-${marker.rank}`}
                                                className="absolute z-10 pointer-events-none flex flex-col items-center gap-1 transition-all duration-300"
                                                style={{
                                                    left: `${marker.pct}%`,
                                                    transform: 'translateX(-50%)',
                                                    top: '50%',
                                                }}
                                            >
                                                {/* Connector Line - Grows to meet the label */}
                                                <div
                                                    className={cn("w-0.5 transition-all opacity-70", lineColor)}
                                                    style={{ height: `${32 + verticalShift}px` }}
                                                />

                                                {/* Label */}
                                                <span
                                                    className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest whitespace-nowrap bg-white/80 px-1 rounded backdrop-blur-sm shadow-sm border -mt-1",
                                                        colorClass
                                                    )}
                                                >
                                                    #{marker.rank}
                                                </span>
                                            </div>
                                        );
                                    });
                                })()}

                                {/* Range Input (Invisible overlay for interaction) */}
                                <input
                                    type="range"
                                    min="3.00"
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
                                    // Scale 3.0 -> 5.0 (Range 2.0)
                                    // Val - 3.0 / 2.0
                                    style={{ left: `calc(${getPercent(simulatedMta)}% - 10px)` }}
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

                    {/* Edit Report Moved to Header */}
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
