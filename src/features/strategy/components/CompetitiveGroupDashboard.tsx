import { useState, useMemo } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { format } from 'date-fns';
import {
    Orbit,
    ChevronRight,
    TrendingUp,
    Filter,
    Layers
} from 'lucide-react';
import { PageShell, PageHeader, PageContent } from '@/components/layout/PageShell';
import { ContextSidebar } from '@/components/layout/ContextSidebar';


export function CompetitiveGroupDashboard() {
    const { summaryGroups } = useNavfitStore();
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    // 1. Group Data by Competitive Group Key
    const competitiveGroups = useMemo(() => {
        const groupsByKey = new Map<string, typeof summaryGroups>();

        summaryGroups.forEach(g => {
            const key = g.competitiveGroupKey || 'Uncategorized';
            if (!groupsByKey.has(key)) groupsByKey.set(key, []);
            groupsByKey.get(key)!.push(g);
        });

        // Convert to array for selection list
        return Array.from(groupsByKey.entries()).map(([key, groups]) => {
            // Sort groups by date to find latest/range
            const sorted = [...groups].sort((a, b) => new Date(b.periodEndDate).getTime() - new Date(a.periodEndDate).getTime());
            return {
                key,
                label: key, // Strictly adhere to the summary group title
                groups: sorted,
                lastUpdate: sorted[0]?.periodEndDate,
                totalCycles: groups.length,
            };
        }).sort((a, b) => a.key.localeCompare(b.key));
    }, [summaryGroups]);

    // 2. Derive Timeline Data for Selected Group
    const timelineData = useMemo(() => {
        if (!selectedKey) return null;

        const groups = competitiveGroups.find(c => c.key === selectedKey)?.groups || [];
        // Sort Ascending for Timeline (Left to Right)
        const timelineGroups = [...groups].sort((a, b) => new Date(a.periodEndDate).getTime() - new Date(b.periodEndDate).getTime());

        // Extract all unique members
        const memberMap = new Map<string, { name: string; history: Record<string, any> }>();

        timelineGroups.forEach(g => {
            g.reports.forEach(r => {
                if (!memberMap.has(r.memberId)) {
                    memberMap.set(r.memberId, { name: r.memberName, history: {} });
                }
                // Store report data for this Group ID
                memberMap.get(r.memberId)!.history[g.id] = {
                    mta: r.traitAverage,
                    rec: r.promotionRecommendation,
                    status: r.promotionStatus
                };
            });
        });

        const members = Array.from(memberMap.values()).sort((a, b) => a.name.localeCompare(b.name));

        return {
            groups: timelineGroups,
            members
        };
    }, [selectedKey, competitiveGroups]);


    return (
        <PageShell>
            <PageHeader title="Competitive Groups" />

            <PageContent>
                {/* Sidebar */}
                <ContextSidebar className="bg-white">
                    <div className="p-4 border-b border-slate-200">
                        <div className="flex items-center gap-2 mb-3">
                            <Orbit className="w-5 h-5 text-indigo-600" />
                            <h2 className="text-lg font-bold text-slate-800">Groups</h2>
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                            Select a group to view timeline.
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {competitiveGroups.length === 0 && (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                No groups found.
                            </div>
                        )}

                        <div className="divide-y divide-slate-100">
                            {competitiveGroups.map((cg) => {
                                const isSelected = selectedKey === cg.key;
                                return (
                                    <button
                                        key={cg.key}
                                        onClick={() => setSelectedKey(cg.key)}
                                        className={`w-full text-left p-4 hover:bg-slate-50 transition-colors group border-l-4 ${isSelected
                                            ? 'bg-indigo-50/50 border-l-indigo-600'
                                            : 'border-l-transparent'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`font-semibold text-sm ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                {cg.label}
                                            </span>
                                            {isSelected && <ChevronRight className="w-4 h-4 text-indigo-600" />}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            <div className="flex items-center gap-1">
                                                <Layers className="w-3 h-3" />
                                                <span>{cg.totalCycles} Cycles</span>
                                            </div>
                                            {cg.lastUpdate && (
                                                <div className="flex items-center gap-1">
                                                    <TrendingUp className="w-3 h-3" />
                                                    <span>{format(new Date(cg.lastUpdate), 'MMM yyyy')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </ContextSidebar>


                {/* Main Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
                    {selectedKey ? (
                        <div className="h-full flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">{selectedKey}</h2>
                                    <p className="text-sm text-slate-500">Event-to-Event Timeline</p>
                                </div>
                                <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm">
                                    <Filter className="w-4 h-4" />
                                    Filter
                                </button>
                            </div>

                            {/* Matrix */}
                            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden min-w-max">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="p-4 font-semibold text-slate-600 sticky left-0 bg-slate-50 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                Member
                                            </th>
                                            {timelineData?.groups.map(g => (
                                                <th key={g.id} className="p-4 font-semibold text-slate-600 border-r border-slate-100 min-w-[140px]">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm truncate max-w-[120px]" title={g.name}>{g.name}</span>
                                                        <span className="text-xs text-slate-400 font-normal">{format(new Date(g.periodEndDate), 'MMM yyyy')}</span>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {timelineData?.members.map((m) => (
                                            <tr key={m.name} className="border-b border-slate-100 hover:bg-slate-50/50">
                                                <td className="p-3 font-medium text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                    {m.name}
                                                </td>
                                                {timelineData?.groups.map(g => {
                                                    const data = m.history[g.id];
                                                    return (
                                                        <td key={g.id} className="p-3 border-r border-slate-100 text-center">
                                                            {data ? (
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-sm font-bold text-slate-700">{data.mta.toFixed(2)}</span>
                                                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded leading-none mt-1 ${data.rec === 'EP' ? 'bg-indigo-100 text-indigo-700' :
                                                                        data.rec === 'MP' ? 'bg-slate-100 text-slate-700' :
                                                                            'bg-slate-50 text-slate-500'
                                                                        }`}>
                                                                        {data.rec}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-300">-</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                        {timelineData?.members.length === 0 && (
                                            <tr>
                                                <td colSpan={(timelineData?.groups.length || 0) + 1} className="p-8 text-center text-slate-400">
                                                    No member data found for this timeline.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-200">
                                <Orbit className="w-10 h-10 text-slate-300" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Select a Competitive Group</h2>
                            <p className="text-slate-500 max-w-md text-center">
                                Choose a group from the sidebar to view its long-range progression and event-to-event timelines.
                            </p>
                        </div>
                    )}
                </div>
            </PageContent>
        </PageShell>
    );
}
