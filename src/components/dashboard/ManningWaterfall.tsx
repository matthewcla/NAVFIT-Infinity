import { useState } from 'react';
// import { Calendar, Plus } from 'lucide-react'; // Removed as this is handled in Dashboard now


import { GroupHeader } from './GroupHeader';
import { TimelineRow } from './TimelineRow';
import type { Member } from '../../types';
import { MONTHS, CO_DETACH_DATE } from '../../lib/constants';

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

export function ManningWaterfall() {
    const [activeFilter, setActiveFilter] = useState<'wardroom' | 'cpo' | 'crew'>('wardroom');
    const [members] = useState<Member[]>(INITIAL_MEMBERS);

    // State for expanded groups
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Toggle Handler
    const toggleGroup = (groupKey: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupKey]: prev[groupKey] === undefined ? false : !prev[groupKey] // Default to true (open) if undefined? logic below
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

            {/* Waterfall Header Controls */}
            <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10 flex justify-between items-center">

                {/* Toggles */}
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

                {/* Legend (Moved Inline) */}
                <div className="flex items-center space-x-4 text-xs">
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-slate-600">Periodic</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-slate-600">Loss (Transfer)</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        <span className="text-slate-600">Gain (No Report)</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-yellow-500 transform rotate-45"></div>
                        <span className="text-slate-600">Special</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-slate-600">Promotion</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-0.5 h-4 bg-purple-500 border-l border-dashed border-purple-500"></div>
                        <span className="text-slate-600">CO Detach (Sep 15)</span>
                    </div>
                </div>
            </div>

            {/* Timeline Header (Months) */}
            <div className="grid grid-cols-12 gap-4 bg-slate-50 py-2 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="col-span-3 pl-6">Member / Milestone</div>
                {/* <div className="col-span-2 text-center border-l border-r border-slate-200">Trait Trajectory</div> */}
                <div className="col-span-9 grid grid-cols-12 text-center">
                    {MONTHS.map(m => (
                        <div key={m} className="col-span-1">{m}</div>
                    ))}
                </div>
            </div>

            {/* Content Groups */}
            <div className="overflow-y-auto flex-1 custom-scrollbar">
                {Object.entries(groups).map(([groupTitle, groupList]) => {
                    const isExpanded = expandedGroups[groupTitle] !== false; // Default to true

                    // RSCA Trend Calculation
                    const currentAvg = (groupList.reduce((acc, curr) => acc + (curr.lastTrait || 0), 0) / (groupList.filter(m => m.lastTrait).length || 1));

                    // 2. Build mock trend points (Month Index: Value)
                    // Demo: Start Jan (0), dip in Apr (3), recover by Aug (7), end curr
                    const trendPoints = [
                        { monthIndex: 0, value: currentAvg - 0.12 },
                        { monthIndex: 3, value: currentAvg - 0.05 },
                        { monthIndex: 7, value: currentAvg + 0.02 },
                        { monthIndex: 10, value: currentAvg }
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
                            />
                            {isExpanded && groupList.map(member => (
                                <TimelineRow
                                    key={member.id}
                                    member={member}
                                    coDetachDate={CO_DETACH_DATE}
                                    avgRSCA={currentAvg}
                                    onReportClick={() => console.log(`Open report for ${member.name}`)}
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
    );
}
