import { useState, useEffect, useMemo } from 'react';
import type { SummaryGroup, Report } from '../../types';
import { ReportEditor } from './ReportEditor.tsx';
import { CompetitiveGroupHeader } from './CompetitiveGroupHeader.tsx';
import { cn } from '../../lib/utils';
import { ChevronRight } from 'lucide-react';
import { StrategyScattergram } from '../dashboard/StrategyScattergram';

// Mock Data for Development
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
                memberId: 'm-1',
                periodEndDate: '2025-10-31',
                type: 'Periodic',
                traitGrades: { '33': 4.0, '34': 4.0, '35': 5.0, '36': 4.0, '37': 4.0, '38': 4.0, '39': 4.0 },
                traitAverage: 4.14,
                promotionRecommendation: 'EP',
                narrative: "MY #1 OF 12 LCDRS!\n\nConsistent top performer...",
                draftStatus: 'Submitted'
            },
            {
                id: 'r-2',
                memberId: 'm-2',
                periodEndDate: '2025-10-31',
                type: 'Periodic',
                traitGrades: { '33': 3.0, '34': 3.0, '35': 3.0, '36': 3.0, '37': 3.0, '38': 3.0, '39': 3.0 },
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
        reports: [
            {
                id: 'r-3',
                memberId: 'm-3',
                periodEndDate: '2025-01-31',
                type: 'Periodic',
                traitGrades: {},
                traitAverage: 0,
                promotionRecommendation: 'NOB',
                narrative: "",
                draftStatus: 'Submitted'
            }
        ]
    }
];

export interface ReportsManagerProps {
    summaryGroups?: SummaryGroup[];
    pendingRequest?: { memberId: string; name: string; rank?: string; reportId?: string } | null;
    onClearRequest?: () => void;
    onUpdateReport?: (reportId: string, newAverage: number) => void;
}

