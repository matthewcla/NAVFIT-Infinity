import { useState, useMemo, useEffect } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { PageShell, PageContent } from '@/components/layout/PageShell';
import { ContextSidebar } from '@/components/layout/ContextSidebar';
import { CompetitiveGroupStage } from './CompetitiveGroupStage';
import { CycleWorkspace } from './CycleWorkspace';
import { Orbit, ChevronRight, Layers } from 'lucide-react';

export function CompetitiveGroupManager() {
    const { summaryGroups, activeCompetitiveGroup, selectedCycleId: globalSelectedCycleId, strategyViewMode } = useNavfitStore();
    const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
    const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Sync from Global Navigation (Dashboard Drill-Down)
    useEffect(() => {
        if (strategyViewMode === 'workspace') {
            if (activeCompetitiveGroup) {
                setSelectedGroupKey(activeCompetitiveGroup);
                setIsSidebarCollapsed(true);
            }
            if (globalSelectedCycleId) {
                setSelectedCycleId(globalSelectedCycleId);
            }
        }
    }, [strategyViewMode, activeCompetitiveGroup, globalSelectedCycleId]);

    // Helper: Reset cycle selection when changing group
    const handleGroupSelect = (key: string) => {
        setSelectedGroupKey(key);
        setSelectedCycleId(null);
        setIsSidebarCollapsed(true); // Auto-collapse on selection
    };

    // Group Data by Competitive Group Key
    const competitiveGroups = useMemo(() => {
        const groupsByKey = new Map<string, typeof summaryGroups>();

        summaryGroups.forEach(g => {
            const key = g.competitiveGroupKey || 'Uncategorized';
            if (!groupsByKey.has(key)) groupsByKey.set(key, []);
            groupsByKey.get(key)!.push(g);
        });

        // Convert to array for selection list
        return Array.from(groupsByKey.entries()).map(([key, groups]) => {
            return {
                key,
                label: key, // Strictly adhere to the summary group title
                totalCycles: groups.length,
            };
        }).sort((a, b) => a.key.localeCompare(b.key));
    }, [summaryGroups]);

    return (
        <PageShell>
            {/* Main Layout Container */}
            <PageContent>
                {/* Sidebar List of Groups */}
                <ContextSidebar
                    className="bg-white"
                    isCollapsed={isSidebarCollapsed}
                    onExpand={() => setIsSidebarCollapsed(false)}
                >
                    <div className="h-full flex flex-col">
                        <div className="p-4 border-b border-slate-200 bg-white shrink-0">
                            <div className="flex items-center gap-2 mb-3">
                                <Orbit className="w-5 h-5 text-indigo-600" />
                                <h2 className="text-lg font-bold text-slate-800">Groups</h2>
                            </div>
                            <div className="text-xs text-slate-500 font-medium">
                                Select a competitive group to manage.
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
                                    const isSelected = selectedGroupKey === cg.key;
                                    return (
                                        <button
                                            key={cg.key}
                                            onClick={() => handleGroupSelect(cg.key)}
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
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </ContextSidebar>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                    {selectedCycleId ? (
                        // 1. Cycle Workspace (Drill Down)
                        <CycleWorkspace
                            cycleId={selectedCycleId}
                            onBack={() => setSelectedCycleId(null)}
                        />
                    ) : selectedGroupKey ? (
                        // 2. Group Stage (Landing)
                        <CompetitiveGroupStage
                            groupKey={selectedGroupKey}
                            onSelectCycle={setSelectedCycleId}
                        />
                    ) : (
                        // 3. Empty State
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-200">
                                <Orbit className="w-10 h-10 text-slate-300" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Select a Competitive Group</h2>
                            <p className="text-slate-500 max-w-md text-center">
                                Choose a group from the sidebar to view strategy and cycles.
                            </p>
                        </div>
                    )}
                </div>
            </PageContent>
        </PageShell>
    );
}
