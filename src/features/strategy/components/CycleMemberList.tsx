import { useRef } from 'react';
import { Sparkles, Check, X, Lock, Unlock } from 'lucide-react';
import { MemberReportRow } from './MemberReportRow';
import { useNavfitStore } from '@/store/useNavfitStore';
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
    const { toggleReportLock, setGroupLockState } = useNavfitStore();

    // Determine Lock All State
    // If every rendered member is locked, we show "Locked" state (to unlock).
    // Otherwise (mix or all unlocked), we show "Unlocked" state (to lock).
    // Robust check: valid members only.
    const areAllLocked = membersToRender.length > 0 && membersToRender.every(m => m.report.isLocked);

    const handleToggleAllLocks = () => {
        // If all are locked, unlock all (false).
        // If not all locked (some or none), lock all (true).
        const targetState = !areAllLocked;

        // Commit-on-Lock:
        // Gather current values to save them as permanent anchors
        const valueMap: Record<string, number> = {};
        if (targetState) {
            membersToRender.forEach(m => {
                valueMap[m.reportId] = m.mta;
            });
        }

        setGroupLockState(activeGroupId, targetState, valueMap);
    };

    const handleRowToggleLock = (groupId: string, reportId: string) => {
        // Find the member to get their CURRENT (potentially projected) MTA
        const member = membersToRender.find(m => m.reportId === reportId);
        // If locking, pass the current MTA to commit it.
        // If unlocking, we still pass undefined (or keep existing) handled by store.
        // Actually store expects `toggleReportLock(id, reportId, targetValue?)`
        toggleReportLock(groupId, reportId, member?.mta);
    };

    return (
        <div ref={listContainerRef} className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-white text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="w-12 px-0 py-3 border-b border-slate-200 text-center"></th> {/* Drag Handle */}
                        <th className="w-12 px-0 py-3 border-b border-slate-200 text-center relative group/header">
                            {/* Header Lock Toggle (Swapped Position) - Opacity fixed to always visible */}
                            <button
                                onClick={handleToggleAllLocks}
                                className={`flex items-center justify-center p-1 rounded transition-colors mx-auto ${areAllLocked
                                    ? "text-red-500 hover:bg-red-50"
                                    : "text-slate-300 hover:text-slate-500 hover:bg-slate-100"
                                    }`}
                                title={areAllLocked ? "Unlock All Reports" : "Lock All Reports"}
                            >
                                {areAllLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                        </th>
                        <th className="w-12 px-0 py-3 border-b border-slate-200 text-center">#</th>
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

                            // Locking
                            isLocked={member.report.isLocked || false}
                            onToggleLock={handleRowToggleLock}

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
