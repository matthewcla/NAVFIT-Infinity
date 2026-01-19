import { useState, useMemo } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { format } from 'date-fns';
import {
    Orbit,
    ChevronRight,
    Calendar,
    Users,
    TrendingUp,
    ArrowLeft,
    Filter
} from 'lucide-react';


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
                label: key, // Could use getCategoryLabel if we parsed designator, but key usually holds full info
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

    // VIEW: Selection List
    if (!selectedKey) {
        return (
            <div className="h-full bg-slate-50 p-8 overflow-y-auto">
                <div className="max-w-5xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <Orbit className="w-8 h-8 text-indigo-600" />
                            Competitive Groups
                        </h1>
                        <p className="text-slate-500 mt-2 text-lg">
                            Select a competitive group to view long-range planning and event-to-event progression.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {competitiveGroups.map((cg) => (
                            <button
                                key={cg.key}
                                onClick={() => setSelectedKey(cg.key)}
                                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left flex flex-col group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div className="flex items-center text-slate-400 group-hover:text-indigo-500">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-1">{cg.label}</h3>
                                <div className="space-y-2 mt-4">
                                    <div className="flex items-center text-sm text-slate-500">
                                        <Calendar className="w-4 h-4 mr-2" />
                                        Last Update: {cg.lastUpdate ? format(new Date(cg.lastUpdate), 'MMM d, yyyy') : 'N/A'}
                                    </div>
                                    <div className="flex items-center text-sm text-slate-500">
                                        <TrendingUp className="w-4 h-4 mr-2" />
                                        {cg.totalCycles} Cycles Tracked
                                    </div>
                                </div>
                            </button>
                        ))}

                        {competitiveGroups.length === 0 && (
                            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                                No competitive groups found. Create a summary group to define one.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // VIEW: Timeline Dashboard
    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedKey(null)}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                        title="Back to Groups"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{selectedKey}</h2>
                        <p className="text-sm text-slate-500">Event-to-Event Timeline</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Actions / Filters could go here */}
                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                        <Filter className="w-4 h-4" />
                        Filter
                    </button>
                </div>
            </div>

            {/* Matrix Content */}
            <div className="flex-1 overflow-auto p-6">
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
        </div>
    );
}
