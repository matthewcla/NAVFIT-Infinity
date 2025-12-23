import { useState, useRef, useEffect } from 'react';
import { Target, ChevronsDown, ChevronsUp } from 'lucide-react';
// import { Calendar, Plus } from 'lucide-react'; // Removed as this is handled in Dashboard now


import { GroupHeader } from './GroupHeader';
import { TimelineRow } from './TimelineRow';
import type { Member } from '../../types';
import { CO_DETACH_DATE } from '../../lib/constants';

const INITIAL_MEMBERS: Member[] = [
    // O-3 1110 (SWO)
    { id: '1', name: 'LT Mitchell, P.', rank: 'O-3', designator: '1110', milestone: 'DIVO', prd: '2026-06-01', lastTrait: 3.8, nextPlan: 4.0, target: 4.2, status: 'Onboard', history: [] },
    { id: '2', name: 'LT Kazansky, T.', rank: 'O-3', designator: '1110', milestone: 'DH', prd: '2025-08-15', lastTrait: 4.2, nextPlan: 4.5, target: 4.8, status: 'Onboard', history: [] }, // Departing
    { id: '3', name: 'LT Bradshaw, N.', rank: 'O-3', designator: '1110', milestone: 'DIVO', prd: '2027-01-01', lastTrait: 3.6, nextPlan: 3.8, target: 4.0, status: 'Onboard', history: [] },

    // O-4 1110 (SWO)
    { id: '4', name: 'LCDR Metcalf, M.', rank: 'O-4', designator: '1110', milestone: 'XO', prd: '2026-10-01', lastTrait: 4.5, nextPlan: 4.6, target: 4.8, status: 'Onboard', history: [] },

    // Gains
    { id: '5', name: 'LTJG Seresin, J.', rank: 'O-2', designator: '1110', milestone: 'TRAINING', prd: '2028-01-01', lastTrait: null, nextPlan: 'NOB', target: 3.5, status: 'Gain', gainDate: '2025-04-01', history: [] },

    // E-6
    { id: '6', name: 'PO1 Floyd, B.', rank: 'E-6', rating: 'OS', milestone: 'LPO', prd: '2026-03-15', lastTrait: 3.8, nextPlan: 4.0, target: 4.14, status: 'Onboard', history: [] },
    { id: '7', name: 'PO1 Trace, R.', rank: 'E-6', rating: 'BM', milestone: 'LPO', prd: '2025-11-30', lastTrait: 4.0, nextPlan: 4.2, target: 4.3, status: 'Onboard', history: [] },
];

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

