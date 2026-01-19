import React, { useState } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { Calendar, Users, Settings, Plus } from 'lucide-react';
import { PageShell, PageHeader, PageContent } from '@/components/layout/PageShell';

export const CommandAdmin: React.FC = () => {
    const { roster, rsConfig, setRsConfig } = useNavfitStore();

    // --- State ---
    const [searchTerm, setSearchTerm] = useState('');

    // --- Handlers ---
    const handleRsDateChange = (date: string) => {
        setRsConfig({
            ...rsConfig,
            changeOfCommandDate: date
        });
    };

    const filteredRoster = roster.filter(m =>
        m.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.rank.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <PageShell>
            <PageHeader title="Command Settings" />

            <PageContent className="bg-slate-50 p-6">
                <div className="max-w-7xl mx-auto space-y-8 w-full">

                    {/* Reporting Senior Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Settings className="w-5 h-5 text-indigo-600" />
                            <h2 className="text-lg font-semibold text-slate-800">Reporting Senior Configuration</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Current Reporting Senior</label>
                                    <div className="mt-1 text-lg font-medium text-slate-900">{rsConfig.name}</div>
                                    <div className="text-sm text-slate-500">{rsConfig.rank} • {rsConfig.title}</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Projected Change of Command (RS Detach Date)</label>
                                    <p className="text-xs text-slate-500 mb-2">Changing this date will automatically generate RS Transfer reports for all eligible members.</p>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="date"
                                            value={rsConfig.changeOfCommandDate}
                                            onChange={(e) => handleRsDateChange(e.target.value)}
                                            className="pl-9 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Roster Management */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-indigo-600" />
                                <h2 className="text-lg font-semibold text-slate-800">Unit Roster</h2>
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-medium">
                                    {roster.length} Members
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    placeholder="Search roster..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                />
                                <button
                                    onClick={() => {
                                        // TODO: Implement Add Member Modal
                                        console.log("Add Member clicked");
                                        // Placeholder to silence unused var warning for now
                                        // onUpdateRoster([...roster, newMember]);
                                    }}
                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Member
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name / Rank</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Designator</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reported</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">PRD</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {filteredRoster.map((member) => (
                                        <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-900">{member.lastName}, {member.firstName}</div>
                                                        <div className="text-sm text-slate-500">{member.rank}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800">
                                                    {member.designator}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {member.dateReported}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {member.prd}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button className="text-indigo-600 hover:text-indigo-900">Edit</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredRoster.length === 0 && (
                                <div className="p-12 text-center text-slate-500">
                                    No members found matching "{searchTerm}"
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </PageContent>
        </PageShell>
    );
};
