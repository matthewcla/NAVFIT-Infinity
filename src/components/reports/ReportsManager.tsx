import { useState, useEffect } from 'react';
import type { SummaryGroup } from '../../types';
import { ReportEditor } from './ReportEditor.tsx';
import { cn } from '../../lib/utils';
import { FileText, Users, Plus, ChevronRight, Wand2 } from 'lucide-react';
import { RosterService } from '../../lib/services/rosterService';
import { SummaryGroupGenerator } from '../../lib/services/summaryGroupGenerator';
import { BoardService } from '../../lib/services/boardService';

// Mock Data for Development
const MOCK_SUMMARY_GROUPS: SummaryGroup[] = [
    {
        id: 'sg-1',
        name: 'O-4 SWO',
        periodEndDate: '2025-10-31',
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
                draftStatus: 'Draft'
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
                draftStatus: 'Review'
            }
        ]
    },
    {
        id: 'sg-2',
        name: 'E-6 LPO',
        periodEndDate: '2025-11-15',
        reports: []
    }
];

interface ReportsManagerProps {
    pendingRequest?: { memberId: string; name: string; rank?: string } | null;
    onClearRequest?: () => void;
}

export function ReportsManager({ pendingRequest, onClearRequest }: ReportsManagerProps) {
    // Convert MOCK_SUMMARY_GROUPS to state so we can mutate it
    const [summaryGroups, setSummaryGroups] = useState<SummaryGroup[]>(MOCK_SUMMARY_GROUPS);

    // Derived state from URL/Props could go here, but using local state for now
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(MOCK_SUMMARY_GROUPS[0].id);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');

    // Handle Pending Request (Deep Linking)
    useEffect(() => {
        if (pendingRequest) {
            const { memberId, name, rank } = pendingRequest;
            console.log(`[ReportsManager] Processing request for ${name} (${memberId})`);

            // 1. Search for existing report
            let foundGroupId = '';
            let foundReportId = '';

            for (const group of summaryGroups) {
                const report = group.reports.find(r => r.memberId === memberId || r.memberId === name); // Loose matching for mock data
                if (report) {
                    foundGroupId = group.id;
                    foundReportId = report.id;
                    break;
                }
            }

            if (foundGroupId && foundReportId) {
                console.log(`[ReportsManager] Found existing report: ${foundReportId}`);
                setSelectedGroupId(foundGroupId);
                setSelectedReportId(foundReportId);
                setViewMode('edit');
            } else {
                console.log(`[ReportsManager] Creating new report for ${name}`);
                // 2. Create new report if not found
                // For prototype, add to first group or "Unassigned"
                const targetGroupId = summaryGroups[0].id;

                const newReport = {
                    id: `r-new-${Date.now()}`,
                    memberId: name, // Use Name as ID for visual clarity in demo
                    periodEndDate: '2025-10-31',
                    type: 'Periodic' as const,
                    traitGrades: {},
                    traitAverage: 0,
                    promotionRecommendation: 'NOB' as 'NOB',
                    narrative: "",
                    draftStatus: 'Draft' as const,
                    // Additional fields to make it look populated
                    grade: rank || 'O-3',
                    shipStation: 'USS NEVERLAND'
                };

                setSummaryGroups(prev => prev.map(g => {
                    if (g.id === targetGroupId) {
                        return {
                            ...g,
                            reports: [...g.reports, newReport]
                        };
                    }
                    return g;
                }));

                setSelectedGroupId(targetGroupId);
                setSelectedReportId(newReport.id);
                setViewMode('edit');
            }

            // Clear the request so we don't re-process
            if (onClearRequest) onClearRequest();
        }
    }, [pendingRequest, summaryGroups, onClearRequest]);


    const selectedGroup = summaryGroups.find(sg => sg.id === selectedGroupId);
    const selectedReport = selectedGroup?.reports.find(r => r.id === selectedReportId) || null;

    const handleEditReport = (reportId: string) => {
        setSelectedReportId(reportId);
        setViewMode('edit');
    };

    const handleBackToList = () => {
        setSelectedReportId(null);
        setViewMode('list');
    };

    const handleAutoGenerate = async () => {
        // Trigger the generator service
        try {
            const roster = await RosterService.getRoster();
            const year = new Date().getFullYear();
            const schedule = await BoardService.getSchedule(year);
            const suggestions = await SummaryGroupGenerator.generateSuggestions(roster, schedule);

            // For prototype, simply add them if they don't exist
            setSummaryGroups(prev => {
                const existingIds = new Set(prev.map(g => g.id));
                const newGroups = suggestions.filter(g => !existingIds.has(g.id));

                if (newGroups.length > 0) {
                    // In a real app we might show a toast
                    console.log(`Added ${newGroups.length} new summary groups.`);
                }
                return [...prev, ...newGroups];
            });
        } catch (e) {
            console.error("Auto-generate failed", e);
        }
    };

    return (
        <div className="flex h-full bg-slate-100 overflow-hidden">
            {/* Sidebar: Summary Groups */}
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Users className="w-4 h-4 text-indigo-600" />
                            Summary Groups
                        </h2>
                        <button className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={handleAutoGenerate}
                        className="w-full flex items-center justify-center gap-2 px-2 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded hover:bg-indigo-100 transition-colors"
                    >
                        <Wand2 className="w-3 h-3" />
                        Auto-Generate Groups
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {summaryGroups.map(group => (
                        <button
                            key={group.id}
                            onClick={() => {
                                setSelectedGroupId(group.id);
                                setViewMode('list');
                                setSelectedReportId(null);
                            }}
                            className={cn(
                                "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-between group",
                                selectedGroupId === group.id
                                    ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <span>{group.name}</span>
                            {selectedGroupId === group.id && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {selectedGroup ? (
                    viewMode === 'list' ? (
                        <div className="h-full flex flex-col">
                            {/* Group Header */}
                            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                                <div>
                                    <h1 className="text-xl font-bold text-slate-900">{selectedGroup.name}</h1>
                                    <p className="text-sm text-slate-500">Period Ending: {selectedGroup.periodEndDate}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors flex items-center gap-2">
                                        <Plus className="w-4 h-4" />
                                        New Report
                                    </button>
                                </div>
                            </div>

                            {/* Reports Grid */}
                            <div className="p-6 overflow-y-auto grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                                {selectedGroup.reports.length > 0 ? (
                                    selectedGroup.reports.map(report => (
                                        <div
                                            key={report.id}
                                            onClick={() => handleEditReport(report.id)}
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
                                        <p>No reports in this summary group yet.</p>
                                        <button className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                                            Create First Report
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <ReportEditor
                            report={selectedReport!}
                            onBack={handleBackToList}
                        />
                    )
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400">
                        Select a summary group to view reports
                    </div>
                )}
            </div>
        </div>
    );
}
