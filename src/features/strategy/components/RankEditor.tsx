
import { useState, useMemo } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import type { SummaryGroup, Report } from '@/types';
import { SortableMemberRow } from './SortableMemberRow';
import { MtaWaterlineWidget } from './MtaWaterlineWidget';
import { Wand2 } from 'lucide-react';

import { optimizeGroup } from '@/features/strategy/logic/rankOptimization';
import { propagateRankToFutureCycles } from '@/features/strategy/logic/rankProjection';
import { useNavfitStore } from '@/store/useNavfitStore';

interface RankEditorProps {
    group: SummaryGroup;
    allPlannedGroups: SummaryGroup[];
    onSaveGroups: (updatedGroups: SummaryGroup[]) => void;
}

export function RankEditor({ group, allPlannedGroups, onSaveGroups }: RankEditorProps) {
    const { updateSummaryGroup } = useNavfitStore();

    // Local State for Rank Order
    const [reports, setReports] = useState<Report[]>(() => {
        if (group.rankOrder && group.rankOrder.length > 0) {
            const map = new Map<string, Report>();
            group.reports.forEach(r => map.set(r.memberId, r));

            const ordered = group.rankOrder
                .map(id => map.get(id))
                .filter(Boolean) as Report[];

            // Append missing
            const orderedIds = new Set(ordered.map(r => r.memberId));
            const missing = group.reports.filter(r => !orderedIds.has(r.memberId));

            return [...ordered, ...missing];
        }
        return [...group.reports].sort((a, b) => b.traitAverage - a.traitAverage);
    });

    // Metric Config State
    const [targetRsca, setTargetRsca] = useState(group.metricConfig?.targetRsca ?? 4.20);
    const [rscaMargin, setRscaMargin] = useState(group.metricConfig?.rscaMargin ?? 0.05);

    // Derived Optimization Preview
    const previewReports = useMemo(() => {
        const tempGroup = {
            ...group,
            reports: reports
        };
        const rankList = reports.map(r => r.memberId);

        return optimizeGroup(tempGroup, rankList, {
            targetRsca,
            rscaMargin
        });
    }, [reports, group, targetRsca, rscaMargin]);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setReports((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleOptimizeAndSave = () => {
        const rankList = reports.map(r => r.memberId);

        // 1. Update Current Group Config
        updateSummaryGroup(group.id, {
            metricConfig: { targetRsca, rscaMargin },
            rankOrder: rankList
        });

        // 2. Propagate
        // We pass the global rank list (this list) to projection service
        // along with config.
        const updatedPlannedGroups = propagateRankToFutureCycles(
            allPlannedGroups,
            group.competitiveGroupKey,
            rankList,
            { targetRsca, rscaMargin, minMtaHike: 0.01, diminishingReturnsThreshold: 0.06 }
        );

        // 3. Save All
        onSaveGroups(updatedPlannedGroups);
    };

    // Calculate current Projected RSCA based on preview
    const projectedRsca = useMemo(() => {
        const active = previewReports.filter(r => r.promotionRecommendation !== 'NOB');
        if (active.length === 0) return 0;
        const sum = active.reduce((acc, r) => acc + r.traitAverage, 0);
        return sum / active.length;
    }, [previewReports]);

    const handleToggleLock = (reportId: string) => {
        setReports(current => current.map(r =>
            r.id === reportId ? { ...r, isLocked: !r.isLocked } : r
        ));
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            {/* Header / Global Actions */}
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700 ml-2">
                    Planning: {group.name}
                </div>

                <button
                    onClick={handleOptimizeAndSave}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer"
                >
                    <Wand2 className="w-4 h-4" />
                    Propagate & Save Period
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Drag Board (Table) */}
                <div className="flex-1 overflow-auto bg-white min-w-[400px]">
                    <div className="p-0">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="w-12 p-3 text-center text-xs font-semibold text-slate-500">Rank</th>
                                    <th className="p-3 text-xs font-semibold text-slate-500">Member</th>
                                    <th className="p-3 text-center text-xs font-semibold text-slate-500">Rec</th>
                                    <th className="p-3 text-center text-xs font-semibold text-slate-500">MTA</th>
                                    <th className="p-3 text-center text-xs font-semibold text-slate-500">Controls</th>
                                </tr>
                            </thead>
                            <tbody>
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={previewReports.map(r => r.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {previewReports.map((report, index) => (
                                            <SortableMemberRow
                                                key={report.id}
                                                id={report.id}
                                                reportId={report.id}
                                                memberId={report.memberId}
                                                groupId={group.id}
                                                index={index}
                                                name={report.memberName}
                                                designator={report.designator || ''}
                                                promRec={report.promotionRecommendation}
                                                mta={report.traitAverage}
                                                delta={0}
                                                rscaMargin={0}
                                                isSelected={false}
                                                onClick={() => { }}
                                                isLocked={!!report.isLocked}
                                                onToggleLock={() => handleToggleLock(report.id)}
                                            />
                                        ))}
                                    </SortableContext>
                                </DndContext>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: Strategy Sidebar */}
                <div className="w-[320px] bg-slate-50 border-l border-slate-200 flex flex-col overflow-y-auto">
                    <div className="p-4 space-y-6">
                        {/* 1. Configuration */}
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                            <h3 className="text-sm font-semibold text-slate-800">Optimization Targets</h3>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">Target RSCA</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full text-base font-semibold border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={targetRsca}
                                            onChange={e => setTargetRsca(parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div className="mt-1 text-xs text-slate-400">
                                        Aiming for {targetRsca.toFixed(2)}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">Error Margin</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full text-sm border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={rscaMargin}
                                            onChange={e => setRscaMargin(parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div className="mt-1 text-xs text-slate-400">
                                        Allowable deviation ±{rscaMargin}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Stats / Outcome */}
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Projected Output</label>
                            <div className={`text-2xl font-bold mt-1 ${Math.abs(projectedRsca - targetRsca) <= (rscaMargin + 0.001) ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {projectedRsca.toFixed(2)}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                {projectedRsca > targetRsca + rscaMargin ? 'Over Budget' : projectedRsca < targetRsca - rscaMargin ? 'Under Budget' : 'Within Target'}
                            </div>
                        </div>

                        {/* 3. Waterline Widget */}
                        <div className="h-[280px]">
                            <MtaWaterlineWidget
                                reports={previewReports}
                                targetRsca={targetRsca}
                                rscaMargin={rscaMargin}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
