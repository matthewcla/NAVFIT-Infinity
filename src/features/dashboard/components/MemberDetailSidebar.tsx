import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    User,
    ChevronLeft,
    ChevronRight,
    Lock,
    Unlock,
    AlertTriangle,
    CheckCircle2,
    TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
    groupStats: { currentRSCA: number; projectedRSCA: number };
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
    groupStats
}: MemberDetailSidebarProps) {

    // --- State Management ---
    const initialMta = currentReport?.traitAverage || 3.00;
    const initialRec = (currentReport?.promotionRecommendation as any) || 'P';

    const [simulatedMta, setSimulatedMta] = useState<number>(initialMta);
    const [simulatedRec, setSimulatedRec] = useState<'EP' | 'MP' | 'P' | 'Prog' | 'SP' | 'NOB'>(initialRec);
    const [softBreakout, setSoftBreakout] = useState<string>(''); // For "Ranked #1 of 12"
    const [isLocked, setIsLocked] = useState(false);

    // Reset state when member changes
    useEffect(() => {
        setSimulatedMta(currentReport?.traitAverage || 3.00);
        setSimulatedRec((currentReport?.promotionRecommendation as any) || 'P');
        setSoftBreakout('');
        setIsLocked(false);
    }, [memberId, currentReport]);


    // --- Derived Metrics ---

    // Impact Simulation
    // Note: We calculate projected impact effectively in the render loop for now.


    const isHighConfidence = simulatedMta === 5.00;
    const isLowConfidence = simulatedMta < 3.60;

    // History Data for Chart
    const history = (rosterMember.history || []).slice(-3); // Last 3 reports

    // --- Helpers ---
    const formatDelta = (val: number) => {
        const sign = val > 0 ? '+' : '';
        return `${sign}${val.toFixed(2)}`;
    };

    const handleApply = () => {
        onUpdateMTA(memberId, simulatedMta);
        onUpdatePromRec(memberId, simulatedRec);
        onNavigateNext();
    };

    return createPortal(
        <div className="flex flex-col h-full bg-white border-l border-slate-200 shadow-2xl w-member-sidebar fixed right-0 top-0 bottom-0 z-infinity-slideover animate-in slide-in-from-right duration-300">

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
                        <div className="flex gap-1">
                            {/* Status Badges - Mock logic for now */}
                            {currentReport?.promotionStatus === 'FROCKED' && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded border border-amber-200">FROCKED</span>
                            )}
                            {currentReport?.isAdverse && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 rounded border border-red-200">ADVERSE</span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={onNavigatePrev}
                            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 border border-slate-200 shadow-sm"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onNavigateNext}
                            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 border border-slate-200 shadow-sm"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200 text-slate-400">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 leading-tight">
                            {rosterMember.name}
                        </h2>
                        <div className="text-sm font-medium text-slate-500">
                            {rosterMember.rank} {rosterMember.designator}
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
                            <span>Flight Path</span>
                        </div>
                        <div className="text-xs font-medium text-slate-400">
                            {currentReport?.reportsRemaining !== undefined ? `${currentReport?.reportsRemaining} Rpts Left` : 'PRD Unknown'}
                        </div>
                    </div>

                    <div className="flex gap-4 h-24">
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

                        {/* Current Delta Metrics */}
                        <div className="w-24 flex flex-col justify-center items-end text-right">
                            <div className="text-[10px] uppercase text-slate-500 font-semibold mb-0.5">Vs RSCA</div>
                            <div className={cn(
                                "text-2xl font-bold font-mono tracking-tight",
                                simulatedMta - groupStats.currentRSCA >= 0 ? "text-emerald-600" : "text-amber-600"
                            )}>
                                {formatDelta(simulatedMta - groupStats.currentRSCA)}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                                Current MTA: <span className="font-mono text-slate-600">{simulatedMta.toFixed(2)}</span>
                            </div>
                        </div>
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
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                                Trait Average
                                <button
                                    onClick={() => setIsLocked(!isLocked)}
                                    className={cn("transition-colors", isLocked ? "text-indigo-500" : "text-slate-300 hover:text-slate-400")}
                                >
                                    {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                </button>
                            </label>

                            <div className="flex items-center gap-2">
                                {/* Match Peer Placeholder */}
                                <select className="text-[10px] bg-slate-50 border-none text-slate-400 focus:ring-0 cursor-pointer hover:text-indigo-500 transition-colors">
                                    <option>Match Peer...</option>
                                    <option>Top RSCA</option>
                                    <option>Group Avg</option>
                                </select>

                                <input
                                    type="number"
                                    step="0.01"
                                    min="1.00"
                                    max="5.00"
                                    value={simulatedMta}
                                    onChange={(e) => !isLocked && setSimulatedMta(parseFloat(e.target.value))}
                                    disabled={isLocked}
                                    className="w-20 text-right text-xl font-bold text-slate-900 bg-transparent border-b-2 border-slate-200 focus:border-indigo-500 focus:outline-none p-0 focus:ring-0 disabled:opacity-50"
                                />
                            </div>
                        </div>

                        {/* Slider with Ghost Value */}
                        <div className="relative h-6 flex items-center">
                            {/* Ghost Value Marker */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-slate-400/50 rounded-full pointer-events-none z-0"
                                style={{ left: `${((initialMta - 3.0) / 2.0) * 100}%` }}
                                title="Initial Value"
                            />

                            <input
                                type="range"
                                min="3.00"
                                max="5.00"
                                step="0.01"
                                value={simulatedMta}
                                onChange={(e) => !isLocked && setSimulatedMta(parseFloat(e.target.value))}
                                disabled={isLocked}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 z-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* Quick Presets */}
                        <div className="grid grid-cols-4 gap-2">
                            <button
                                onClick={() => !isLocked && setSimulatedMta(Number(groupStats.currentRSCA.toFixed(2)))}
                                disabled={isLocked}
                                className="px-2 py-1.5 text-[10px] font-medium bg-slate-50 border border-slate-200 rounded hover:border-indigo-300 hover:text-indigo-600 transition-colors disabled:opacity-50"
                            >
                                At RSCA
                            </button>
                            <button
                                onClick={() => !isLocked && setSimulatedMta(Number((groupStats.currentRSCA + 0.15).toFixed(2)))}
                                disabled={isLocked}
                                className="px-2 py-1.5 text-[10px] font-medium bg-slate-50 border border-slate-200 rounded hover:border-indigo-300 hover:text-indigo-600 transition-colors disabled:opacity-50"
                            >
                                + 0.15
                            </button>
                            <button
                                onClick={() => !isLocked && setSimulatedMta(Number((groupStats.currentRSCA + 0.35).toFixed(2)))}
                                disabled={isLocked}
                                className="px-2 py-1.5 text-[10px] font-medium bg-slate-50 border border-slate-200 rounded hover:border-orange-300 hover:text-orange-600 transition-colors disabled:opacity-50"
                            >
                                Burn
                            </button>
                            <button
                                onClick={() => !isLocked && setSimulatedMta(5.00)}
                                disabled={isLocked}
                                className="px-2 py-1.5 text-[10px] font-medium bg-slate-50 border border-slate-200 rounded hover:border-indigo-300 hover:text-indigo-600 transition-colors disabled:opacity-50"
                            >
                                Max
                            </button>
                        </div>
                    </div>

                    {/* Soft Breakout */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Soft Breakout</label>
                        <input
                            type="text"
                            placeholder='e.g., "Ranked #1 of 12..."'
                            value={softBreakout}
                            onChange={(e) => setSoftBreakout(e.target.value)}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>

                {/* --- Section C: Impact Analysis --- */}
                <div className="p-5 bg-slate-50 border-t border-slate-100 mb-20"> {/* Margin bottom for sticky footer */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">Simulation Analysis</span>
                        </div>

                        <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-sm text-indigo-900 leading-relaxed">
                            Group RSCA will rise to <strong className="font-mono">
                                {(groupStats.projectedRSCA + (simulatedMta - initialMta) / 10).toFixed(2)}
                            </strong> (Est).
                        </div>

                        {/* Validation Alerts */}
                        {isHighConfidence && (
                            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>Signals MAX confidence. Ensure justification supports 5.00 ceiling.</span>
                            </div>
                        )}
                        {isLowConfidence && (
                            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>MTA below 3.60 may signal decline against peer average.</span>
                            </div>
                        )}
                        {!isHighConfidence && !isLowConfidence && (
                            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-100">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>MTA progression is within healthy RSCA thresholds.</span>
                            </div>
                        )}
                    </div>
                </div>
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

        </div>
        , document.body);
}
