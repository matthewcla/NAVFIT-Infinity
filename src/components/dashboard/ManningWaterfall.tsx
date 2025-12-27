import { useState, useRef, useEffect, useMemo } from 'react';
import { Target, ChevronsDown, ChevronsUp } from 'lucide-react';
import { GroupHeader } from './GroupHeader';
import { TimelineRow } from './TimelineRow';
import type { SummaryGroup, Member } from '../../types';
import type { RosterMember } from '../../types/roster';
import { CO_DETACH_DATE } from '../../lib/constants';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Align with StrategyScattergram MOCK_START_DATE for "Same Chart" consistency
const START_DATE = new Date('2025-01-01');

const generateTimeline = () => {
    // Start 3 months back from Fixed Start Date
    const startYear = START_DATE.getFullYear();
    const startMonth = START_DATE.getMonth();

    const months = [];
    for (let i = -3; i < 21; i++) { // Total 24 months
        const date = new Date(startYear, startMonth + i, 1);
        months.push({
            label: MONTH_NAMES[date.getMonth()],
            monthIndex: date.getMonth(),
            year: date.getFullYear(),
            index: i + 3
        });
    }
    return months;
};

const TIMELINE_MONTHS = generateTimeline();

interface ManningWaterfallProps {
    summaryGroups?: SummaryGroup[];
    roster?: RosterMember[];
    onOpenReport?: (memberId: string, name: string, rank?: string, reportId?: string) => void;
}

