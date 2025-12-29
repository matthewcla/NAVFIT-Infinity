import { useState, useRef, useEffect, useMemo } from 'react';
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
    // Default allExpanded is effectively true conceptually, but we removed the toggle.
    // So distinct state is just expandedGroups overrides.

    const toggleGroup = (groupKey: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupKey]: prev[groupKey] === undefined ? false : !prev[groupKey]
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

                            // Calculate Trend Points (RSCA - Running Cumulative Average)
                            // 1. Flatten and Apply Projections
                            const allReports = groupList.flatMap(m => {
                                return m.history.map(r => ({
                                    ...r,
                                    // Use projection if available, else original
                                    effectiveAverage: (projections && projections[r.id] !== undefined)
                                        ? projections[r.id]
                                        : r.traitAverage
                                }));
                            });

                            // 2. Filter Valid & Sort by Date
                            const validReports = allReports.filter(r =>
                                r.effectiveAverage !== null &&
                                r.effectiveAverage !== undefined &&
                                (typeof r.effectiveAverage === 'number' ? r.effectiveAverage > 0 : false)
                            ).sort((a, b) => new Date(a.periodEndDate).getTime() - new Date(b.periodEndDate).getTime());

                            // 3. Calculate Cumulative Average over Time with 90-Day Delay & Batching
                            // We need to map this to "Month Indices" relative to Start Date
                            const timelineStart = new Date(START_DATE);
                            timelineStart.setMonth(timelineStart.getMonth() - 3); // Timeline starts -3 months

                            // Group reports by Date (Batch Logic)
                            const reportsByDate = new Map<string, typeof validReports>();
                            validReports.forEach(r => {
                                const dKey = r.periodEndDate;
                                if (!reportsByDate.has(dKey)) reportsByDate.set(dKey, []);
                                reportsByDate.get(dKey)!.push(r);
                            });

                            // Sort batches by date
                            const sortedDates = Array.from(reportsByDate.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

                            const trendPoints: { monthIndex: number, value: number, isProjected?: boolean }[] = [];

                            // Initialize running stats
                            let runningSum = 0;
                            let runningCount = 0;
                            // Initialize "Current" RSCA before any visible timeline points if possible, 
                            // but for simplicity, we start plotting from the first update or 0.
                            // Better: Calculate the state *before* the timeline window starts if history exists.

                            // We need to process ALL history to get accurate running averages,
                            // then plot them with the delay.

                            // Helper to get month index relative to timeline start
                            const getMonthIndex = (d: Date) => (d.getFullYear() - timelineStart.getFullYear()) * 12 + (d.getMonth() - timelineStart.getMonth());

                            sortedDates.forEach(dateStr => {
                                const batch = reportsByDate.get(dateStr)!;

                                // 1. Calculate new RSCA for this batch
                                batch.forEach(r => {
                                    const val = typeof r.effectiveAverage === 'number' ? r.effectiveAverage : 0;
                                    runningSum += val;
                                    runningCount++;
                                });
                                const newRSCA = runningCount > 0 ? runningSum / runningCount : 0;

                                // 2. Determine WHEN this update applies (90 day delay)
                                const reportDate = new Date(dateStr);
                                const updateDate = new Date(reportDate);
                                updateDate.setDate(updateDate.getDate() + 90); // +90 Days

                                // 3. Plot this point
                                const mIndex = getMonthIndex(updateDate);

                                trendPoints.push({
                                    monthIndex: mIndex,
                                    value: newRSCA
                                });
                            });

                            // Ensure points are sorted by month index (just in case)
                            trendPoints.sort((a, b) => a.monthIndex - b.monthIndex);

                            // "Fill gaps" / Hold value until next change?
                            // actually the visualizer (Recharts or SVG line) usually connects points.
                            // But for "Step" changes, we might want a point immediately before the new one?
                            // For this specific visuals, simple line connection is usually fine, 
                            // OR we want a "step" look. The requirement says "RSCA calculation is based on the batch submission".
                            // The trend line usually just connects points. 

                            // CRITIAL: Ensure we have a starting point at -3 if there was history *before* the first visible update.
                            // If the first update is at month 5, what was the value at month 0?
                            // We should probably inject a start point.
                            if (trendPoints.length > 0) {
                                const firstPt = trendPoints[0];
                                if (firstPt.monthIndex > -3) {
                                    // If we have a first point later, we need to know the "pre-existing" average?
                                    // But since we calculate running average from scratch here, 
                                    // the "previous" was theoretical 0 or whatever the default baseline is, 
                                    // which might look weird dropping from 0 to 3.5.
                                    // Let's assume the FIRST batch establishes the baseline, and we extend it backwards 
                                    // if it's the very first data point we have.
                                    trendPoints.unshift({
                                        monthIndex: -3,
                                        value: firstPt.value
                                    });
                                }
                            }

                            // Filter to visible range (optional, but good for perf) - actually we need off-screen points for lines to draw correctly in/out
                            // We kept -3 to 24 logic essentially.

                            // 4. "Covers the full timeline": Extend last known value to the end
                            if (trendPoints.length > 0) {
                                const lastPt = trendPoints[trendPoints.length - 1];
                                if (lastPt.monthIndex < 23) {
                                    trendPoints.push({
                                        monthIndex: 23,
                                        value: lastPt.value,
                                        isProjected: true
                                    });
                                }
                            }

                            // Calculate Current RSCA (Last Real Point)
                            // If we added a projection point, the "Current" is the value of that point (which is the last real point value)
                            const currentRSCA = trendPoints.length > 0 ? trendPoints[trendPoints.length - 1].value : 3.5;

                            return (
                                <div key={groupTitle}>
                                    <GroupHeader
                                        title={groupTitle}
                                        count={groupList.length}
                                        isExpanded={isExpanded}
                                        onToggle={() => toggleGroup(groupTitle)}
                                        trendPoints={trendPoints}
                                        targetRange={{ min: 3.8, max: 4.2 }}
                                        timelineMonths={TIMELINE_MONTHS}
                                    />
                                    {isExpanded && getSortedGroupList(groupTitle, groupList).map((member, idx) => {
                                        // Periodic Report ID Logic? TimelineRow handles checks.
                                        // Just pass standard props.
                                        const hasReport = true; // Simplified for now, or check real logic

                                        return (
                                            <TimelineRow
                                                key={member.id}
                                                member={member}
                                                coDetachDate={CO_DETACH_DATE}
                                                avgRSCA={currentRSCA}
                                                timelineMonths={TIMELINE_MONTHS}
                                                onOpenReport={(reportId) => {
                                                    if (onOpenReport) onOpenReport(member.id, member.name, member.rank, reportId);
                                                }}
                                                rankIndex={idx + 1}
                                                onDragStart={(e: React.DragEvent) => handleDragStart(e, member.id, groupTitle)}
                                                onDragOver={handleDragOver}
                                                onDrop={(e: React.DragEvent) => handleDrop(e, member.id, groupTitle)}
                                                isDraggable={hasReport}
                                                onReportUpdate={onReportUpdate}
                                                projections={projections}
                                                periodicReportId={(member as any).periodicReportId}
                                                transferReportId={(member as any).transferReportId}
                                            />
                                        );
                                    })}
                                </div>
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
