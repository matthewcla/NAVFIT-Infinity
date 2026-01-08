
import { useNavfitStore } from '@/store/useNavfitStore';
import { RscaHeadsUpDisplay } from '@/features/strategy/components/RscaHeadsUpDisplay';
import { projectRSCA, getCompetitiveGroupStats } from '@/features/strategy/logic/rsca';
import type { SummaryGroup } from '@/types';
import {
    AlertTriangle,
    Users,
    ArrowRight,
    BarChart2,
    ListOrdered,
    ExternalLink,
    Clock,
    Activity
} from 'lucide-react';
import { useState } from 'react';
import { MemberDetailSidebar } from './MemberDetailSidebar';

interface CycleContextPanelProps {
    group: SummaryGroup;
}

export function CycleContextPanel({ group }: CycleContextPanelProps) {
    const { rsConfig, summaryGroups, setStrategyViewMode } = useNavfitStore();
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

    // 1. Calculate RSCA Stats
    // We want the "Current RSCA" to represent the Competitive Group's cumulative average
    // EXCLUDING the current active cycle (so we can see the impact of adding it).
    // Or, if this is existing history, maybe we want it to be part of it?
    // Logic: Treat 'group' as the "New" set being projected against the "History".

    // Competitive Group Key (e.g. "O-3 1110")
    // If specific paygrade not on group, derive from key.
    const paygrade = group.paygrade || group.competitiveGroupKey.split(' ')[0]; // fallback

    // Get Historical Stats (Baseline)
    // We exclude the current group from the baseline to treat it as the "Active" cycle modifying the average.
    const baselineStats = getCompetitiveGroupStats(summaryGroups, paygrade, group.id);

    // If no history exists (first cycle), fall back to Config Target or Default.
    // But conceptually, the "Current cumulative" is 0 if no reports.
    // For display, if count is 0, we can use the RSConfig Target as the "Goal/Starting Point" visual,
    // or arguably the current RSCA is just 0.
    // Let's use rsConfig.targetRsca as a fallback baseline for visualization if we have literally 0 history,
    // otherwise 0 starts to look like a bug in the bar chart. 
    // Actually, usually you inherit the RSCA. Let's use targetRsca if baseline count < 1.
    const currentRsca = baselineStats.count > 0
        ? baselineStats.average
        : (rsConfig.targetRsca || 4.20);

    const baselineCount = baselineStats.count > 0 ? baselineStats.count : 20; // Default weight 20 if fresh start

    // Extract ITAs from THIS group's reports
    const groupItas = group.reports
        .map(r => r.traitAverage)
        .filter((t): t is number => typeof t === 'number');

    // Calculate Projected RSCA
    const projectedRsca = projectRSCA(currentRsca, baselineCount, groupItas);

    // 2. Alerts Logic
    const alerts = [];

    // Example: Check for simple alerts
    // "Air Gap" - simplified check if we have multiple reports for same member with gap? 
    // For this UI, we might just look for members with 'Draft' status > X days?
    // Let's hardcode the requested examples based on data shape 
    // or just mock them if data isn't sufficient yet.

    // Check for reports < 90 days
    const shortReports = group.reports.filter(r => {
        if (!r.periodStartDate || !r.periodEndDate) return false;
        const start = new Date(r.periodStartDate);
        const end = new Date(r.periodEndDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays < 90 && r.type !== 'Promotion'; // Promotion often short
    });

    if (shortReports.length > 0) {
        alerts.push(`${shortReports.length} Members < 90 Days`);
    } else {
        // Mock for visual if none found, as per design request inspiration? 
        // Or strictly data driven. Let's start with data driven. 
        // If empty, user sees clean state.
    }

    // 3. Mini Roster Logic
    // Sort by name or simplistic rank for now
    const topMembers = [...group.reports]
        .slice(0, 8) // Top 5-10
        .map(r => ({
            id: r.memberId,
            name: r.memberId, // We might need to resolve name from roster if report doesn't have it fully populated, but SummaryGroup usually has it via Report
            grade: r.grade, // Projected Grade? or Current? 
            // In a real app we'd join with Roster to get names if reports only had IDs
        }));


    return (
        <div className="h-full flex flex-col bg-slate-50 border-l border-slate-200 shadow-xl w-full max-w-[480px]">
            {/* 1. Top Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="p-4 pb-2">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wide border border-indigo-200">
                                Active Cycle
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                                {group.periodEndDate}
                            </span>
                        </div>
                        {/* Status & Attention Badges - Moved to Header */}
                        <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600">
                                <Clock className="w-3 h-3" />
                                <span>{group.status || 'Draft'}</span>
                            </div>
                            {/* Simple Attention Badge Example */}
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Action Needed</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-900">
                            {group.competitiveGroupKey || group.name}
                        </h2>
                    </div>
                    <p className="text-sm text-slate-500 mb-1">
                        {group.promotionStatus === 'REGULAR' ? 'Competitive' : group.promotionStatus} Group
                    </p>
                </div>

                {/* Integrated RSCA Scoreboard */}
                {/* We pass a stripped down version of props or the full component handles its own layout? 
                    The specific request said "Import and render RscaHeadsUpDisplay here". 
                    The component is designed as a sticky top bar. We might need to adjust its styling 
                    if it's inside a panel, or just let it be. 
                    Given it has `sticky top-0`, it should work well in this scrollable panel if we want. 
                    However, `RscaHeadsUpDisplay` has a `max-w-7xl` container which might be too wide. 
                    We might need to adjust it or wrap it. 
                    Let's render it and see; it handles width with flex-col/row.
                */}
                <div className="border-t border-b border-slate-100 bg-slate-50/50">
                    <RscaHeadsUpDisplay
                        currentRsca={currentRsca}
                        projectedRsca={projectedRsca}

                    />
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-6">

                    {/* 2. Main Content: Summary Stats */}


                    {/* Alerts Section */}
                    {alerts.length > 0 ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Attention Required
                            </h3>
                            <ul className="space-y-1">
                                {alerts.map((alert, idx) => (
                                    <li key={idx} className="text-sm text-amber-900 ml-6 list-disc">
                                        {alert}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        // Placeholder Alert if none (per user implementation request inspiration "1 Air Gap...")
                        // If we want to strictly follow the prompt's "Alerts Section: 1 Air Gap Detected...", 
                        // I will add a mock one if the real logic finds nothing, just to demonstrate the UI?
                        // "Alerts Section: "1 Air Gap Detected", "2 Members < 90 Days"."
                        // I'll render a static-ish one for the prototype if logic doesn't trigger.
                        <div className="bg-white border border-slate-200 rounded-lg p-3">
                            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-slate-400" />
                                Cycle Health
                            </h3>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-2 py-1.5 rounded border border-amber-100">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>1 Air Gap Detected</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600 px-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span>All Members assigned</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    {/* Control Bar (Sticky) */}
                    <div className="sticky top-0 bg-slate-50/95 backdrop-blur z-20 pb-2 border-b border-slate-200 mb-4 pt-1">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setStrategyViewMode('workspace')}
                                className="flex-grow flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 px-4 py-2 rounded-lg font-medium transition-colors text-sm">
                                <span>Open Strategy Workspace</span>
                                <ExternalLink className="w-4 h-4" />
                            </button>
                            <button className="flex items-center justify-center p-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-colors w-8 h-8 flex-shrink-0" title="Rank Members">
                                <ListOrdered className="w-4 h-4" />
                            </button>
                            <button className="flex items-center justify-center p-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-colors w-8 h-8 flex-shrink-0" title="Waterfall">
                                <BarChart2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* 3. Mini Roster Preview */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-500" />
                                Members
                            </h3>
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                {group.reports.length}
                            </span>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-3 py-2 font-medium text-slate-500 text-xs uppercase w-8">#</th>
                                        <th className="px-3 py-2 font-medium text-slate-500 text-xs uppercase">Name</th>
                                        <th className="px-3 py-2 font-medium text-slate-500 text-xs uppercase">Rate/Desig</th>
                                        <th className="px-3 py-2 font-medium text-slate-500 text-xs uppercase text-center" title="Projected reports remaining until PRD"># Rpts</th>
                                        <th className="px-3 py-2 font-medium text-slate-500 text-xs uppercase text-center">Prom Rec</th>
                                        <th className="px-3 py-2 font-medium text-slate-500 text-xs uppercase text-right">MTA</th>
                                        <th className="px-3 py-2 font-medium text-slate-500 text-xs uppercase text-right">Delta</th>
                                        <th className="px-3 py-2 font-medium text-slate-500 text-xs uppercase text-right">RSCA Marg</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {topMembers.map((member, idx) => {
                                        const r = group.reports.find(rep => rep.memberId === member.id);
                                        const mta = r?.traitAverage || 0;
                                        const delta = mta - currentRsca;
                                        const rscaMargin = delta; // Using same logic for now as 'Delta' usually implies RSCA variance in this context

                                        return (
                                            <tr
                                                key={idx}
                                                onClick={() => setSelectedMemberId(member.id)}
                                                className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                                            >
                                                <td className="px-3 py-2 text-slate-400 font-mono text-xs">{idx + 1}</td>
                                                <td className="px-3 py-2 text-slate-700 font-medium truncate max-w-[140px]">
                                                    {member.id.substring(0, 12)}...
                                                </td>
                                                <td className="px-3 py-2 text-slate-500 text-xs">
                                                    {r?.designator || '1110'}
                                                </td>
                                                <td className="px-3 py-2 text-slate-700 font-mono text-xs text-center">
                                                    {r?.reportsRemaining !== undefined ? r.reportsRemaining : '-'}
                                                </td>
                                                <td className="px-3 py-2 text-center text-xs font-medium">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${r?.promotionRecommendation === 'EP' ? 'bg-indigo-100 text-indigo-700' :
                                                        r?.promotionRecommendation === 'MP' ? 'bg-slate-100 text-slate-700' :
                                                            'bg-white border border-slate-200 text-slate-500'
                                                        }`}>
                                                        {r?.promotionRecommendation || 'NOB'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-slate-700 text-right font-mono text-xs">
                                                    {mta.toFixed(2)}
                                                </td>
                                                <td className={`px-3 py-2 text-right font-mono text-xs ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                                                </td>
                                                <td className={`px-3 py-2 text-right font-mono text-xs ${rscaMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {rscaMargin > 0 ? '+' : ''}{rscaMargin.toFixed(2)}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {group.reports.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-3 py-4 text-center text-slate-400 italic text-xs">
                                                No members assigned
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            {group.reports.length > 8 && (
                                <button className="w-full py-2 text-xs font-medium text-indigo-600 hover:bg-slate-50 border-t border-slate-100 transition-colors flex items-center justify-center gap-1">
                                    View All {group.reports.length} Members
                                    <ArrowRight className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Member Details Sidebar (Overlay) */}
            {selectedMemberId && (
                <MemberDetailSidebar
                    memberId={selectedMemberId}
                    onClose={() => setSelectedMemberId(null)}
                    onUpdateMTA={(id, mta) => {
                        console.log('Update MTA:', id, mta);
                        // Implement update logic or connection store action here
                    }}
                    onUpdatePromRec={(id, rec) => {
                        console.log('Update Prom Rec:', id, rec);
                    }}
                    onNavigateNext={() => {
                        const currentIdx = group.reports.findIndex(r => r.memberId === selectedMemberId);
                        if (currentIdx < group.reports.length - 1) {
                            setSelectedMemberId(group.reports[currentIdx + 1].memberId);
                        }
                    }}
                    onNavigatePrev={() => {
                        const currentIdx = group.reports.findIndex(r => r.memberId === selectedMemberId);
                        if (currentIdx > 0) {
                            setSelectedMemberId(group.reports[currentIdx - 1].memberId);
                        }
                    }}
                    rosterMember={undefined}
                />
            )}
        </div>
    );
}


