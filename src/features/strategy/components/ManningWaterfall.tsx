import { useState, useRef, useEffect, useMemo } from 'react';
import { WaterfallGroup } from './WaterfallGroup';
import { useMemberDrag } from '../hooks/useMemberDrag';
import type { SummaryGroup, Member } from '@/types';
import type { RosterMember } from '@/types/roster';

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

    onReportUpdate?: (reportId: string, newAverage: number) => void;
    projections?: Record<string, number>;
}

export function ManningWaterfall({ summaryGroups = [], roster = [], onOpenReport, onReportUpdate, projections }: ManningWaterfallProps) {
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
            // Attach Reports & Derive Viz Props
            const memberReports = summaryGroups.flatMap(g => g.reports).filter(r => r.memberId === m.id);

            // Derive nextPlan (Periodic) and target (Transfer/Detachment) from reports
            const periodic = memberReports.find(r => r.type === 'Periodic');
            const detachment = memberReports.find(r => r.type === 'Detachment');

            return {
                ...m,
                history: memberReports,
                nextPlan: periodic ? periodic.traitAverage : null,
                periodicReportId: periodic ? periodic.id : undefined,
                target: detachment ? detachment.traitAverage : null,
                transferReportId: detachment ? detachment.id : undefined
            };
        });

    }, [roster, summaryGroups]);

    // Grouping Logic
    const groups = useMemo(() => {
        const g: Record<string, Member[]> = {};
        members.forEach(m => {
            const key = m.rank === 'E-7' || m.rank === 'E-8' || m.rank === 'E-9' ? `${m.rank} CPO` : `${m.rank} ${m.designator || ''}`;
            if (!g[key]) g[key] = [];
            g[key].push(m);
        });
        return g;
    }, [members]);

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
    }, []);

    // Expand/Collapse State
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (groupKey: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupKey]: prev[groupKey] === undefined ? false : !prev[groupKey]
        }));
    };

    // --- Drag and Drop Logic (Extracted) ---
    const { handleDragStart, handleDragOver, handleDrop, getSortedGroupList } = useMemberDrag(groups);

    return (
        <div className="bg-white border-t border-slate-200 h-full flex flex-col min-h-0">
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
                            const isExpanded = expandedGroups[groupTitle] !== undefined ? expandedGroups[groupTitle] : true;

                            // Get sorted members from wrapper
                            const sortedMembers = getSortedGroupList(groupTitle, groupList);

                            return (
                                <WaterfallGroup
                                    key={groupTitle}
                                    groupTitle={groupTitle}
                                    members={sortedMembers}
                                    isExpanded={isExpanded}
                                    onToggle={() => toggleGroup(groupTitle)}
                                    startDate={START_DATE}
                                    timelineMonths={TIMELINE_MONTHS}
                                    projections={projections}
                                    onOpenReport={onOpenReport}
                                    onReportUpdate={onReportUpdate}
                                    dragHandlers={{
                                        onDragStart: handleDragStart,
                                        onDragOver: handleDragOver,
                                        onDrop: handleDrop
                                    }}
                                />
                            );
                        })}
                        {members.length === 0 && (
                            <div className="p-12 text-center text-slate-400">
                                No members found.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
