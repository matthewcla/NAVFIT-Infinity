import { useState, useMemo } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from '@/features/strategy/hooks/useSummaryGroups';
import { User, FileText, History, Search, Users, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { getCompetitiveCategory, getCategoryLabel } from '@/features/strategy/logic/competitiveGroupUtils';

import { PageShell, PageHeader, PageContent } from '@/components/layout/PageShell';
import { ContextSidebar } from '@/components/layout/ContextSidebar';

export function SailorProfiles() {
    const { roster } = useNavfitStore();
    const summaryGroups = useSummaryGroups();

    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        'URL': true,
        'RL': true,
        'IWL': true,
        'STAFF': true,
        'LDO': true,
        'CWO': true,
        'RES LDO/CWO': true,
        'Unknown': true
    });

    const toggleGroup = (groupLabel: string) => {
        setOpenGroups(prev => ({ ...prev, [groupLabel]: !prev[groupLabel] }));
    };

    // Flatten reports from summary groups for detail view
    const reports = useMemo(() => summaryGroups.flatMap(g => g.reports), [summaryGroups]);

    const selectedMember = useMemo(() =>
        selectedMemberId ? roster.find(m => m.id === selectedMemberId) : null
        , [selectedMemberId, roster]);

    const memberReports = useMemo(() =>
        selectedMember ? reports.filter(r => r.memberId === selectedMember.id) : []
        , [selectedMember, reports]);

    // Grouping Logic
    const groupedRoster = useMemo(() => {
        const groups: Record<string, typeof roster> = {};

        // Filter first
        const filtered = roster.filter(m => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            const fullName = `${m.lastName}, ${m.firstName}`.toLowerCase();
            return fullName.includes(q) ||
                m.rank.toLowerCase().includes(q) ||
                m.designator.toLowerCase().includes(q);
        });

        // Sort by Rank then Name
        const sorted = [...filtered].sort((a, b) => {
            return a.lastName.localeCompare(b.lastName);
        });

        // Distribute into buckets
        sorted.forEach(member => {
            const cat = getCompetitiveCategory(member.designator);
            let label = getCategoryLabel(cat);
            if (!label) label = 'Unknown';
            if (!groups[label]) groups[label] = [];
            groups[label].push(member);
        });

        return groups;
    }, [roster, searchQuery]);

    const groupKeys = Object.keys(groupedRoster).sort();
    const orderedKeys = ['URL', 'RL', 'IWL', 'STAFF', 'LDO', 'CWO', 'RES LDO/CWO', 'Unknown'].filter(k => groupKeys.includes(k));
    groupKeys.forEach(k => {
        if (!orderedKeys.includes(k)) orderedKeys.push(k);
    });


    return (
        <PageShell>
            <PageHeader title="Sailor Profiles" />

            <PageContent>
                {/* Sidebar List */}
                <ContextSidebar className="bg-white">
                    <div className="p-4 border-b border-slate-200">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by name, rank..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {orderedKeys.length === 0 && (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                No sailors found matching your search.
                            </div>
                        )}

                        {orderedKeys.map(groupLabel => {
                            const members = groupedRoster[groupLabel];
                            const isOpen = openGroups[groupLabel];

                            return (
                                <div key={groupLabel} className="border-b border-slate-100 last:border-0">
                                    <button
                                        onClick={() => toggleGroup(groupLabel)}
                                        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1 rounded-md transition-colors ${isOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </div>
                                            <span className="font-semibold text-sm text-slate-700">{groupLabel}</span>
                                            <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                                                {members.length}
                                            </span>
                                        </div>
                                    </button>

                                    {isOpen && (
                                        <div className="bg-slate-50/50">
                                            {members.map(member => (
                                                <div
                                                    key={member.id}
                                                    onClick={() => setSelectedMemberId(member.id)}
                                                    className={`px-4 py-3 border-l-4 cursor-pointer hover:bg-white transition-all ${selectedMemberId === member.id
                                                            ? 'bg-white border-l-indigo-600 shadow-sm z-10 relative'
                                                            : 'border-l-transparent text-slate-600'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className={`font-medium ${selectedMemberId === member.id ? 'text-indigo-900' : 'text-slate-900'}`}>
                                                                {member.lastName}, {member.firstName}
                                                            </div>
                                                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                                                                <span className="font-semibold">{member.rank}</span>
                                                                <span className="text-slate-300">•</span>
                                                                <span>{member.designator}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </ContextSidebar>

                {/* Main Content (Detail View) */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                    {selectedMember ? (
                        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 slide-in-from-bottom-2">
                            {/* Header Profile Card */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-5">
                                    <Users className="w-32 h-32" />
                                </div>

                                <div className="flex items-start gap-6 relative z-10">
                                    <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner border border-indigo-100">
                                        <User className="w-10 h-10" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h1 className="text-2xl font-bold text-slate-900">
                                                {selectedMember.rank} {selectedMember.firstName} {selectedMember.lastName}
                                            </h1>
                                            {selectedMember.milestoneTour && (
                                                <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full border border-indigo-200">
                                                    {selectedMember.milestoneTour}
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                                            <div className="space-y-1">
                                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Designator</div>
                                                <div className="font-medium text-slate-900">{selectedMember.designator}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Paygrade</div>
                                                <div className="font-medium text-slate-900">{selectedMember.payGrade}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Date Reported</div>
                                                <div className="font-medium text-slate-900 flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                    {formatDate(selectedMember.dateReported)}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">PRD</div>
                                                <div className="font-medium text-slate-900 flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                    {formatDate(selectedMember.prd)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Additional Dates Row */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4 pt-4 border-t border-slate-100">
                                            <div className="space-y-1">
                                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">EDA</div>
                                                <div className="font-medium text-slate-700 text-sm">
                                                    {formatDate(selectedMember.eda)}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">EDD</div>
                                                <div className="font-medium text-slate-700 text-sm">
                                                    {formatDate(selectedMember.edd)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Performance / Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Reports on File</div>
                                    <div className="text-2xl font-bold text-slate-900">{memberReports.length}</div>
                                </div>
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Avg Trait Grade</div>
                                    <div className="text-2xl font-bold text-indigo-600">
                                        {memberReports.length > 0
                                            ? (memberReports.reduce((acc, r) => acc + (r.traitAverage || 0), 0) / memberReports.length).toFixed(2)
                                            : 'N/A'
                                        }
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Next Report Due</div>
                                    <div className="text-lg font-bold text-slate-900">
                                        {/* Placeholder logic - could compute from PRD or last report */}
                                        Jan 31, 2026
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium mt-0.5">Periodic</div>
                                </div>
                            </div>

                            {/* Report History Timeline */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                                    <div className="flex items-center gap-2">
                                        <History className="w-5 h-5 text-indigo-600" />
                                        <h3 className="text-base font-bold text-slate-900">Performance History</h3>
                                    </div>
                                </div>

                                {memberReports.length > 0 ? (
                                    <div className="divide-y divide-slate-100">
                                        {memberReports.map(report => (
                                            <div key={report.id} className="p-5 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${report.type === 'Periodic' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                            report.type === 'Detachment' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                                'bg-slate-50 text-slate-600 border-slate-100'
                                                        }`}>
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900 text-sm">{report.type} Report</div>
                                                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                                                            <span>End Date:</span>
                                                            <span className="font-medium text-slate-700">{formatDate(report.periodEndDate)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-8">
                                                    <div className="text-right">
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trait Avg</div>
                                                        <div className="font-bold text-slate-900 text-sm">{report.traitAverage ? report.traitAverage.toFixed(2) : '-'}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RSCA</div>
                                                        <div className="font-bold text-slate-900 text-sm">{report.rscaAtTime ? report.rscaAtTime.toFixed(2) : '-'}</div>
                                                    </div>
                                                    <button className="opacity-0 group-hover:opacity-100 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-100 transition-all">
                                                        View Details
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-12 text-center">
                                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <p className="text-slate-900 font-medium">No reports generated yet</p>
                                        <p className="text-slate-500 text-sm mt-1">Adjust the Roster or RS Dates to generate drafts.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-200">
                                <User className="w-10 h-10 text-slate-300" />
                            </div>
                            <p className="text-lg font-medium text-slate-900">Select a sailor</p>
                            <p className="text-sm text-slate-500 mt-1">View comprehensive profile details and history</p>
                        </div>
                    )}
                </div>
            </PageContent>
        </PageShell>
    );
}
