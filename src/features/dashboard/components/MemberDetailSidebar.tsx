import { useState, useMemo, useEffect } from 'react';
import { X, User, TrendingUp } from 'lucide-react';
import { useNavfitStore, selectActiveCycle } from '@/store/useNavfitStore';
import { cn } from '@/lib/utils';
// import { Member, Report } from '@/types'; // Assuming types are available globally or we use the ones from store data

interface MemberDetailSidebarProps {
    memberId: string;
    onClose: () => void;
    onUpdateMTA: (memberId: string, newMta: number) => void;
}

export function MemberDetailSidebar({ memberId, onClose, onUpdateMTA }: MemberDetailSidebarProps) {
    const { roster } = useNavfitStore();
    const activeCycle = useNavfitStore(selectActiveCycle);

    // 1. Get Member Data
    const member = useMemo(() =>
        roster.find(m => m.id === memberId),
        [roster, memberId]);

    // 2. Local State for Simulation
    // Initialize with existing report value if present in active cycle, else default
    const existingReport = useMemo(() =>
        activeCycle?.reports.find(r => r.memberId === memberId),
        [activeCycle, memberId]);

    const paramsInitialMta = existingReport?.traitAverage || 3.00; // Default lower bound
    const [simulatedMta, setSimulatedMta] = useState<number>(paramsInitialMta);
    const [simulatedPromo, setSimulatedPromo] = useState<'EP' | 'MP' | 'P'>(
        (existingReport?.promotionRecommendation as 'EP' | 'MP' | 'P') || 'P'
    );

    // Update local state when member changes
    useEffect(() => {
        if (existingReport) {
            setSimulatedMta(existingReport.traitAverage);
            setSimulatedPromo((existingReport.promotionRecommendation as 'EP' | 'MP' | 'P') || 'P');
        } else {
            // Reset if no report found (or new member selected)
            setSimulatedMta(3.00);
            setSimulatedPromo('P');
        }
    }, [existingReport, memberId]);

    if (!member) return null;

    // 3. Derived Data for UI
    const history = member.history || [];
    const last3Reports = history.slice(-3); // Assuming sorted? If not we might need to sort by date. 
    // We'll assume history is chronological or we just take the last 3 in array.

    // 4. Simulation Logic: Projected Group RSCA
    const projectionData = useMemo(() => {
        if (!activeCycle) return { projectedRsca: 0, gap: 0, currentGroupRsca: 0 };

        const reports = activeCycle.reports;
        // Calculate current group average (excluding this member if present, to re-add simulated)
        // Actually, let's just take all *other* reports + this simulated one.
        const otherReports = reports.filter(r => r.memberId !== memberId);

        const sumOtherMta = otherReports.reduce((sum, r) => sum + r.traitAverage, 0);
        const count = otherReports.length + 1; // Including this member

        const projectedGroupRsca = (sumOtherMta + simulatedMta) / count;

        // Gap: How far above/below the NEW group average is this member?
        // "Gap to RSCA" usually means Member MTA - RSCA
        const gap = simulatedMta - projectedGroupRsca;

        return {
            projectedRsca: projectedGroupRsca,
            gap
        };

    }, [activeCycle, memberId, simulatedMta]);


    return (
        <div className="flex flex-col h-full bg-white border-l border-slate-200 shadow-xl w-80 fixed right-0 top-0 bottom-0 z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Member Detail</h2>
                <button
                    onClick={onClose}
                    className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">

                {/* 1. Member Profile Header */}
                <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200 text-slate-400 shadow-inner">
                        <User className="w-10 h-10" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">{member.lastName}, {member.firstName}</h3>
                        <div className="text-sm text-slate-500 font-medium">{member.rank} {member.designator}</div>
                    </div>
                </div>

                {/* 2. History Widget (Sparkline) */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-semibold text-slate-600 uppercase">Performance History</span>
                    </div>
                    {last3Reports.length > 0 ? (
                        <div className="h-16 flex items-end justify-between gap-1 px-1">
                            {/* Simple Bar Chart Sparkline for reliability over messy SVG path math without library */}
                            {last3Reports.map((r, i) => {
                                // Scale bar height: assume range 2.0 to 5.0
                                const heightPct = Math.max(0, Math.min(100, ((r.traitAverage - 2.0) / 3.0) * 100));
                                return (
                                    <div key={r.id || i} className="flex flex-col items-center flex-1 gap-1">
                                        <div className="w-full bg-indigo-100 rounded-sm relative h-full group">
                                            <div
                                                className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-sm transition-all duration-500"
                                                style={{ height: `${heightPct}%` }}
                                            />
                                            {/* Tooltip on hover */}
                                            <div className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none transition-opacity">
                                                {r.traitAverage.toFixed(2)}
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-slate-400">{r.periodEndDate.substring(0, 4)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-16 flex items-center justify-center text-xs text-slate-400 italic">No history available</div>
                    )}
                </div>

                {/* 3. Controls */}
                <div className="space-y-6">
                    {/* Promotion Recommendation */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Recommendation</label>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            {(['EP', 'MP', 'P'] as const).map((rec) => (
                                <button
                                    key={rec}
                                    onClick={() => setSimulatedPromo(rec)}
                                    className={cn(
                                        "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                                        simulatedPromo === rec
                                            ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5"
                                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                    )}
                                >
                                    {rec}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Trait Average Control */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Trait Average</label>
                            <input
                                type="number"
                                step="0.01"
                                min="1.00"
                                max="5.00"
                                value={simulatedMta}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val)) setSimulatedMta(val);
                                }}
                                className="w-20 text-right text-sm font-bold text-slate-900 bg-transparent border-b border-slate-300 focus:border-indigo-500 focus:outline-none p-0.5"
                            />
                        </div>
                        <input
                            type="range"
                            min="3.00"
                            max="5.00"
                            step="0.01"
                            value={simulatedMta}
                            onChange={(e) => setSimulatedMta(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1">
                            <span>3.00</span>
                            <span>4.00</span>
                            <span>5.00</span>
                        </div>
                    </div>
                </div>

                {/* 4. Simulation Results */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 text-white shadow-lg ring-1 ring-white/10">
                    <div className="flex items-center gap-2 mb-4 opacity-75">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Simulation</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <div className="text-[10px] text-slate-400 uppercase">Proj. Group RSCA</div>
                            <div className="text-2xl font-bold font-mono tracking-tight text-emerald-300">
                                {projectionData.projectedRsca.toFixed(2)}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[10px] text-slate-400 uppercase">Gap to RSCA</div>
                            <div className={cn(
                                "text-2xl font-bold font-mono tracking-tight",
                                projectionData.gap > 0 ? "text-blue-300" : "text-amber-300"
                            )}>
                                {projectionData.gap > 0 ? "+" : ""}{projectionData.gap.toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer / Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
                <button
                    onClick={() => {
                        onUpdateMTA(memberId, simulatedMta);
                        // We could also pass promo status back if the handler supported it
                    }}
                    className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm active:transform active:scale-[0.98] transition-all"
                >
                    Apply Changes
                </button>
            </div>
        </div>
    );
}