export function ReportsManager({ summaryGroups: propsSummaryGroups, pendingRequest, onClearRequest, onUpdateReport }: ReportsManagerProps) {
    // Shared State for Reports
    const [summaryGroups, setSummaryGroups] = useState<SummaryGroup[]>(() => {
        return propsSummaryGroups && propsSummaryGroups.length > 0 ? propsSummaryGroups : MOCK_SUMMARY_GROUPS;
    });

    useEffect(() => {
        if (propsSummaryGroups && propsSummaryGroups.length > 0) {
            setSummaryGroups(propsSummaryGroups);
        }
    }, [propsSummaryGroups]);

    const [selectedCompGroupName, setSelectedCompGroupName] = useState<string | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

    const [viewMode, setViewMode] = useState<'dashboard' | 'comp_group' | 'summary_group' | 'report_edit'>('dashboard');

    // Derived Data
    const groupsInCurrentCompGroup = useMemo(() => {
        if (!selectedCompGroupName) return [];
        return summaryGroups.filter(g => g.name === selectedCompGroupName);
    }, [selectedCompGroupName, summaryGroups]);

    const selectedSummaryGroup = useMemo(() => {
        return summaryGroups.find(g => g.id === selectedGroupId);
    }, [selectedGroupId, summaryGroups]);

    const selectedReport = useMemo(() => {
        return selectedSummaryGroup?.reports.find(r => r.id === selectedReportId);
    }, [selectedSummaryGroup, selectedReportId]);

    // Update Handler
    const handleUpdateReport = (reportId: string, newAverage: number) => {
        setSummaryGroups(prev => prev.map(group => ({
            ...group,
            reports: group.reports.map(r =>
                r.id === reportId ? { ...r, traitAverage: newAverage } : r
            )
        })));

        if (onUpdateReport) onUpdateReport(reportId, newAverage);
    };

    // Deep Linking
    useEffect(() => {
        if (pendingRequest) {
            const { memberId, name, reportId } = pendingRequest;
            for (const group of summaryGroups) {
                const report = group.reports.find(r => r.id === reportId || r.memberId === memberId || r.memberId === name);
                if (report) {
                    setSelectedCompGroupName(group.name);
                    setSelectedGroupId(group.id);
                    setSelectedReportId(report.id);
                    setViewMode('report_edit');
                    break;
                }
            }
            if (onClearRequest) onClearRequest();
        }
    }, [pendingRequest, summaryGroups, onClearRequest]);

    // Handlers
    const handleCompGroupSelect = (name: string) => {
        setSelectedCompGroupName(name);
        setSelectedGroupId(null);
        setSelectedReportId(null);
        setViewMode('comp_group');
    };

    const handleReportSelect = (reportId: string) => {
        setSelectedReportId(reportId);
        setViewMode('report_edit');
    };

    const handleBackToCompGroup = () => {
        setSelectedGroupId(null);
        setViewMode('comp_group');
    };

    const isReportEditable = (report: Report, groupStatus: string | undefined): boolean => {
        if (report.draftStatus === 'Draft') return true;
        if (report.draftStatus === 'Submitted' && groupStatus === 'Rejected') return true;
        return false;
    };

    // Helper to calculate statistics for a group
    const getGroupStats = (group: SummaryGroup) => {
        const total = group.reports.length;
        let sumAverage = 0;
        let countForAverage = 0;

        group.reports.forEach(r => {
            if (r.traitAverage !== undefined && r.promotionRecommendation !== 'NOB') {
                sumAverage += r.traitAverage;
                countForAverage++;
            }
        });
        const average = countForAverage > 0 ? (sumAverage / countForAverage).toFixed(2) : '0.00';
        return { total, average };
    };

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden flex-col">
            <CompetitiveGroupHeader
                summaryGroups={summaryGroups}
                selectedCompGroupName={selectedCompGroupName}
                onSelectCompGroup={handleCompGroupSelect}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
                {viewMode === 'dashboard' && (
                    <div className="flex-1 flex flex-col min-h-0">
                        {/* Integrated View: Strategy + Summary Groups Grid */}
                        <div className="flex h-full flex-col">
                            <div className="shrink-0 bg-white border-b border-slate-200 z-20">
                                <StrategyScattergram
                                    summaryGroups={summaryGroups}
                                    onOpenReport={(_mId, _name, _rank, rId) => handleReportSelect(rId || '')}
                                    onUpdateReport={handleUpdateReport}
                                    minimal={false}
                                    height={320}
                                />
                            </div>

                            {/* Restored Summary Group List instead of Waterfall */}
                            <div className="flex-1 min-h-0 relative p-6 overflow-y-auto">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">All Summary Groups</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {summaryGroups.map(group => {
                                        const stats = getGroupStats(group);
                                        return (
                                            <div key={group.id} onClick={() => {
                                                setSelectedCompGroupName(group.name);
                                                setSelectedGroupId(group.id);
                                                setViewMode('summary_group');
                                            }} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer p-5 transition-all">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-bold text-lg text-slate-900">{group.name}</h3>
                                                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", group.status === 'Accepted' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600')}>{group.status || 'Pending'}</span>
                                                </div>
                                                <p className="text-sm text-slate-500 mb-4">{group.periodEndDate}</p>
                                                <div className="flex justify-between text-sm font-medium text-slate-700">
                                                    <span>{stats.total} Reports</span>
                                                    <span>Avg: {stats.average}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'comp_group' && (
                    <div className="flex h-full flex-col">
                        <div className="shrink-0 bg-white border-b border-slate-200 z-20">
                            <StrategyScattergram
                                summaryGroups={groupsInCurrentCompGroup}
                                onOpenReport={(_mId, _name, _rank, rId) => handleReportSelect(rId || '')}
                                onUpdateReport={handleUpdateReport}
                                minimal={false}
                                height={300}
                            />
                        </div>
                        <div className="flex-1 min-h-0 relative p-6 overflow-y-auto">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Projected & Planned Groups</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groupsInCurrentCompGroup.map(group => {
                                    const stats = getGroupStats(group);
                                    return (
                                        <div key={group.id} onClick={() => {
                                            setSelectedGroupId(group.id);
                                            setViewMode('summary_group');
                                        }} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="font-semibold text-slate-900">{group.periodEndDate}</div>
                                                <span className={cn("text-xs px-2 py-0.5 rounded-full", group.status === 'Accepted' ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-700')}>{group.status || 'Pending'}</span>
                                            </div>
                                            <div className="flex justify-between items-end text-sm">
                                                <div className="text-slate-500">{stats.total} Reports</div>
                                                <div className="font-mono font-bold text-indigo-600">{stats.average} <span className="text-xs text-slate-400 font-normal">avg</span></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {(viewMode === 'summary_group') && (
                    <div className="p-6 overflow-y-auto">
                        <div className="flex items-center gap-2 mb-4">
                            <button onClick={handleBackToCompGroup} className="text-slate-400 hover:text-slate-600">
                                <ChevronRight className="w-5 h-5 rotate-180" />
                            </button>
                            <h1 className="text-xl font-bold">{selectedSummaryGroup?.name} ({selectedSummaryGroup?.periodEndDate})</h1>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {selectedSummaryGroup?.reports.map(report => (
                                <div key={report.id} onClick={() => handleReportSelect(report.id)} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:border-blue-400 transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-bold text-slate-900">{report.memberId}</div>
                                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded", report.promotionRecommendation === 'EP' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600')}>{report.promotionRecommendation}</span>
                                    </div>
                                    <div className="text-sm text-slate-500 mb-1">{report.type}</div>
                                    <div className="font-mono text-sm font-semibold">{report.traitAverage ? report.traitAverage.toFixed(2) : 'N/A'}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {viewMode === 'report_edit' && selectedReport && (
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center gap-4 shrink-0">
                            <button onClick={() => {
                                if (selectedCompGroupName) handleBackToCompGroup();
                                else setViewMode('dashboard');
                            }} className="text-slate-400 hover:text-slate-600">
                                <ChevronRight className="w-5 h-5 rotate-180" />
                            </button>
                            <span className="text-sm font-medium text-slate-500">Back</span>
                        </div>
                        <ReportEditor
                            report={selectedReport}
                            onBack={() => { if (selectedCompGroupName) handleBackToCompGroup(); else setViewMode('dashboard'); }}
                            readOnly={!isReportEditable(selectedReport, selectedSummaryGroup?.status)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
