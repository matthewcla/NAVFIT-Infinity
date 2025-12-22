import { useState } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { KPICard } from './KPICard';
import { GroupHeader } from './GroupHeader';
import { TimelineRow } from './TimelineRow';
import type { Member } from '../../types';
import { MONTHS, CURRENT_YEAR, CO_DETACH_DATE } from '../../lib/constants';

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
    const [activeTab, setActiveTab] = useState<'officer' | 'enlisted'>('officer');
    const [members] = useState<Member[]>(INITIAL_MEMBERS);

    // Filter members based on tab
    const officerMembers = members.filter(m => m.rank.startsWith('O') || m.rank.startsWith('W'));
    const enlistedMembers = members.filter(m => m.rank.startsWith('E'));

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

    const currentList = activeTab === 'officer' ? officerMembers : enlistedMembers;
    const groups = groupMembers(currentList);

    return (
        <>
            {/* Top Header inside Dashboard or Main Layout? 
            Note: Prototype put it in Main Content.
        */}
            <header className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-8 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800">Command Manning & RSCA Projection</h2>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        <Calendar size={14} />
                        <span>Year: {CURRENT_YEAR}</span>
                    </div>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center">
                        <Plus size={16} className="mr-2" />
                        New Report
                    </button>
                </div>
            </header>

            {/* Dashboard Content */}
            <div className="p-8">

                {/* KPI Row */}
                <div className="grid grid-cols-4 gap-6 mb-8">
                    <KPICard title="Pending Reports" value="12" subtext="3 require signature" color="blue" />
                    <KPICard title="Proj. O-3 RSCA" value="3.92" subtext="Current: 3.88 (+0.04)" trend="up" />
                    <KPICard title="Proj. E-6 RSCA" value="4.15" subtext="Current: 4.18 (-0.03)" trend="down" />
                    <KPICard title="Board Eligibility" value="8" subtext="Members 'In-Zone' next 6mo" color="red" />
                </div>

                {/* Waterfall Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">

                    {/* Waterfall Header Controls */}
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                        {/* Tabs */}
                        <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setActiveTab('officer')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'officer' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Officers (WARDROOM)
                            </button>
                            <button
                                onClick={() => setActiveTab('enlisted')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'enlisted' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Enlisted (CPO MESS / CREW)
                            </button>
                        </div>

                        {/* Legend */}
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
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="text-slate-600">Gain</span>
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
                        <div className="col-span-2 text-center border-l border-r border-slate-200">Trait Trajectory</div>
                        <div className="col-span-7 grid grid-cols-12 text-center">
                            {MONTHS.map(m => (
                                <div key={m} className="col-span-1">{m}</div>
                            ))}
                        </div>
                    </div>

                    {/* Content Groups */}
                    <div className="overflow-y-auto max-h-[600px]">
                        {Object.entries(groups).map(([groupTitle, groupList]) => (
                            <div key={groupTitle}>
                                <GroupHeader
                                    title={groupTitle}
                                    count={groupList.length}
                                    avgRSCA={(groupList.reduce((acc, curr) => acc + (curr.lastTrait || 0), 0) / (groupList.filter(m => m.lastTrait).length || 1)).toFixed(2)}
                                />
                                {groupList.map(member => (
                                    <TimelineRow
                                        key={member.id}
                                        member={member}
                                        coDetachDate={CO_DETACH_DATE}
                                    />
                                ))}
                            </div>
                        ))}
                        {Object.keys(groups).length === 0 && (
                            <div className="p-12 text-center text-slate-400">
                                No members found for this category.
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </>
    );
}
