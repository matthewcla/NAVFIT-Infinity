import { useState, useMemo, useEffect } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { format } from 'date-fns';
import {
    Orbit,
    ChevronRight,
    TrendingUp,
    Layers
} from 'lucide-react';
import { PageShell, PageHeader, PageContent } from '@/components/layout/PageShell';
import { ContextSidebar } from '@/components/layout/ContextSidebar';
import { RankEditor } from './RankEditor';
import { MtaTrendChart } from './MtaTrendChart';


export function CompetitiveGroupDashboard() {
    const { summaryGroups, updateSummaryGroup } = useNavfitStore();
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

    // 3. Planning Tab Logic
    const [planningGroupId, setPlanningGroupId] = useState<string | null>(null);

    // Derive planned groups for the selected key
    const plannedGroups = useMemo(() => {
        if (!selectedKey) return [];
        return summaryGroups.filter(g =>
            g.competitiveGroupKey === selectedKey &&
            (g.status === 'Planned' || g.status === 'Draft')
        ).sort((a, b) => new Date(a.periodEndDate).getTime() - new Date(b.periodEndDate).getTime());
    }, [selectedKey, summaryGroups]);

    // Auto-select first planned group when switching to planning mode or selection changes
    useEffect(() => {
        if (selectedKey && !planningGroupId) {
            if (plannedGroups.length > 0) {
                setPlanningGroupId(plannedGroups[0].id);
            }
        }
    }, [selectedKey, plannedGroups, planningGroupId]);

    const activePlanningGroup = useMemo(() =>
        summaryGroups.find(g => g.id === planningGroupId),
        [summaryGroups, planningGroupId]);

    const handleSaveGroups = (updatedGroups: typeof summaryGroups) => {
        // Bulk update
        updatedGroups.forEach(g => updateSummaryGroup(g.id, g));
    };

    return (
        <PageShell>
            <PageHeader title="Competitive Groups" />

            <PageContent>
                {/* Sidebar */}
                <ContextSidebar className="bg-white">
                    <div className="p-4 border-b border-slate-200 sticky top-0 z-10 bg-white">
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
                                        onClick={() => {
                                            setSelectedKey(cg.key);
                                            setPlanningGroupId(null);
                                        }}
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
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">{selectedKey}</h2>
                                    <p className="text-sm text-slate-500">Long-range strategy and optimization</p>
                                </div>
                            </div>

                            {/* Main Layout: Trend + Planner */}
                            <div className="flex flex-col gap-8">

                                {/* 1. Trend Analysis */}
                                {timelineData && (
                                    <div className="h-[280px]">
                                        <MtaTrendChart groups={timelineData.groups} />
                                    </div>
                                )}

                                {/* 2. Cycle Planning */}
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-5 h-5 text-slate-400" />
                                        <h3 className="text-lg font-bold text-slate-700">Cycle Planning</h3>
                                    </div>

                                    {/* Cycle Selector */}
                                    {plannedGroups.length > 0 ? (
                                        <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                                            {plannedGroups.map(g => (
                                                <button
                                                    key={g.id}
                                                    onClick={() => setPlanningGroupId(g.id)}
                                                    className={`px-3 py-2 rounded-md text-sm font-medium border flex flex-col items-start min-w-[140px] transition-all ${planningGroupId === g.id
                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <span className="font-bold">{format(new Date(g.periodEndDate), 'MMM yyyy')}</span>
                                                    <span className="text-xs opacity-75">{g.status}</span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-amber-50 text-amber-800 p-4 rounded-md text-sm border border-amber-200">
                                            No future planned cycles found for this group. Run the planner to generate cycles.
                                        </div>
                                    )}

                                    {/* Editor */}
                                    {activePlanningGroup ? (
                                        <div className="min-h-[500px]">
                                            <RankEditor
                                                group={activePlanningGroup}
                                                allPlannedGroups={plannedGroups}
                                                onSaveGroups={handleSaveGroups}
                                            />
                                        </div>
                                    ) : (
                                        <div className="py-12 flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                                            Select a cycle to begin planning
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-200">
                                <Orbit className="w-10 h-10 text-slate-300" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Select a Competitive Group</h2>
                            <p className="text-slate-500 max-w-md text-center">
                                Choose a group from the sidebar to manage long-range strategy.
                            </p>
                        </div>
                    )}
                </div>
            </PageContent>
        </PageShell>
    );
}
