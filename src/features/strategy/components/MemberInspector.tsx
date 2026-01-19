import { useState, useEffect } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import type { Report } from '@/types';
import {
    X,
    Maximize2,
    Minimize2,
    ChevronLeft,
    ChevronRight,
    FileText,
    TrendingUp,
    Sparkles,
    Lock,
    Unlock,
    RotateCcw,
    RotateCw,
    ChevronDown,
    Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateRecommendationAgainstTraits } from '@/domain/policy/validation';
import { PromotionRecommendation, type TraitGradeSet } from '@/domain/policy/types';
import { checkQuota } from '@/features/strategy/logic/validation';
import { createSummaryGroupContext } from '@/features/strategy/logic/validation';
import { ReportAdminTab } from './ReportAdminTab';
import { ReportCommentsTab } from './ReportCommentsTab';
import { TrajectorySimulator } from './TrajectorySimulator';

interface MemberInspectorProps {
    memberId: string;
    onClose: () => void;
    initialMode?: 'sidebar' | 'full';
    onNavigateNext?: () => void;
    onNavigatePrev?: () => void;
    onPreviewMTA?: (val: number) => void;
}

export function MemberInspector({
    memberId,
    onClose,
    initialMode = 'sidebar',
    onNavigateNext,
    onNavigatePrev,
    onPreviewMTA
}: MemberInspectorProps) {
    const [mode, setMode] = useState<'sidebar' | 'full'>(initialMode);

    // Global Store
    const roster = useNavfitStore(state => state.roster);
    const summaryGroups = useNavfitStore(state => state.summaryGroups);
    const updateReport = useNavfitStore(state => state.updateReport);
    const updateProjection = useNavfitStore(state => state.updateProjection);
    const toggleReportLock = useNavfitStore(state => state.toggleReportLock);

    // Derived Context
    const member = roster.find(m => m.id === memberId);
    if (!member) return null;

    // Find active group and report
    // We assume the selected member belongs to one of the visible groups (or the selected group)
    // Ideally we use a 'selectedGroupId' selector, but finding the report is robust
    const activeGroupNode = summaryGroups.find(g => g.reports.some(r => r.memberId === memberId));
    const currentReport = activeGroupNode?.reports.find(r => r.memberId === memberId);

    // Initial State values
    // usage of explicit 'simulatedReport' state allows full mode editing
    const [simulatedReport, setSimulatedReport] = useState<Report | null>(null);

    // Sync state when selection changes
    useEffect(() => {
        if (currentReport) {
            setSimulatedReport({ ...currentReport });
        } else {
            setSimulatedReport(null);
        }
    }, [memberId, currentReport?.id]); // Deep compare or ID check? ID check is safer for reset.

    // History (Undo/Redo) - Now tracking full report snapshots might be heavy? 
    // For sidebar mode, we only tracked {mta, rec, comments}.
    // For full mode, ideally we track everything. 
    // Let's simplified history to only track the sidebar-relevant fields for the "Sidebar History" 
    // OR we track the full object. 
    // Given the object size isn't huge, full object tracking is cleaner.
    const [history, setHistory] = useState<Report[]>([]);
    const [future, setFuture] = useState<Report[]>([]);
    const isLocked = currentReport?.isLocked || false;

    // Toggle logic for sections
    const [isRecOpen, setIsRecOpen] = useState(true);
    const [isMtaOpen, setIsMtaOpen] = useState(true);
    const [isRemarksOpen, setIsRemarksOpen] = useState(true);

    // Full Mode Tabs
    const [activeTab, setActiveTab] = useState<'Performance' | 'Traits' | 'Admin' | 'Comments' | 'Review'>('Admin');

    // --- Logic Implementation ---

    // History Helpers
    const commitToHistory = () => {
        if (!simulatedReport) return;
        setHistory(prev => {
            const newHistory = [...prev, simulatedReport];
            if (newHistory.length > 10) newHistory.shift();
            return newHistory;
        });
        setFuture([]);
    };

    const handleUndo = () => {
        if (history.length === 0 || !simulatedReport) return;
        const previousState = history[history.length - 1];

        setFuture(prev => [...prev, simulatedReport]);
        setHistory(history.slice(0, -1));
        setSimulatedReport(previousState);

        // Also trigger preview update for undo if MTA changed
        if (previousState.traitAverage !== simulatedReport.traitAverage) {
            onPreviewMTA?.(previousState.traitAverage);
        }
    };

    const handleRedo = () => {
        if (future.length === 0 || !simulatedReport) return;
        const nextState = future[future.length - 1];

        setHistory(prev => [...prev, simulatedReport]);
        setFuture(future.slice(0, -1));
        setSimulatedReport(nextState);

        if (nextState.traitAverage !== simulatedReport.traitAverage) {
            onPreviewMTA?.(nextState.traitAverage);
        }
    };

    // Validation Logic
    const getBlockingStatus = (rec: string): { blocked: boolean; reason?: string } => {
        if (!currentReport || !simulatedReport) return { blocked: true };

        // 1. Policy Validation
        if (simulatedReport.traitGrades) {
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
                    simulatedReport.traitGrades as TraitGradeSet, enumRec, {} as any
                );
                if (violations.length > 0) return { blocked: true, reason: violations[0].message };
            }
        }

        // 2. Quota Validation (Simulated using helper)
        if (activeGroupNode && rec !== currentReport.promotionRecommendation) {
            const context = createSummaryGroupContext(activeGroupNode);
            const distribution = { EP: 0, MP: 0 };

            // Calculate current distribution from REAL reports + our simulation
            activeGroupNode.reports.forEach(r => {
                if (r.memberId === memberId) return; // Skip self
                if (r.promotionRecommendation === 'EP') distribution.EP++;
                if (r.promotionRecommendation === 'MP') distribution.MP++;
            });

            if (rec === 'EP') distribution.EP++;
            if (rec === 'MP') distribution.MP++;

            const nobCount = activeGroupNode.reports.filter(r => r.promotionRecommendation === 'NOB' && r.memberId !== memberId).length
                + (rec === 'NOB' ? 1 : 0);
            const effectiveSize = activeGroupNode.reports.length - nobCount;

            const check = checkQuota({ ...context, size: effectiveSize }, distribution.EP, distribution.MP);
            if (!check.isValid) return { blocked: true, reason: check.message };
        }

        return { blocked: false };
    };

    const handleRecChange = (newRec: 'EP' | 'MP' | 'P' | 'Prog' | 'SP' | 'NOB') => {
        if (isLocked || !simulatedReport) return;
        const status = getBlockingStatus(newRec);
        if (status.blocked) return;

        commitToHistory();
        setSimulatedReport({ ...simulatedReport, promotionRecommendation: newRec });
    };

    const handleMtaChange = (val: number, isIntermediate = false) => {
        if (isLocked || !simulatedReport || simulatedReport.promotionRecommendation === 'NOB') return;

        if (!isIntermediate) commitToHistory();
        setSimulatedReport({ ...simulatedReport, traitAverage: val });
        onPreviewMTA?.(val); // FIRE THE LIVE PREVIEW
    };

    const handleCommentsChange = (val: string) => {
        if (isLocked || !simulatedReport) return;
        setSimulatedReport({ ...simulatedReport, comments: val });
    };

    const handleCommentsBlur = () => {
        // Simple commit on blur for now
        commitToHistory();
    };


    const handleApplyChanges = () => {
        if (activeGroupNode && currentReport && simulatedReport) {
            // In full mode we might update everything.
            // But updateReport takes a partial.
            // Let's just pass the whole simulatedReport as the update.
            // Ideally we diff, but sending all is safe.
            // Only update projection (which triggers auto-rebalance) if MTA actually changed
            if (simulatedReport.traitAverage !== currentReport.traitAverage) {
                updateProjection(activeGroupNode.id, currentReport.id, simulatedReport.traitAverage);
            }

            updateReport(activeGroupNode.id, currentReport.id, simulatedReport);
            setHistory([]);
            setFuture([]);
        }
    };

    // Check if dirty (deep compare or specific fields? strict equality works if we clone on edit)
    const hasChanges = simulatedReport && currentReport && (
        simulatedReport.traitAverage !== currentReport.traitAverage ||
        simulatedReport.promotionRecommendation !== currentReport.promotionRecommendation ||
        simulatedReport.comments !== currentReport.comments ||
        simulatedReport.memberId !== currentReport.memberId || // Admin fields
        simulatedReport.openingStatement !== currentReport.openingStatement
        // We could do a JSON stringify compare for full object, but specific important fields is okay for now.
        // Actually for full mode, let's trust JSON compare or just key fields?
        // JSON compare is safest for full editors.
    );

    if (!member || !simulatedReport) return <div className="p-4 text-slate-400">Loading...</div>;

    const simulatedRec = simulatedReport.promotionRecommendation || 'P';
    const simulatedMta = simulatedReport.traitAverage || 3.00;
    const simulatedComments = simulatedReport.comments || '';

    return (
        <div
            className={`
                h-full bg-white flex flex-col border-l border-slate-200 shadow-xl transition-all duration-300 ease-in-out
                ${mode === 'full' ? 'w-[800px] xl:w-[65vw]' : 'w-[420px]'}
            `}
        >
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 shrink-0">

                {/* Left: Member Info & Lock */}
                <div className="flex items-center gap-3 overflow-hidden">
                    {/* Lock Toggle */}
                    <button
                        onClick={() => {
                            if (currentReport && activeGroupNode) {
                                toggleReportLock(activeGroupNode.id, currentReport.id);
                            }
                        }}
                        className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center border transition-all shadow-sm active:scale-95 shrink-0",
                            isLocked
                                ? "bg-red-50 border-red-100 text-red-500 hover:bg-red-100 hover:border-red-200"
                                : "bg-white border-slate-200 text-slate-300 hover:border-indigo-200 hover:text-indigo-500 hover:shadow-md"
                        )}
                        title={isLocked ? "Unlock Editing" : "Lock Editing"}
                    >
                        {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>

                    <div className="w-px h-8 bg-slate-200 mx-1" />

                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs ring-2 ring-white shadow-sm">
                        {member.rank?.substring(0, 2) || 'UK'}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-800 text-sm truncate leading-tight">
                            {member.lastName}, {member.firstName}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 truncate tracking-wide uppercase">
                            {member.designator} • {member.payGrade}
                        </span>
                    </div>
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-1">
                    {/* Navigation */}
                    <div className="flex items-center mr-2 bg-slate-100 rounded-md p-0.5 border border-slate-200">
                        <button
                            onClick={onNavigatePrev}
                            className="p-1 hovered-icon disabled:opacity-30"
                            disabled={!onNavigatePrev}
                            title="Previous Member"
                        >
                            <ChevronLeft className="w-4 h-4 text-slate-500" />
                        </button>
                        <div className="w-px h-3 bg-slate-200 mx-0.5" />
                        <button
                            onClick={onNavigateNext}
                            className="p-1 hovered-icon disabled:opacity-30"
                            disabled={!onNavigateNext}
                            title="Next Member"
                        >
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                        </button>
                    </div>

                    {/* Mode Toggle */}
                    <button
                        onClick={() => setMode(mode === 'sidebar' ? 'full' : 'sidebar')}
                        className="p-2 rounded-md hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                        title={mode === 'sidebar' ? "Expand to Full Report" : "Collapse to Sidebar"}
                    >
                        {mode === 'sidebar' ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                    </button>

                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="p-2 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors ml-1"
                        title="Close Inspector"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden overflow-y-auto bg-slate-50/50">
                {mode === 'sidebar' ? (
                    <div className="p-4 space-y-4 pb-20">

                        {/* 1. Recommendation Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <button onClick={() => setIsRecOpen(!isRecOpen)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-slate-400" />
                                    <span className="font-bold text-slate-700 text-sm">Recommendation</span>
                                </div>
                                <div className={cn("text-slate-300 transition-transform", isRecOpen ? "rotate-180" : "")}>
                                    <ChevronDown className="w-4 h-4" />
                                </div>
                            </button>

                            {isRecOpen && (
                                <div className="p-4 pt-0 border-t border-slate-50 animate-in slide-in-from-top-2 fade-in duration-200">
                                    <div className="grid grid-cols-3 gap-2 mt-3">
                                        {(['EP', 'MP', 'P', 'Prog', 'SP', 'NOB'] as const).map(rec => {
                                            const { blocked, reason } = getBlockingStatus(rec);
                                            const isSelected = simulatedRec === rec;

                                            // Style helpers
                                            let flavorClass = "text-slate-500 border-slate-200 hover:bg-slate-50";
                                            if (rec === 'EP') flavorClass = isSelected ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "text-emerald-700 border-emerald-100 hover:bg-emerald-50";
                                            if (rec === 'MP') flavorClass = isSelected ? "bg-yellow-100 text-yellow-800 border-yellow-300" : "text-yellow-700 border-yellow-100 hover:bg-yellow-50";

                                            if (blocked) flavorClass = "opacity-40 cursor-not-allowed bg-slate-50 text-slate-300 border-transparent";

                                            return (
                                                <button
                                                    key={rec}
                                                    onClick={() => handleRecChange(rec)}
                                                    disabled={blocked || isLocked}
                                                    title={reason}
                                                    className={cn(
                                                        "py-3 px-1 rounded-lg text-sm font-bold border-2 transition-all relative",
                                                        flavorClass,
                                                        isSelected && "ring-1 ring-black/5 scale-[1.02] z-10 shadow-sm"
                                                    )}
                                                >
                                                    {rec === 'Prog' ? 'PR' : rec}
                                                    {blocked && <div className="absolute inset-0 cursor-not-allowed" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. Performance (MTA) Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <button onClick={() => setIsMtaOpen(!isMtaOpen)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-slate-400" />
                                    <span className="font-bold text-slate-700 text-sm">Performance</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                        {simulatedMta.toFixed(2)}
                                    </span>
                                    <div className={cn("text-slate-300 transition-transform", isMtaOpen ? "rotate-180" : "")}>
                                        <ChevronDown className="w-4 h-4" />
                                    </div>
                                </div>
                            </button>

                            {isMtaOpen && (
                                <div className="p-4 pt-0 border-t border-slate-50 animate-in slide-in-from-top-2 fade-in duration-200">
                                    {/* Undo/Redo */}
                                    <div className="flex justify-end gap-1 mb-2">
                                        <button onClick={handleUndo} disabled={!history.length} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 disabled:opacity-20"><RotateCcw className="w-3.5 h-3.5" /></button>
                                        <button onClick={handleRedo} disabled={!future.length} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 disabled:opacity-20"><RotateCw className="w-3.5 h-3.5" /></button>
                                    </div>

                                    {/* Slider Control */}
                                    <div className="py-6 px-2">
                                        <div className="relative h-2 bg-slate-100 rounded-full group cursor-pointer touch-none select-none"
                                            onPointerDown={(e) => {
                                                if (isLocked) return;
                                                e.currentTarget.setPointerCapture(e.pointerId);
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
                                                const pct = x / rect.width;
                                                const val = 2.0 + (pct * 3.0);
                                                handleMtaChange(Math.max(2.0, Math.min(5.0, val)), true);
                                            }}
                                            onPointerMove={(e) => {
                                                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
                                                    const pct = x / rect.width;
                                                    const val = 2.0 + (pct * 3.0);
                                                    handleMtaChange(Math.max(2.0, Math.min(5.0, val)), true);
                                                }
                                            }}
                                            onPointerUp={(e) => {
                                                e.currentTarget.releasePointerCapture(e.pointerId);
                                                commitToHistory();
                                            }}
                                        >
                                            {/* Track Fill */}
                                            <div className="absolute left-0 top-0 bottom-0 bg-indigo-500/20 rounded-full"
                                                style={{ width: `${((simulatedMta - 2.0) / 3.0) * 100}%` }} />

                                            {/* Thumb */}
                                            <div className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-indigo-600 rounded-full shadow-md z-10 transition-transform active:scale-110"
                                                style={{ left: `${((simulatedMta - 2.0) / 3.0) * 100}%`, transform: 'translate(-50%, -50%)' }} />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-2 px-1">
                                            <span>2.00</span>
                                            <span>3.50</span>
                                            <span>5.00</span>
                                        </div>
                                    </div>

                                    {/* Trajectory Simulator - Collapsible or Inline? Inline for now */}
                                    <div className="mt-6 pt-6 border-t border-slate-100">
                                        <TrajectorySimulator
                                            currentAvg={simulatedMta} // Using current report MTA as proxy for "Current Avg" for now, ideally Cumulative
                                            totalReportsSoFar={1}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <button onClick={() => setIsRemarksOpen(!isRemarksOpen)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-slate-400" />
                                    <span className="font-bold text-slate-700 text-sm">Remarks</span>
                                </div>
                                <div className={cn("text-slate-300 transition-transform", isRemarksOpen ? "rotate-180" : "")}>
                                    <ChevronDown className="w-4 h-4" />
                                </div>
                            </button>

                            {isRemarksOpen && (
                                <div className="p-4 pt-0 border-t border-slate-50 animate-in slide-in-from-top-2 fade-in duration-200">
                                    <textarea
                                        value={simulatedComments}
                                        onChange={(e) => handleCommentsChange(e.target.value)}
                                        onBlur={handleCommentsBlur}
                                        disabled={isLocked}
                                        placeholder="Add performance remarks..."
                                        className="w-full text-sm text-slate-600 border-0 focus:ring-0 focus:outline-none bg-transparent resize-none h-24 p-0 placeholder:text-slate-300"
                                    />
                                </div>
                            )}
                        </div>

                        {/* 3. Actions / Save */}
                        {Boolean(hasChanges) && (
                            <div className="fixed bottom-0 right-0 w-[420px] p-4 bg-white/80 backdrop-blur border-t border-slate-100 flex justify-end gap-2 z-50 animate-in slide-in-from-bottom-2 fade-in">
                                <button
                                    onClick={() => {
                                        if (currentReport) {
                                            setSimulatedReport({ ...currentReport });
                                            onPreviewMTA?.(currentReport.traitAverage); // Reset preview
                                        }
                                        setHistory([]);
                                        setFuture([]);
                                    }}
                                    className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={handleApplyChanges}
                                    className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow-md rounded-lg transition-all flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Apply
                                </button>
                            </div>
                        )}

                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        {/* Tab Bar */}
                        <div className="bg-white border-b border-slate-200 px-4 flex gap-6 sticky top-0 z-10">
                            {['Admin', 'Performance', 'Comments'].map(tab => ( // Simplified tabs for now
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={cn(
                                        "px-2 py-4 text-sm font-medium transition-all border-b-2",
                                        activeTab === tab
                                            ? "text-indigo-600 border-indigo-600"
                                            : "text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-300"
                                    )}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="p-8 pb-32">
                            {activeTab === 'Admin' && (
                                <ReportAdminTab
                                    formData={simulatedReport}
                                    setFormData={setSimulatedReport}
                                    readOnly={isLocked}
                                />
                            )}

                            {activeTab === 'Comments' && (
                                <ReportCommentsTab
                                    formData={simulatedReport}
                                    setFormData={setSimulatedReport}
                                    readOnly={isLocked}
                                />
                            )}

                            {activeTab === 'Performance' && (
                                <div className="space-y-6">
                                    {/* Quick MTA Control for Performance Tab */}
                                    {/* Reusing the slider logic in a card */}
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">
                                            Performance Data (Trait Average)
                                        </h3>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="1.00"
                                                max="5.00"
                                                disabled={isLocked}
                                                className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                value={simulatedMta}
                                                onChange={(e) => handleMtaChange(parseFloat(e.target.value))}
                                            />
                                            <p className="text-xs text-slate-500">
                                                Values update live. Use the Sidebar for granular slider control if preferred.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Recommendation Control */}
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">
                                            Promotion Recommendation
                                        </h3>
                                        <div className="grid grid-cols-6 gap-2">
                                            {(['EP', 'MP', 'P', 'Prog', 'SP', 'NOB'] as const).map(rec => {
                                                const { blocked, reason } = getBlockingStatus(rec);
                                                const isSelected = simulatedRec === rec;
                                                return (
                                                    <button
                                                        key={rec}
                                                        onClick={() => handleRecChange(rec)}
                                                        disabled={blocked || isLocked}
                                                        title={reason}
                                                        className={cn(
                                                            "py-2 px-1 rounded border text-sm font-bold",
                                                            isSelected ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
                                                            blocked && "opacity-40 cursor-not-allowed"
                                                        )}
                                                    >
                                                        {rec}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Shared Save Action for Full Mode */}
                            {Boolean(hasChanges) && (
                                <div className="fixed bottom-0 right-0 w-full xl:w-[65vw] p-4 bg-white/90 backdrop-blur border-t border-slate-200 flex justify-between items-center z-50">
                                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 animate-pulse">
                                        Unsaved Changes
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                if (currentReport) {
                                                    setSimulatedReport({ ...currentReport });
                                                    onPreviewMTA?.(currentReport.traitAverage);
                                                }
                                                setHistory([]);
                                            }}
                                            className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            Discard
                                        </button>
                                        <button
                                            onClick={handleApplyChanges}
                                            className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md rounded-lg transition-all"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
