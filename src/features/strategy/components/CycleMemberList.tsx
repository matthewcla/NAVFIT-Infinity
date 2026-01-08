import { useRef } from 'react';
import { Sparkles, Check, X } from 'lucide-react';
import { MemberReportRow } from './MemberReportRow';
import type { Report } from '@/types';


export interface RankedMember {
    id: string;
    reportId: string;
    name: string;
    rank: string;
    designator: string;
    promRec: string;
    mta: number;
    delta: number;
    rscaMargin: number;
    eotMta?: number;
    reportsRemaining: number | undefined;
    report: Report;
}

interface CycleMemberListProps {
    isEnlisted: boolean; // Explicit control from parent
    rankedMembers: RankedMember[];
    localOrderedMembers: RankedMember[] | null;
    setLocalOrderedMembers: (members: RankedMember[] | null) => void;
    draggedReportId: string | null;
    setDraggedReportId: (id: string | null) => void;
    activeGroupId: string;
    selectedMemberId: string | null;
    onSelectMember: (id: string | null) => void;
    onReorderMembers: (groupId: string, reportId: string, newOrderIds: string[]) => void;
    setDraggingItemType: (type: string | null) => void;

    // Optimization Controls
    onOptimize?: () => void;
    onAcceptOptimization?: () => void;
    onCancelOptimization?: () => void;
    isOptimizing?: boolean;
    hasProposedReports?: boolean;
}

export function CycleMemberList({
    isEnlisted,
    rankedMembers,
    localOrderedMembers,
    setLocalOrderedMembers,
    draggedReportId,
    setDraggedReportId,
    activeGroupId,
    selectedMemberId,
    onSelectMember,
    onReorderMembers,

    setDraggingItemType,
    onOptimize,
    onAcceptOptimization,
    onCancelOptimization,
    isOptimizing = false,
    hasProposedReports = false
}: CycleMemberListProps) {

    const membersToRender = localOrderedMembers || rankedMembers;
    const listContainerRef = useRef<HTMLDivElement>(null);

    return (
        <div ref={listContainerRef} className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-white text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="w-10 px-0 py-3 border-b border-slate-200 text-center"></th> {/* Drag Handle */}
                        <th className="px-4 py-3 border-b border-slate-200 w-12 text-center">#</th>
                        <th className="w-8 px-0 py-3 border-b border-slate-200 text-center"></th> {/* Lock Toggle */}
                        <th className="px-4 py-3 border-b border-slate-200 text-left w-[25%]">Name</th>
                        <th className="px-4 py-3 border-b border-slate-200 text-center w-24">
                            {isEnlisted ? 'Rate/Rank' : 'Desig'}
                        </th>
                        <th className="px-4 py-3 border-b border-slate-200 text-center w-16" title="Projected reports remaining until PRD"># Rpts</th>
                        <th className="px-4 py-3 border-b border-slate-200 text-center w-16">Rec</th>
                        <th className="px-4 py-3 border-b border-slate-200 text-center w-20">MTA</th>
                        <th className="px-4 py-3 border-b border-slate-200 text-center w-20">Delta</th>
                        <th className="px-4 py-3 border-b border-slate-200 text-center w-20">Margin</th>
                        <th className="px-4 py-3 border-b border-slate-200 text-center w-20" title="Projected End of Tour MTA">Proj. EOT</th>
                        <th className="w-10 px-0 py-3 border-b border-slate-200 text-center"></th> {/* Trash Button */}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {membersToRender.map((member, idx) => (
                        <MemberReportRow
                            key={member.id}
                            id={member.id}
                            reportId={member.reportId}
                            groupId={activeGroupId}
                            index={idx}
                            name={member.name}
                            designator={isEnlisted ? member.rank : member.designator}
                            reportsRemaining={member.reportsRemaining}
                            promRec={member.promRec}
                            mta={member.mta}
                            delta={member.delta}
                            rscaMargin={member.rscaMargin}
                            eotMta={member.eotMta || 0}
                            isSelected={selectedMemberId === member.id}
                            onClick={() => onSelectMember(selectedMemberId === member.id ? null : member.id)}

                            // Drag & Reorder Props
                            draggedReportId={draggedReportId}
                            localOrderedMembers={localOrderedMembers}
                            setLocalOrderedMembers={setLocalOrderedMembers}
                            setDraggedReportId={setDraggedReportId}
                            setDraggingItemType={setDraggingItemType}
                            rankedMembers={rankedMembers}
                            onReorderMembers={hasProposedReports ? undefined : onReorderMembers}
                        />
                    ))}
                </tbody>
            </table>

            {/* Floating Optimization Controls (Stacked above DevTools) */}
            <div className="fixed bottom-40 right-4 z-50 flex flex-col gap-2 items-end">
                {hasProposedReports ? (
                    <>
                        <button
                            onClick={onAcceptOptimization}
                            className="bg-emerald-600 text-white p-2.5 rounded-full shadow-lg hover:bg-emerald-500 tooltip transition-all"
                            title="Accept Proposed Strategy"
                        >
                            <Check size={20} />
                        </button>
                        <button
                            onClick={onCancelOptimization}
                            className="bg-rose-600 text-white p-2.5 rounded-full shadow-lg hover:bg-rose-500 tooltip transition-all"
                            title="Discard Changes"
                        >
                            <X size={20} />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={onOptimize}
                        disabled={isOptimizing}
                        className={`p-2.5 rounded-full shadow-lg transition-all text-white ${isOptimizing ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                        title="Optimize MTA Distribution"
                    >
                        {isOptimizing ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Sparkles size={20} />
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