export function ManningWaterfall() {
    const [activeFilter, setActiveFilter] = useState<'wardroom' | 'cpo' | 'crew'>('wardroom');
    const [members] = useState<Member[]>(INITIAL_MEMBERS);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Auto-Scroll Logic
    const handleJumpToNow = () => {
        if (scrollContainerRef.current) {
            // Current Month is always Index 3 (based on TIMELINE_MONTHS generation being 3 months back)
            // 96px per column (w-24)
            // We want to center the 4th column (index 3)
            const COL_WIDTH = 96;
            const currentMonthIndex = 3;
            // Center logic: (targetX) - (viewport / 2) + (col / 2)
            const scrollX = (currentMonthIndex * COL_WIDTH) - (scrollContainerRef.current.clientWidth / 2) + (COL_WIDTH / 2);

            scrollContainerRef.current.scrollTo({
                left: Math.max(0, scrollX),
                behavior: 'smooth'
            });
        }
    };

    // Initial Scroll
    useEffect(() => {
        const timer = setTimeout(() => {
            handleJumpToNow();
        }, 100);
        return () => clearTimeout(timer);
    }, [activeFilter]); // Re-run if filter changes cause layout shift? Maybe not needed but safe.

    // State for expanded groups
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Global Expand/Collapse
    const [allExpanded, setAllExpanded] = useState(true);
    const toggleAllGroups = () => {
        const newState = !allExpanded;
        setAllExpanded(newState);
        // Force all to this state
        const newGroupState: Record<string, boolean> = {};
        Object.keys(groups).forEach(k => {
            newGroupState[k] = newState;
        });
        setExpandedGroups(newGroupState);
    };

    // Toggle Handler
    const toggleGroup = (groupKey: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupKey]: prev[groupKey] === undefined ?
                (allExpanded ? false : true) // If undefined, it follows the global state, so toggle the opposite of current global? No, it follows "All Expanded" state
                : !prev[groupKey]
        }));
    };

    // Filter members based on split
    // Wardroom: O-?, W-?
    // CPO Mess: E-7, E-8, E-9
    // Crew: E-1 to E-6
    const wardroomMembers = members.filter(m => m.rank.startsWith('O') || m.rank.startsWith('W'));
    const cpoMembers = members.filter(m => ['E-7', 'E-8', 'E-9'].includes(m.rank));
    const crewMembers = members.filter(m => {
        if (!m.rank.startsWith('E')) return false;
        // Check if NOT cpo
        return !['E-7', 'E-8', 'E-9'].includes(m.rank);
    });

    // Grouping Logic
    const groupMembers = (list: Member[]) => {
        const groups: Record<string, Member[]> = {};
        list.forEach(m => {
            // Group Key: Rank + Designator/Rating
            const key = `${m.rank} - ${m.designator || m.rating || ''}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(m);
        });
        return groups;
    };

    let currentList: Member[] = [];
    if (activeFilter === 'wardroom') currentList = wardroomMembers;
    else if (activeFilter === 'cpo') currentList = cpoMembers;
    else currentList = crewMembers;

    const groups = groupMembers(currentList);

    // Initialize expanded state for new groups if needed (optional, or just treat undefined as open)
    // Treating undefined as OPEN by default in the render loop logic below if needed, 
    // but better to initialize.
    // actually, let's just treat undefined as TRUE in the render check.


    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">

            {/* Waterfall Header Controls - Updated Layout */}
            <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-20 flex justify-between items-center shrink-0">

                {/* Left: Toggles & Global Expand */}
                <div className="flex items-center space-x-4">
                    {/* Macro Toggles */}
                    <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
                        <button
                            onClick={() => setActiveFilter('wardroom')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeFilter === 'wardroom' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Wardroom
                        </button>
                        <button
                            onClick={() => setActiveFilter('cpo')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeFilter === 'cpo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            CPO Mess
                        </button>
                        <button
                            onClick={() => setActiveFilter('crew')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeFilter === 'crew' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            CREW
                        </button>
                    </div>

                    {/* Expand/Collapse All */}
                    <button
                        onClick={toggleAllGroups}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-colors border border-slate-200"
                        title={allExpanded ? "Collapse All Groups" : "Expand All Groups"}
                    >
                        {allExpanded ? <ChevronsUp size={18} /> : <ChevronsDown size={18} />}
                    </button>
                </div>

                {/* Right: Jump to Now */}
                <button
                    onClick={handleJumpToNow}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-md transition-colors border border-slate-200"
                    title="Jump to Current Month"
                >
                    <Target size={18} />
                </button>
            </div>

            {/* Scrollable Container */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-auto custom-scrollbar relative"
            >
                <div className="min-w-max"> {/* Container to force width */}

                    {/* Timeline Header (Months) */}
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

                    {/* Content Groups */}
                    <div>
                        {Object.entries(groups).map(([groupTitle, groupList]) => {
                            const isExpanded = expandedGroups[groupTitle] !== undefined ? expandedGroups[groupTitle] : allExpanded; // Use global if undefined

                            // RSCA Trend Calculation
                            const validMembers = groupList.filter(m => m.lastTrait);
                            const currentAvg = validMembers.length > 0
                                ? (validMembers.reduce((acc, curr) => acc + (curr.lastTrait || 0), 0) / validMembers.length)
                                : 3.50; // Default Seed for groups with no history

                            // 2. Build mock trend points (Month Index: Value)
                            // Demo: Start Jan (0), dip in Apr (3), recover by Aug (7), end curr
                            const trendPoints = [
                                { monthIndex: 3, value: currentAvg - 0.12 }, // Relative to start of extended timeline
                                { monthIndex: 6, value: currentAvg - 0.05 },
                                { monthIndex: 10, value: currentAvg + 0.02 },
                                { monthIndex: 13, value: currentAvg }
                            ];

                            const mockTargetRange = { min: 3.80, max: 4.00 };

                            return (
                                <div key={groupTitle}>
                                    <GroupHeader
                                        title={groupTitle}
                                        count={groupList.length}
                                        isExpanded={isExpanded}
                                        onToggle={() => toggleGroup(groupTitle)}
                                        trendPoints={trendPoints}
                                        targetRange={mockTargetRange}
                                        timelineMonths={TIMELINE_MONTHS}
                                    />
                                    {isExpanded && groupList.sort((a, b) => (b.lastTrait || 0) - (a.lastTrait || 0)).map(member => (
                                        <TimelineRow
                                            key={member.id}
                                            member={member}
                                            coDetachDate={CO_DETACH_DATE}
                                            avgRSCA={currentAvg}
                                            onReportClick={() => console.log(`Open report for ${member.name}`)}
                                            timelineMonths={TIMELINE_MONTHS}
                                        />
                                    ))}
                                </div>
                            );
                        })}
                        {Object.keys(groups).length === 0 && (
                            <div className="p-12 text-center text-slate-400">
                                No members found for this category.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer with Legend */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs shrink-0">
                <span className="font-semibold text-slate-500 uppercase tracking-wider">Legend</span>
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-1.5">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-slate-600">Periodic</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-slate-600">Loss (Transfer)</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        <span className="text-slate-600">Gain (No Report)</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                        <div className="w-3 h-3 bg-yellow-500 transform rotate-45"></div>
                        <span className="text-slate-600">Special</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-slate-600">Promotion</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                        <div className="w-0.5 h-4 bg-purple-500 border-l border-dashed border-purple-500"></div>
                        <span className="text-slate-600">CO Detach</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
