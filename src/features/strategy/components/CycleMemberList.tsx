import { GripVertical, Lock } from 'lucide-react';
import { PromotionBadge } from './PromotionBadge';
import { MemberReportRow } from './MemberReportRow';
import type { Report } from '@/types';
import { useNavfitStore } from '@/store/useNavfitStore';

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
    reportsRemaining: number | undefined;
    report: Report;
}

interface CycleMemberListProps {
    isRankingMode: boolean;
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
}

export function CycleMemberList({
    isRankingMode,
    rankedMembers,
    localOrderedMembers,
    setLocalOrderedMembers,
    draggedReportId,
    setDraggedReportId,
    activeGroupId,
    selectedMemberId,
    onSelectMember,
    onReorderMembers,
    setDraggingItemType
}: CycleMemberListProps) {

    const membersToRender = localOrderedMembers || rankedMembers;
    const { selectMember } = useNavfitStore(); // Used for close on drag

    return (
        <div className="flex-1 overflow-y-auto">
            {isRankingMode && (
                <div className="sticky top-0 z-20 bg-indigo-50 border-b border-indigo-100 px-4 py-2 text-xs font-medium text-indigo-700 flex items-center justify-center">
                    Drag to reorder members by performance. Grades and projected RSCA will update automatically.
                </div>
            )}
            <table className="w-full text-left border-collapse">
                <thead className="bg-white text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                    {isRankingMode ? (
                        <tr>
                            <th className="px-4 py-3 border-b border-slate-200 w-12 text-center">#</th>
                            <th className="w-10 px-0 py-3 border-b border-slate-200 text-center"></th>
                            <th className="px-4 py-3 border-b border-slate-200 text-left">Name</th>
                            <th className="px-4 py-3 border-b border-slate-200 text-center font-mono">Proj. MTA</th>
                            <th className="px-4 py-3 border-b border-slate-200 text-center">Rec</th>
                        </tr>
                    ) : (
                        <tr>
                            <th className="px-4 py-3 border-b border-slate-200 w-12 text-center">#</th>
                            <th className="w-8 px-0 py-3 border-b border-slate-200"></th>
                            <th className="px-4 py-3 border-b border-slate-200 text-left">Name</th>
                            <th className="px-4 py-3 border-b border-slate-200 text-center">
                                {membersToRender.length > 0 && membersToRender[0].report?.grade?.startsWith('E')
                                    ? 'Rate/Rank'
                                    : 'Desig'}
                            </th>
                            <th className="px-4 py-3 border-b border-slate-200 text-center" title="Projected reports remaining until PRD"># Rpts</th>
                            <th className="px-4 py-3 border-b border-slate-200 text-center">Rec</th>
                            <th className="px-4 py-3 border-b border-slate-200 text-center">MTA</th>
                            <th className="px-4 py-3 border-b border-slate-200 text-center">Delta</th>
                            <th className="px-4 py-3 border-b border-slate-200 text-center">Margin</th>
                        </tr>
                    )}
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {isRankingMode ? (
                        membersToRender.map((member, idx) => (
                            <tr
                                key={member.reportId}
                                draggable={!member.report.isLocked}
                                onDragStart={(e) => {
                                    if (member.report.isLocked) {
                                        e.preventDefault();
                                        return;
                                    }
                                    // Close Sidebar on Drag Start
                                    selectMember(null);

                                    setLocalOrderedMembers(rankedMembers);
                                    setDraggedReportId(member.reportId);
                                    e.dataTransfer.setData('text/plain', member.reportId);
                                    e.dataTransfer.effectAllowed = 'move';
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';

                                    if (!localOrderedMembers || !draggedReportId) return;

                                    const draggedIndex = localOrderedMembers.findIndex(m => m.reportId === draggedReportId);
                                    const hoverIndex = idx;

                                    // Check if target slot is occupied by a locked member?
                                    // Reordering logic here is simple array splice.
                                    // If I drop "above" a locked member, it should just shift.
                                    // But if I "swap" with a locked member...
                                    // This logic just reorders the list.
                                    // Strict sorting will happen on drop when we calculate MTAs.

                                    if (draggedIndex === -1 || draggedIndex === hoverIndex) return;

                                    const newOrder = [...localOrderedMembers];
                                    const [reorderedItem] = newOrder.splice(draggedIndex, 1);
                                    newOrder.splice(hoverIndex, 0, reorderedItem);

                                    setLocalOrderedMembers(newOrder);
                                }}
                                onDragEnd={() => {
                                    setDraggedReportId(null);
                                    setLocalOrderedMembers(null);
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (draggedReportId && localOrderedMembers && activeGroupId) {
                                        const finalOrderIds = localOrderedMembers.map(m => m.reportId);
                                        onReorderMembers(activeGroupId, draggedReportId, finalOrderIds);
                                    }
                                    setDraggedReportId(null);
                                    setLocalOrderedMembers(null);
                                }}
                                className={`group bg-white border-b border-slate-100 last:border-0 transition-colors ${member.report.isLocked ? 'cursor-default' : 'cursor-move'} ${draggedReportId === member.reportId
                                    ? 'opacity-50 bg-slate-50 ring-2 ring-inset ring-indigo-500/20 z-10 relative'
                                    : 'hover:bg-slate-50'
                                    }`}
                            >
                                <td className="px-4 py-3 text-center text-sm font-medium text-slate-500 w-12">
                                    {idx + 1}
                                </td>
                                <td className="w-10 px-2 py-3 text-center">
                                    {member.report.isLocked ? (
                                        <div className="flex items-center justify-center p-1 text-red-400">
                                            <Lock className="w-3.5 h-3.5" />
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center p-1 rounded hover:bg-slate-200/50 text-slate-400 group-hover:text-slate-600 transition-colors cursor-grab active:cursor-grabbing">
                                            <GripVertical className="w-4 h-4" />
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                    {member.name}
                                    <span className="ml-2 text-xs font-normal text-slate-400">{member.rank}</span>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600 text-center font-mono">
                                    {member.mta.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <PromotionBadge recommendation={member.promRec} size="sm" />
                                </td>
                            </tr>
                        ))
                    ) : (
                        rankedMembers.map((member, idx) => (
                            <MemberReportRow
                                key={member.id}
                                id={member.id}
                                reportId={member.reportId}
                                groupId={activeGroupId}
                                index={idx}
                                name={member.name}
                                designator={member.designator}
                                reportsRemaining={member.reportsRemaining}
                                promRec={member.promRec}
                                mta={member.mta}
                                delta={member.delta}
                                rscaMargin={member.rscaMargin}
                                isSelected={selectedMemberId === member.id}
                                isRankMode={false}
                                onClick={() => onSelectMember(selectedMemberId === member.id ? null : member.id)}
                                onDragStart={(e, data) => {
                                    setDraggingItemType('member_report');
                                    e.dataTransfer.setData('member_report', JSON.stringify(data));
                                }}
                                onDragEnd={() => setDraggingItemType(null)}
                            />
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
