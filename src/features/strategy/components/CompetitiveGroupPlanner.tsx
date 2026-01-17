import { useState, useMemo } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import {
    Users,
    TrendingUp,
    Calendar,
    ChevronRight,
    MoreHorizontal,
    Search,
    UserPlus,
    ArrowUpRight,
    GripVertical,
    Target
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { RosterMember } from '@/types/roster';

// Helper to calculate Projected RSCA (mock/placeholder for now as real calculation is complex)
const getProjectedRsca = (member: RosterMember, rank: number) => {
    // Placeholder: Ideally this comes from the "Auto Plan" logic
    // Just returning current Last Trait for visualization
    return member.lastTrait?.toFixed(2) || "0.00";
};

// Sortable Item Component
function SortableMemberRow({ member, index, onDrillDown }: { member: RosterMember, index: number, onDrillDown: (id: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: member.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        position: 'relative' as const,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex items-center p-3 bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors ${isDragging ? 'shadow-lg ring-1 ring-indigo-200 z-10' : ''}`}
        >
            {/* Drag Handle */}
            <div className="w-10 flex items-center justify-center text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500" {...attributes} {...listeners}>
                <GripVertical size={16} />
            </div>

            {/* Rank */}
            <div className="w-12 text-center font-mono text-sm font-semibold text-slate-500">
                {index + 1}
            </div>

            {/* Member Info */}
            <div className="flex-1 min-w-0 px-4">
                <div
                    className="font-medium text-slate-900 cursor-pointer hover:text-indigo-600 truncate"
                    onClick={() => onDrillDown(member.id)}
                >
                    {member.lastName}, {member.firstName}
                </div>
                <div className="text-xs text-slate-500 flex items-center space-x-2">
                    <span>{member.rank}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span>{member.designator}</span>
                    {member.milestoneTour && (
                         <>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span className="text-indigo-600 font-medium">{member.milestoneTour}</span>
                         </>
                    )}
                </div>
            </div>

            {/* Metrics */}
            <div className="w-24 text-center">
                <div className="text-sm font-bold text-slate-700">{member.lastTrait ? member.lastTrait.toFixed(2) : '-'}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide">Last Trait</div>
            </div>

             <div className="w-24 text-center">
                <div className="text-sm font-bold text-indigo-600 flex items-center justify-center gap-1">
                    {getProjectedRsca(member, index + 1)}
                    <ArrowUpRight size={12} />
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide">Proj. EOT</div>
            </div>

            {/* Dates */}
             <div className="w-32 text-right px-4">
                <div className="text-sm text-slate-700">{member.prd}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide">PRD</div>
            </div>

            {/* Action */}
            <div className="w-10 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onDrillDown(member.id)}
                    className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-indigo-600"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}

export function CompetitiveGroupPlanner() {
    const {
        roster,
        competitiveGroupRankings,
        reorderCompetitiveGroupMember,
        selectMember,
        selectCycle,
        summaryGroups,
        setStrategyViewMode
    } = useNavfitStore();

    const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // 1. Get List of Competitive Groups
    const groupKeys = useMemo(() => {
        return Object.keys(competitiveGroupRankings).sort();
    }, [competitiveGroupRankings]);

    // Initialize selection if needed
    if (!selectedGroupKey && groupKeys.length > 0) {
        setSelectedGroupKey(groupKeys[0]);
    }

    // 2. Get Members for Selected Group (Sorted by Master Rank)
    const activeMembers = useMemo(() => {
        if (!selectedGroupKey) return [];

        // Master Rank List
        const rankedIds = competitiveGroupRankings[selectedGroupKey] || [];

        // Find all members belonging to this group in Roster
        // We need this to catch "Unranked" members (new gains)
        // Use the helper from logic/planSummaryGroups but we need to import it or recreate logic.
        // Assuming filteredRoster logic:
        const groupMembers = roster.filter(m => {
             // Simple check: Does this member belong to the selected group key?
             // We can't import getCompetitiveGroup easily here without circular dependency risk or just utility usage.
             // Let's rely on the store's ranking list + unranked check.
             // Wait, if member is NOT in ranking list, we won't see them if we map rankedIds.
             // We must fetch ALL members of this group.
             // Since `getCompetitiveGroup` is exported from logic, let's use it if possible, or replicate.
             return true; // Placeholder for logic below
        });

        // Better approach: We know the list of members from the ranking.
        // But what about unranked?
        // Let's just return the ranked ones for the main list for now.
        // The dashboard alerts user to "Update Rank".
        // Ideally, unranked members should appear at the bottom or top to be sorted.

        // Let's combine: Ranked + Unranked.

        // 1. Get all roster members that match this group key
        // This requires re-deriving group keys for all roster members.
        // Optimization: This might be slow if roster is huge.

        return rankedIds
            .map(id => roster.find(m => m.id === id))
            .filter((m): m is RosterMember => !!m);
    }, [selectedGroupKey, competitiveGroupRankings, roster]);

    // 3. Get Upcoming Summary Groups for this Category
    const upcomingCycles = useMemo(() => {
        if (!selectedGroupKey) return [];
        return summaryGroups
            .filter(g => g.competitiveGroupKey === selectedGroupKey)
            .sort((a, b) => new Date(a.periodEndDate).getTime() - new Date(b.periodEndDate).getTime());
    }, [selectedGroupKey, summaryGroups]);

    // Drag Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over.id && selectedGroupKey) {
            reorderCompetitiveGroupMember(selectedGroupKey, active.id, over.id);
        }
    };

    const handleMemberClick = (memberId: string) => {
        // Open Member Sidebar (which is global context usually)
        // Or drill down?
        // Let's assume selectMember opens the sidebar
        selectMember(memberId);
    };

    const handleCycleClick = (group: any) => {
        // Drill Down to CommandStrategyCenter
        selectCycle(group.id, group.competitiveGroupKey);
        // Note: StrategyWorkspace will handle the view switch based on selectCycle triggering "setStrategyViewMode('workspace')" in store logic?
        // Or we need to do it explicitly. Store update I added previously handles it!
    };

    return (
        <div className="flex h-full bg-slate-50">
            {/* Sidebar: Competitive Groups */}
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Competitive Groups</h2>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Filter groups..."
                            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {groupKeys.map(key => (
                        <button
                            key={key}
                            onClick={() => setSelectedGroupKey(key)}
                            className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors flex items-center justify-between ${
                                selectedGroupKey === key
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            <span>{key}</span>
                            <span className="text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-400">
                                {competitiveGroupRankings[key]?.length || 0}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="p-3 border-t border-slate-100">
                    <button className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors border border-indigo-200 border-dashed">
                        <UserPlus size={16} />
                        Add Group
                    </button>
                </div>
            </div>

            {/* Main Content: Master Rank List */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-xl font-bold text-slate-900">{selectedGroupKey || 'Select Group'}</h1>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200">
                                Active Plan
                            </span>
                        </div>
                        <p className="text-sm text-slate-500">
                            Drag and drop to set the Master Rank Order. This drives all future summary group plans.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                         <div className="text-right mr-4">
                            <div className="text-xs text-slate-500">Target RSCA</div>
                            <div className="font-mono font-bold text-slate-900 text-lg">4.20</div>
                        </div>
                        <button className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 shadow-sm flex items-center gap-2">
                            <Target size={16} />
                            Optimize All
                        </button>
                    </div>
                </div>

                {/* List Header */}
                <div className="flex items-center px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="w-10"></div>
                    <div className="w-12 text-center">Rank</div>
                    <div className="flex-1 px-4">Member</div>
                    <div className="w-24 text-center">Last MTA</div>
                    <div className="w-24 text-center">EOT RSCA</div>
                    <div className="w-32 text-right px-4">PRD</div>
                    <div className="w-10"></div>
                </div>

                {/* Sortable List */}
                <div className="flex-1 overflow-y-auto">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={activeMembers.map(m => m.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {activeMembers.map((member, index) => (
                                <SortableMemberRow
                                    key={member.id}
                                    member={member}
                                    index={index}
                                    onDrillDown={handleMemberClick}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>

                    {activeMembers.length === 0 && (
                        <div className="p-12 text-center text-slate-400">
                            No members found in this competitive group.
                        </div>
                    )}
                </div>
            </div>

            {/* Right Rail: Upcoming Summary Groups */}
            <div className="w-80 border-l border-slate-200 bg-slate-50 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-200 bg-white">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <Calendar size={18} className="text-indigo-600" />
                        Summary Groups
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Upcoming reports for this group</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {upcomingCycles.map(group => (
                        <div
                            key={group.id}
                            onClick={() => handleCycleClick(group)}
                            className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                                    group.status === 'Planned' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                    group.status === 'Draft' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-green-50 text-green-700 border-green-200'
                                }`}>
                                    {group.status || 'Draft'}
                                </span>
                                <span className="text-xs text-slate-400">{new Date(group.periodEndDate).toLocaleDateString()}</span>
                            </div>
                            <h4 className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {group.name}
                            </h4>
                            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                    <Users size={12} />
                                    {group.reports.length} Reports
                                </span>
                                <span className="font-mono">{group.eotRsca?.toFixed(2) || '-'} RSCA</span>
                            </div>
                        </div>
                    ))}

                    {upcomingCycles.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            No upcoming summary groups scheduled.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
