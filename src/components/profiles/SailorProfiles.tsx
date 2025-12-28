import { useState } from 'react';
import type { RosterMember } from '../../types/roster';
import type { Report } from '../../types';
import { User, FileText, History, Search, Users } from 'lucide-react';

interface SailorProfilesProps {
    roster: RosterMember[];
    reports: Report[];
}

export function SailorProfiles({ roster, reports }: SailorProfilesProps) {
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

    const selectedMember = selectedMemberId ? roster.find(m => m.id === selectedMemberId) : null;
    const memberReports = selectedMember ? reports.filter(r => r.memberId === selectedMember.id) : [];

    return (
        <div className="h-full flex bg-slate-50 overflow-hidden">
            {/* Sidebar List */}
            <div className="w-80 border-r border-slate-200 bg-white flex flex-col h-full">
                <div className="p-4 border-b border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-lg font-bold text-slate-800">Sailor Profiles</h2>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {roster.map(member => (
                        <div
                            key={member.id}
                            onClick={() => setSelectedMemberId(member.id)}
                            className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${selectedMemberId === member.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''}`}
                        >
                            <div className="font-medium text-slate-900">{member.lastName}, {member.firstName}</div>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded">{member.rank}</span>
                                <span>{member.designator}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content (Detail View) */}
            <div className="flex-1 overflow-y-auto p-8">
                {selectedMember ? (
                    <div className="max-w-4xl mx-auto space-y-8">
                        {/* Header Profile */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
                                    <User className="w-10 h-10" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">{selectedMember.lastName}, {selectedMember.firstName} {selectedMember.middleInitial}</h1>
                                    <div className="flex items-center gap-4 mt-2 text-slate-600">
                                        <div className="flex items-center gap-1">
                                            <span className="font-semibold text-slate-900">{selectedMember.rank}</span>
                                        </div>
                                        <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                        <div>{selectedMember.designator}</div>
                                        <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                        <div className="text-sm">PRD: {selectedMember.prd}</div>
                                    </div>
                                </div>
                            </div>
                            <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">
                                Edit Profile
                            </button>
                        </div>

                        {/* Recent Performance / Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <div className="text-sm font-medium text-slate-500 mb-1">Reports on File</div>
                                <div className="text-3xl font-bold text-slate-900">{memberReports.length}</div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <div className="text-sm font-medium text-slate-500 mb-1">Avg Trait Grade</div>
                                <div className="text-3xl font-bold text-indigo-600">
                                    {memberReports.length > 0
                                        ? (memberReports.reduce((acc, r) => acc + (r.traitAverage || 0), 0) / memberReports.length).toFixed(2)
                                        : 'N/A'
                                    }
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <div className="text-sm font-medium text-slate-500 mb-1">Next Report Due</div>
                                <div className="text-lg font-bold text-slate-900">
                                    {/* Placeholder logic */}
                                    Jan 31, 2026
                                </div>
                                <div className="text-xs text-slate-500">Periodic</div>
                            </div>
                        </div>

                        {/* Report History Timeline */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-200 flex items-center gap-2">
                                <History className="w-5 h-5 text-indigo-600" />
                                <h3 className="text-lg font-bold text-slate-900">Performance History</h3>
                            </div>

                            {memberReports.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {memberReports.map(report => (
                                        <div key={report.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${report.type === 'Periodic' ? 'bg-blue-100 text-blue-600' :
                                                    report.type === 'Detachment' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900">{report.type} Report</div>
                                                    <div className="text-sm text-slate-500">End Date: {report.periodEndDate}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-8">
                                                <div className="text-right">
                                                    <div className="text-xs text-slate-500 uppercase tracking-wider">Trait Avg</div>
                                                    <div className="font-bold text-slate-900">{report.traitAverage ? report.traitAverage.toFixed(2) : '-'}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-slate-500 uppercase tracking-wider">RSCA</div>
                                                    <div className="font-bold text-slate-900">{report.rscaAtTime ? report.rscaAtTime.toFixed(2) : '-'}</div>
                                                </div>
                                                <button className="opacity-0 group-hover:opacity-100 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded transition-all">
                                                    View
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center text-slate-400 italic">
                                    No reports generated yet for this period.
                                    <br />Adjust the Roster or RS Dates to generate drafts.
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <User className="w-16 h-16 mb-4 text-slate-200" />
                        <p className="text-lg font-medium">Select a sailor to view their profile</p>
                    </div>
                )}
            </div>
        </div>
    );
}
