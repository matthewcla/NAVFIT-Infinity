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
                        <div className="w-80 px-6 shrink-0 sticky left-0 bg-slate-50 border-r border-slate-200 z-40 h-full flex items-center justify-end shadow-[1px_0_4px_-1px_rgba(0,0,0,0.1)] text-right">
                            Member
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
        </div>
    );
}