export function ManningWaterfall({ summaryGroups = [], roster = [], onOpenReport }: ManningWaterfallProps) {
    const [activeFilter, setActiveFilter] = useState<'wardroom' | 'cpo' | 'crew'>('wardroom');

    // Derived State: Convert Roster + Reports -> Member[] for Waterfall
    const members = useMemo(() => {
        let effectiveRoster: Member[] = [];

        if (roster && roster.length > 0) {
            effectiveRoster = roster.map(r => ({
                id: r.id,
                name: `${r.rank} ${r.lastName}, ${r.firstName}`,
                rank: r.rank,
                designator: r.designator,
                prd: r.prd,
                milestone: 'TRAINING',
                status: 'Onboard',
                lastTrait: null,
                nextPlan: null,
                target: null,
                history: [] // populated below
            }));
        } else {
            // Derive from Reports
            const uniqueMembers = new Map<string, Member>();
            summaryGroups.forEach(g => {
                g.reports.forEach(r => {
                    const mId = r.memberId || 'unknown';
                    if (!uniqueMembers.has(mId)) {
                        uniqueMembers.set(mId, {
                            id: mId,
                            name: `Member ${mId}`,
                            rank: g.name.split(' ')[0] || 'Unknown',
                            designator: '1110',
                            prd: '2026-01-01',
                            milestone: 'TRAINING',
                            status: 'Onboard',
                            lastTrait: null,
                            nextPlan: null,
                            target: null,
                            history: []
                        });
                    }
                });
            });
            effectiveRoster = Array.from(uniqueMembers.values());
        }

        return effectiveRoster.map(m => {
            // Attach Reports
            const memberReports = summaryGroups.flatMap(g => g.reports).filter(r => r.memberId === m.id);
            return { ...m, history: memberReports };
        });

    }, [roster, summaryGroups]);

    // Filter members based on split
    const filteredMembers = useMemo(() => {
        return members.filter(m => {
            if (activeFilter === 'wardroom') return m.rank.startsWith('O') || m.rank.startsWith('W');
            if (activeFilter === 'cpo') return ['E-7', 'E-8', 'E-9'].includes(m.rank);
            if (activeFilter === 'crew') return m.rank.startsWith('E') && !['E-7', 'E-8', 'E-9'].includes(m.rank);
            return false;
        });
    }, [members, activeFilter]);

    // Grouping Logic
    const groups = useMemo(() => {
        const g: Record<string, Member[]> = {};
        filteredMembers.forEach(m => {
            const key = m.rank === 'E-7' || m.rank === 'E-8' || m.rank === 'E-9' ? `${m.rank} CPO` : `${m.rank} ${m.designator || ''}`;
            if (!g[key]) g[key] = [];
            g[key].push(m);
        });
        return g;
    }, [filteredMembers]);

    // Scroll Logic
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const handleJumpToNow = () => {
        if (scrollContainerRef.current) {
            const COL_WIDTH = 96;
            const currentMonthIndex = 3;
            const scrollX = (currentMonthIndex * COL_WIDTH) - (scrollContainerRef.current.clientWidth / 2) + (COL_WIDTH / 2);
            scrollContainerRef.current.scrollTo({ left: Math.max(0, scrollX), behavior: 'smooth' });
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => handleJumpToNow(), 100);
        return () => clearTimeout(timer);
    }, [activeFilter]);

    // Expand/Collapse State
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [allExpanded, setAllExpanded] = useState(true);

    const toggleAllGroups = () => {
        const newState = !allExpanded;
        setAllExpanded(newState);
        const newGroupState: Record<string, boolean> = {};
        Object.keys(groups).forEach(k => { newGroupState[k] = newState; });
        setExpandedGroups(newGroupState);
    };

    const toggleGroup = (groupKey: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupKey]: prev[groupKey] === undefined ? !allExpanded : !prev[groupKey]
        }));
    };

    // --- Drag and Drop Logic ---
    const [groupOrder, setGroupOrder] = useState<Record<string, string[]>>({});

    // Initialize/Sync groupOrder with current groups
    useEffect(() => {
        setGroupOrder(prev => {
            const newOrder = { ...prev };
            let hasChanges = false;

            Object.entries(groups).forEach(([key, list]) => {
                if (!newOrder[key]) {
                    // Initial sort alphabetical
                    newOrder[key] = list
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(m => m.id);
                    hasChanges = true;
                } else {
                    // Check for new members not in order list
                    const existingIds = new Set(newOrder[key]);
                    const newMembers = list.filter(m => !existingIds.has(m.id));
                    if (newMembers.length > 0) {
                        newOrder[key] = [...newOrder[key], ...newMembers.map(m => m.id)];
                        hasChanges = true;
                    }
                }
            });

            return hasChanges ? newOrder : prev;
        });
    }, [groups]);

    const handleDragStart = (e: React.DragEvent, memberId: string, groupKey: string) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ memberId, groupKey }));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetMemberId: string, targetGroupKey: string) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('text/plain');
        if (!data) return;

        try {
            const { memberId: draggedId, groupKey: sourceGroupKey } = JSON.parse(data);

            if (sourceGroupKey !== targetGroupKey) return; // Constraint: Only same group
            if (draggedId === targetMemberId) return;

            setGroupOrder(prev => {
                const currentOrder = prev[targetGroupKey] ? [...prev[targetGroupKey]] : [];
                const fromIndex = currentOrder.indexOf(draggedId);
                const toIndex = currentOrder.indexOf(targetMemberId);

                if (fromIndex === -1 || toIndex === -1) return prev;

                // Move item
                currentOrder.splice(fromIndex, 1);
                currentOrder.splice(toIndex, 0, draggedId);

                return {
                    ...prev,
                    [targetGroupKey]: currentOrder
                };
            });

        } catch (err) {
            console.error("Drop failed", err);
        }
    };

    // Helper to get sorted list for rendering
    const getSortedGroupList = (key: string, list: Member[]) => {
        const order = groupOrder[key];
        if (!order) return list.sort((a, b) => a.name.localeCompare(b.name));

        // Create map for fast lookup
        const map = new Map(list.map(m => [m.id, m]));

        // Return ordered list, filter out any missing ids (safety)
        const sorted = order.map(id => map.get(id)).filter(Boolean) as Member[];

        // Append any potentially missing members (safety)
        const returnedIds = new Set(sorted.map(m => m.id));
        const missing = list.filter(m => !returnedIds.has(m.id));

        return [...sorted, ...missing];
    };

    return (
        <div className="bg-white border-t border-slate-200 h-full flex flex-col min-h-0">
            {/* Header Controls (Filter etc.) */}
            <div className="px-6 py-2 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
                <div className="flex items-center space-x-4">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Manning & Projections</h3>
                    <div className="flex space-x-1 bg-slate-100 p-0.5 rounded-lg w-fit">
                        {['wardroom', 'cpo', 'crew'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter as any)}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${activeFilter === filter ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'} capitalize`}
                            >
                                {filter === 'cpo' ? 'CPO Mess' : filter}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={toggleAllGroups} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-colors border border-slate-200">
                        {allExpanded ? <ChevronsUp size={16} /> : <ChevronsDown size={16} />}
                    </button>
                    <button onClick={handleJumpToNow} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-md transition-colors border border-slate-200">
                        <Target size={16} />
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div ref={scrollContainerRef} className="flex-1 overflow-auto custom-scrollbar relative">
                <div className="min-w-max">
                    <div className="flex bg-slate-50 border-b border-slate-200 sticky top-0 z-30 text-xs font-semibold text-slate-500 uppercase tracking-wider h-8 items-center">
                        <div className="w-80 px-6 shrink-0 sticky left-0 bg-slate-50 border-r border-slate-200 z-40 h-full flex items-center shadow-[1px_0_4px_-1px_rgba(0,0,0,0.1)]">
                            <div className="w-8 text-center text-slate-400 mr-2 shrink-0">#</div>
                            <div className="text-right flex-1">Member</div>
                        </div>
                        <div className="flex flex-1">
                            {TIMELINE_MONTHS.map((m, i) => (
                                <div key={i} className="w-24 px-2 text-center shrink-0 border-r border-slate-100 last:border-0 text-[10px]">
                                    {m.label} '{m.year.toString().slice(2)}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-50/30">
                        {Object.entries(groups).map(([groupTitle, groupList]) => {
                            const isExpanded = expandedGroups[groupTitle] !== undefined ? expandedGroups[groupTitle] : allExpanded;

                            return (
                                <div key={groupTitle}>
                                    <GroupHeader
                                        title={groupTitle}
                                        count={groupList.length}
                                        isExpanded={isExpanded}
                                        onToggle={() => toggleGroup(groupTitle)}
                                        trendPoints={[]}
                                        targetRange={{ min: 3.8, max: 4.0 }}
                                        timelineMonths={TIMELINE_MONTHS}
                                    />
                                    {isExpanded && getSortedGroupList(groupTitle, groupList).map((member, idx) => (
                                        <TimelineRow
                                            key={member.id}
                                            member={member}
                                            coDetachDate={CO_DETACH_DATE}
                                            avgRSCA={3.5}
                                            timelineMonths={TIMELINE_MONTHS}
                                            onOpenReport={(reportId) => {
                                                if (onOpenReport) onOpenReport(member.id, member.name, member.rank, reportId);
                                            }}
                                            rankIndex={idx + 1}
                                            isDraggable={true}
                                            onDragStart={(e: React.DragEvent) => handleDragStart(e, member.id, groupTitle)}
                                            onDragOver={handleDragOver}
                                            onDrop={(e: React.DragEvent) => handleDrop(e, member.id, groupTitle)}
                                        />
                                    ))}
                                </div>
                            );
                        })}
                        {filteredMembers.length === 0 && (
                            <div className="p-12 text-center text-slate-400">
                                No members found for this filter.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
