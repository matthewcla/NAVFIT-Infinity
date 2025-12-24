import { useState, useRef, useEffect, useMemo } from 'react';
import { Target, ChevronsDown, ChevronsUp } from 'lucide-react';
import { GroupHeader } from './GroupHeader';
import { TimelineRow } from './TimelineRow';
import type { SummaryGroup, Member } from '../../types';
import type { RosterMember } from '../../types/roster';
import { CO_DETACH_DATE } from '../../lib/constants';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const generateTimeline = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const months = [];
    // Start 3 months back
    for (let i = -3; i < 21; i++) { // Total 24 months (3 back, 21 forward)
        const date = new Date(currentYear, currentMonth + i, 1);
        months.push({
            label: MONTH_NAMES[date.getMonth()],
            monthIndex: date.getMonth(),
            year: date.getFullYear(),
            index: i + 3 // 0-based index for array mapping
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
        if (!roster || roster.length === 0) return [];

        return roster.map(rMember => {
            // Find reports for this member
            const memberReports = summaryGroups.flatMap(g => g.reports).filter(r => r.memberId === rMember.id);

            // Map RosterMember to Member (ViewModel)
            const member: Member = {
                id: rMember.id,
                name: `${rMember.rank} ${rMember.lastName}, ${rMember.firstName}`, // Display Name
                rank: rMember.rank,
                designator: rMember.designator,
                prd: rMember.prd,
                // Milestones & Status (Mock logic or derived)
                milestone: 'TRAINING', // Placeholder
                status: 'Onboard',
                lastTrait: null,
                nextPlan: null,
                target: null, // Could infer from history
                history: memberReports
            };
            return member;
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
            // Group Key: Rank (simple) or Rank + Desig
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
            const currentMonthIndex = 3; // Index 3 is 'Now' in our timeline gen
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

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-20 flex justify-between items-center shrink-0">
                <div className="flex items-center space-x-4">
                    <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
                        {['wardroom', 'cpo', 'crew'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter as any)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeFilter === filter ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'} capitalize`}
                            >
                                {filter === 'cpo' ? 'CPO Mess' : filter}
                            </button>
                        ))}
                    </div>
                    <button onClick={toggleAllGroups} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-colors border border-slate-200">
                        {allExpanded ? <ChevronsUp size={18} /> : <ChevronsDown size={18} />}
                    </button>
                </div>
                <button onClick={handleJumpToNow} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-md transition-colors border border-slate-200">
                    <Target size={18} />
                </button>
            </div>

            {/* Scrollable Content */}
            <div ref={scrollContainerRef} className="flex-1 overflow-auto custom-scrollbar relative">
                <div className="min-w-max">
                    <div className="flex bg-slate-50 border-b border-slate-200 sticky top-0 z-30 text-xs font-semibold text-slate-500 uppercase tracking-wider h-10 items-center">
                        <div className="w-80 px-6 shrink-0 sticky left-0 bg-slate-50 border-r border-slate-200 z-40 h-full flex items-center justify-end shadow-[1px_0_4px_-1px_rgba(0,0,0,0.1)] text-right">
                            Member / Milestone
                        </div>
                        <div className="flex flex-1">
                            {TIMELINE_MONTHS.map((m, i) => (
                                <div key={i} className="w-24 px-2 text-center shrink-0 border-r border-slate-100 last:border-0">
                                    {m.label} <span className="text-[10px] text-slate-400 block font-normal">{m.year}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        {Object.entries(groups).map(([groupTitle, groupList]) => {
                            const isExpanded = expandedGroups[groupTitle] !== undefined ? expandedGroups[groupTitle] : allExpanded;

                            // Mock Trend Points (Placeholder logic)
                            const trendPoints = [
                                { monthIndex: 3, value: 3.5 },
                                { monthIndex: 6, value: 3.6 },
                                { monthIndex: 13, value: 3.8 }
                            ];

                            return (
                                <div key={groupTitle}>
                                    <GroupHeader
                                        title={groupTitle}
                                        count={groupList.length}
                                        isExpanded={isExpanded}
                                        onToggle={() => toggleGroup(groupTitle)}
                                        trendPoints={trendPoints}
                                        targetRange={{ min: 3.8, max: 4.0 }}
                                        timelineMonths={TIMELINE_MONTHS}
                                    />
                                    {isExpanded && groupList.sort((a, b) => a.name.localeCompare(b.name)).map(member => (
                                        <TimelineRow
                                            key={member.id}
                                            member={member}
                                            coDetachDate={CO_DETACH_DATE}
                                            avgRSCA={3.5}
                                            timelineMonths={TIMELINE_MONTHS}
                                            onOpenReport={(reportId) => {
                                                if (onOpenReport) onOpenReport(member.id, member.name, member.rank, reportId);
                                            }}
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
            {/* Footer with Legend */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1.5"><div className="w-3 h-3 bg-blue-500 rounded-full"></div><span>Periodic</span></div>
                    <div className="flex items-center space-x-1.5"><div className="w-3 h-3 bg-red-500 rounded-full"></div><span>Transfer</span></div>
                    <div className="flex items-center space-x-1.5"><div className="w-3 h-3 bg-green-500 rounded-full"></div><span>Promotion</span></div>
                    <div className="flex items-center space-x-1.5"><div className="w-0.5 h-4 bg-purple-500 border-l border-dashed border-purple-500"></div><span>RS Detach</span></div>
                </div>
            </div>
        </div>
    );
}
