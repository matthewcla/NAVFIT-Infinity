import { useState, useEffect } from 'react';
import type { SummaryGroup, Report } from '../../types';
import { ReportEditor } from './ReportEditor.tsx';
import { cn } from '../../lib/utils';
import { FileText, Plus, ChevronRight, LayoutGrid, List as ListIcon, Calendar, CheckCircle2, AlertCircle, Clock, Users } from 'lucide-react';

// Mock Data for Development with new fields
// Note: 'Submitted' is now a valid status in the Report interface (updated in types/index.ts)
const MOCK_SUMMARY_GROUPS: SummaryGroup[] = [
    {
        id: 'sg-1',
        name: 'O-4 SWO',
        periodEndDate: '2025-10-31',
        status: 'Accepted',
        dateFinalized: '2025-11-05',
        dateAcceptedOrRejected: '2025-11-10',
        reports: [
            {
                id: 'r-1',
                memberId: 'm-1', // Clark
                periodEndDate: '2025-10-31',
                type: 'Periodic',
                traitGrades: { '33': 4.0, '34': 4.0, '35': 5.0, '36': 4.0, '37': 4.0, '38': 4.0, '39': 4.0 }, // 4.14
                traitAverage: 4.14,
                promotionRecommendation: 'EP',
                narrative: "MY #1 OF 12 LCDRS!\n\nConsistent top performer...",
                draftStatus: 'Submitted'
            },
            {
                id: 'r-2',
                memberId: 'm-2', // Smith
                periodEndDate: '2025-10-31',
                type: 'Periodic',
                traitGrades: { '33': 3.0, '34': 3.0, '35': 3.0, '36': 3.0, '37': 3.0, '38': 3.0, '39': 3.0 }, // 3.00
                traitAverage: 3.00,
                promotionRecommendation: 'P',
                narrative: "Solid performance in all areas.",
                draftStatus: 'Submitted'
            }
        ]
    },
    {
        id: 'sg-2',
        name: 'E-6 LPO',
        periodEndDate: '2025-11-15',
        status: 'Pending',
        reports: []
    },
    {
        id: 'sg-3',
        name: 'O-3 SWO',
        periodEndDate: '2025-01-31',
        status: 'Rejected',
        dateFinalized: '2025-02-01',
        dateAcceptedOrRejected: '2025-02-02',
        reports: [
            {
                id: 'r-3',
                memberId: 'm-3', // Jones
                periodEndDate: '2025-01-31',
                type: 'Periodic',
                traitGrades: {},
                traitAverage: 0,
                promotionRecommendation: 'NOB',
                narrative: "",
                draftStatus: 'Submitted'  // Rejected group, so this should be editable
            }
        ]
    }
];

interface ReportsManagerProps {
    pendingRequest?: { memberId: string; name: string; rank?: string } | null;
    onClearRequest?: () => void;
}

export function ReportsManager({ pendingRequest, onClearRequest }: ReportsManagerProps) {
    const [summaryGroups, setSummaryGroups] = useState<SummaryGroup[]>(MOCK_SUMMARY_GROUPS);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [dashboardView, setDashboardView] = useState<'grid' | 'list'>('grid');
    const [viewMode, setViewMode] = useState<'dashboard' | 'group_detail' | 'report_edit'>('dashboard');

    // Sidebar State
    const [selectedGroupName, setSelectedGroupName] = useState<string | null>(null);

    // Extract unique competitive group names for the sidebar
    // We use a Set to get unique names, then sort them
    const competitiveGroupNames = Array.from(new Set(summaryGroups.map(g => g.name))).sort();

    // Filter groups based on sidebar selection
    const filteredGroups = selectedGroupName
        ? summaryGroups.filter(g => g.name === selectedGroupName)
        : summaryGroups;


    // Handle Pending Request (Deep Linking)
    useEffect(() => {
        if (pendingRequest) {
            const { memberId, name, rank } = pendingRequest;
            console.log(`[ReportsManager] Processing request for ${name} (${memberId})`);

            let foundGroupId = '';
            let foundReportId = '';

            for (const group of summaryGroups) {
                const report = group.reports.find(r => r.memberId === memberId || r.memberId === name);
                if (report) {
                    foundGroupId = group.id;
                    foundReportId = report.id;
                    break;
                }
            }

            if (foundGroupId && foundReportId) {
                setSelectedGroupId(foundGroupId);
                setSelectedReportId(foundReportId);
                setViewMode('report_edit');
                // Ensure the sidebar selects the correct group name if filtered
                const group = summaryGroups.find(g => g.id === foundGroupId);
                if (group) setSelectedGroupName(group.name);

            } else {
                // Create new report logic would go here
                // For now, simplify to just selecting the first group if no match found
                setSelectedGroupId(summaryGroups[0].id);

                // If we were creating a new report, we'd update state here.
                // For now, satisfy the linter by logging the intended rank
                console.log("Would create report with rank:", rank);

                setViewMode('group_detail');
            }
            if (onClearRequest) onClearRequest();
        }
    }, [pendingRequest, summaryGroups, onClearRequest]);


    // Helper to calculate statistics for a group
    const getGroupStats = (group: SummaryGroup) => {
        const total = group.reports.length;
        // Explicitly type the counts object to allow indexing or use explicit keys
        const counts: Record<string, number> = { EP: 0, MP: 0, P: 0, SP: 0, NOB: 0, Prog: 0 };
        let sumAverage = 0;
        let countForAverage = 0;

        group.reports.forEach(r => {
            if (r.promotionRecommendation) {
                // Safe access or explicit check
                if (Object.prototype.hasOwnProperty.call(counts, r.promotionRecommendation)) {
                    counts[r.promotionRecommendation]++;
                }
            }
            if (r.traitAverage !== undefined && r.promotionRecommendation !== 'NOB') {
                sumAverage += r.traitAverage;
                countForAverage++;
            }
        });

        const average = countForAverage > 0 ? (sumAverage / countForAverage).toFixed(2) : '0.00';

        return { total, counts, average };
    };

    const handleBackToDashboard = () => {
        setSelectedGroupId(null);
        setViewMode('dashboard');
    };

    const handleBackToGroup = () => {
        setSelectedReportId(null);
        setViewMode('group_detail');
    };

    const handleGroupClick = (groupId: string) => {
        setSelectedGroupId(groupId);
        setViewMode('group_detail');
    };

    const handleReportClick = (reportId: string) => {
        setSelectedReportId(reportId);
        setViewMode('report_edit');
    };

    // Permission Logic
    const isReportEditable = (report: Report, groupStatus: string | undefined): boolean => {
        if (report.draftStatus === 'Draft') return true;
        // Exception: Submitted reports can be edited if the group was Rejected
        if (report.draftStatus === 'Submitted' && groupStatus === 'Rejected') return true;
        return false;
    };

    const selectedGroup = summaryGroups.find(sg => sg.id === selectedGroupId);
    const selectedReport = selectedGroup?.reports.find(r => r.id === selectedReportId);


    // Render Helpers
    const renderStatusBadge = (status: string | undefined) => {
        switch (status) {
            case 'Accepted':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3" /> Accepted</span>;
            case 'Rejected':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertCircle className="w-3 h-3" /> Rejected</span>;
            default: // Pending
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Clock className="w-3 h-3" /> Pending</span>;
        }
    };

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden">
            {/* Secondary Sidebar - List of Competitive Groups */}
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 z-10">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-800">Competitive Groups</h2>
                    {/* Could add a 'New Group' type button here in the future */}
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    <button
                        onClick={() => setSelectedGroupName(null)}
                        className={cn(
                            "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                            selectedGroupName === null
                                ? "bg-indigo-50 text-indigo-700"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        All Groups
                    </button>

                    <div className="pt-2 pb-1 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Categories
                    </div>

                    {competitiveGroupNames.map(name => (
                        <button
                            key={name}
                            onClick={() => setSelectedGroupName(name)}
                            className={cn(
                                "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                                selectedGroupName === name
                                    ? "bg-indigo-50 text-indigo-700"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <Users className="w-4 h-4" />
                            {name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar - Only visible in Dashboard View */}
                {viewMode === 'dashboard' && (
                    <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                                {selectedGroupName ? `${selectedGroupName} Dashboard` : "All Competitive Groups"}
                            </h1>
                            <p className="text-sm text-slate-500 mt-1">Manage, finalize, and track your summary groups.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-1 rounded-lg flex items-center">
                                <button
                                    onClick={() => setDashboardView('grid')}
                                    className={cn(
                                        "p-1.5 rounded-md transition-all",
                                        dashboardView === 'grid' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setDashboardView('list')}
                                    className={cn(
                                        "p-1.5 rounded-md transition-all",
                                        dashboardView === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    <ListIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <button
                                onClick={() => {
                                    // Placeholder for creating a new group
                                    // If a group name is selected, default to that name?
                                    const newGroup: SummaryGroup = {
                                        id: `sg-${Date.now()}`,
                                        name: selectedGroupName || 'New Group',
                                        periodEndDate: new Date().toISOString().split('T')[0],
                                        status: 'Pending',
                                        reports: []
                                    };
                                    setSummaryGroups([...summaryGroups, newGroup]);
                                }}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                New Group
                            </button>
                        </div>
                    </div>
                )}

                {/* Dashboard View */}
                {viewMode === 'dashboard' && (
                    <div className="flex-1 overflow-y-auto p-6">
                        {filteredGroups.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                <Users className="w-12 h-12 mb-3 opacity-20" />
                                <p>No summary groups found for {selectedGroupName}.</p>
                                <button
                                    onClick={() => {
                                        const newGroup: SummaryGroup = {
                                            id: `sg-${Date.now()}`,
                                            name: selectedGroupName || 'New Group',
                                            periodEndDate: new Date().toISOString().split('T')[0],
                                            status: 'Pending',
                                            reports: []
                                        };
                                        setSummaryGroups([...summaryGroups, newGroup]);
                                    }}
                                    className="mt-4 px-4 py-2 text-indigo-600 font-medium hover:bg-indigo-50 rounded-md transition-colors"
                                >
                                    Create First Group
                                </button>
                            </div>
                        ) : (
                            dashboardView === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredGroups.map(group => {
                                        const stats = getGroupStats(group);
                                        return (
                                            <div
                                                key={group.id}
                                                onClick={() => handleGroupClick(group.id)}
                                                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group flex flex-col"
                                            >
                                                <div className="p-5 flex-1">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">{group.name}</h3>
                                                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                                                <Calendar className="w-3 h-3" />
                                                                <span>End: {group.periodEndDate}</span>
                                                            </div>
                                                        </div>
                                                        {renderStatusBadge(group.status)}
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-100 border-b mb-4">
                                                        <div className="text-center border-r border-slate-100">
                                                            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                                                            <div className="text-xs text-slate-500 uppercase font-medium tracking-wide">Reports</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-2xl font-bold text-slate-900">{stats.average}</div>
                                                            <div className="text-xs text-slate-500 uppercase font-medium tracking-wide">Avg</div>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between items-center text-xs text-slate-600">
                                                        <div className="flex flex-col items-center"><span className="font-bold">{stats.counts.EP}</span><span className="text-[10px] text-slate-400">EP</span></div>
                                                        <div className="flex flex-col items-center"><span className="font-bold">{stats.counts.MP}</span><span className="text-[10px] text-slate-400">MP</span></div>
                                                        <div className="flex flex-col items-center"><span className="font-bold">{stats.counts.P}</span><span className="text-[10px] text-slate-400">P</span></div>
                                                        <div className="flex flex-col items-center"><span className="font-bold">{stats.counts.SP}</span><span className="text-[10px] text-slate-400">SP</span></div>
                                                        <div className="flex flex-col items-center"><span className="font-bold">{stats.counts.NOB}</span><span className="text-[10px] text-slate-400">NOB</span></div>
                                                    </div>
                                                </div>
                                                <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 rounded-b-xl flex justify-between items-center text-xs text-slate-500">
                                                    <span>
                                                        {group.dateFinalized ? `Finalized: ${group.dateFinalized}` : 'Not Finalized'}
                                                    </span>
                                                    {group.dateAcceptedOrRejected && (
                                                        <span>
                                                            {group.status === 'Accepted' ? 'Acc: ' : 'Rej: '}{group.dateAcceptedOrRejected}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Group Name</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Period End</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700 text-center">Reports</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700 text-center">Avg</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Breakdown (EP/MP/P)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredGroups.map(group => {
                                                const stats = getGroupStats(group);
                                                return (
                                                    <tr
                                                        key={group.id}
                                                        onClick={() => handleGroupClick(group.id)}
                                                        className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                                                    >
                                                        <td className="px-6 py-4 font-medium text-slate-900 group-hover:text-indigo-600">{group.name}</td>
                                                        <td className="px-6 py-4">{renderStatusBadge(group.status)}</td>
                                                        <td className="px-6 py-4 text-slate-600">{group.periodEndDate}</td>
                                                        <td className="px-6 py-4 text-center font-medium">{stats.total}</td>
                                                        <td className="px-6 py-4 text-center font-medium">{stats.average}</td>
                                                        <td className="px-6 py-4 text-right text-slate-600 font-mono text-xs">
                                                            {stats.counts.EP} / {stats.counts.MP} / {stats.counts.P}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        )}
                    </div>
                )}

                {/* Group Detail View */}
                {viewMode === 'group_detail' && selectedGroup && (
                    <div className="flex-1 flex flex-col h-full">
                        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <button onClick={handleBackToDashboard} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <ChevronRight className="w-5 h-5 rotate-180" />
                                </button>
                                <div>
                                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                        {selectedGroup.name}
                                        {renderStatusBadge(selectedGroup.status)}
                                    </h1>
                                    <p className="text-sm text-slate-500">Period Ending: {selectedGroup.periodEndDate}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium rounded-md shadow-sm transition-colors">
                                    Edit Group
                                </button>
                                {/* Only show New Report if group is NOT accepted/rejected (i.e. is Pending or undefined) */}
                                {selectedGroup.status !== 'Accepted' && selectedGroup.status !== 'Rejected' && (
                                    <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors flex items-center gap-2">
                                        <Plus className="w-4 h-4" />
                                        New Report
                                    </button>
                                )}

                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                            {selectedGroup.reports.length > 0 ? (
                                selectedGroup.reports.map(report => (
                                    <div
                                        key={report.id}
                                        onClick={() => handleReportClick(report.id)}
                                        className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                                    report.promotionRecommendation === 'EP' ? "bg-indigo-100 text-indigo-700" :
                                                        report.promotionRecommendation === 'MP' ? "bg-slate-100 text-slate-700" :
                                                            "bg-yellow-100 text-yellow-700"
                                                )}>
                                                    {report.promotionRecommendation}
                                                </div>
                                                <div>
                                                    <span className="block text-sm font-semibold text-slate-900">Member ID: {report.memberId}</span>
                                                    <span className="text-xs text-slate-500">{report.type}</span>
                                                </div>
                                            </div>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider",
                                                report.draftStatus === 'Draft' ? "bg-slate-100 text-slate-500" :
                                                    report.draftStatus === 'Review' ? "bg-amber-50 text-amber-600" :
                                                        report.draftStatus === 'Submitted' ? "bg-blue-50 text-blue-600" :
                                                            "bg-green-50 text-green-600"
                                            )}>
                                                {report.draftStatus}
                                            </span>
                                        </div>

                                        <div className="space-y-2 mt-3">
                                            <div className="flex justify-between text-xs text-slate-500">
                                                <span>Trait Avg</span>
                                                <span className="font-medium text-slate-900">{report.traitAverage ? report.traitAverage.toFixed(2) : '0.00'}</span>
                                            </div>
                                            <div className="text-xs text-slate-400 line-clamp-2 italic border-l-2 border-slate-100 pl-2">
                                                {report.narrative || "No narrative started..."}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No reports in this competitive group yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Report Editor View */}
                {viewMode === 'report_edit' && selectedReport && (
                    <div className="flex-1 overflow-hidden">
                        <ReportEditor
                            report={selectedReport}
                            onBack={handleBackToGroup}
                            readOnly={!isReportEditable(selectedReport, selectedGroup?.status)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
