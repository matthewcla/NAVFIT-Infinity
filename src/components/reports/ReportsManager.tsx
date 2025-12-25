import { useState, useEffect, useMemo } from 'react';
import type { SummaryGroup, Report, RosterEntry } from '../../types';
import { ReportEditor } from './ReportEditor.tsx';
import { CompetitiveGroupHeader } from './CompetitiveGroupHeader.tsx';
import { cn } from '../../lib/utils';
import { ChevronRight, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { StrategyScattergram } from '../dashboard/StrategyScattergram';
import { INITIAL_ROSTER } from '../../data/initialRoster';
import { SummaryGroupGenerator } from '../../lib/services/summaryGroupGenerator';

// --- ROSTER ADAPTER ---
// Convert 'RosterMember' from initialRoster to 'RosterEntry' expected by Generator
const ADAPTED_ROSTER: RosterEntry[] = [
    ...INITIAL_ROSTER.map(m => ({
        memberId: m.id,
        fullName: `${m.lastName}, ${m.firstName}`,
        rank: m.rank,
        designator: m.designator,
        dateReported: m.dateReported,
        prd: m.prd,
        uic: '55555'
    })),
    // Mixed Designator Test Case: Two O-4s with different designators
    {
        memberId: 'm-test-1110', fullName: 'Surface, O-4', rank: 'O-4', designator: '1110', dateReported: '2023-01-01', prd: '2026-01-01', uic: '55555'
    },
    {
        memberId: 'm-test-3100', fullName: 'Supply, O-4', rank: 'O-4', designator: '3100', dateReported: '2023-01-01', prd: '2026-01-01', uic: '55555'
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
    const [summaryGroups, setSummaryGroups] = useState<SummaryGroup[]>([]);

    // Initialize Data (Wire Test Data)
    useEffect(() => {
        const initData = async () => {
            if (propsSummaryGroups && propsSummaryGroups.length > 0) {
                setSummaryGroups(propsSummaryGroups);
            } else {
                // Generate from Test Data
                const generated = await SummaryGroupGenerator.generateSuggestions(ADAPTED_ROSTER, null);

                // Add some manual status variety for demo
                const enriched = generated.flatMap((g, i) => {
                    const variants: SummaryGroup[] = [];

                    // 1. The Real/Current Group (Draft/Submitted)
                    let currentStatus: any = 'Pending';
                    if (i % 3 === 0) currentStatus = 'Submitted';

                    const reportsWithScores = g.reports.map(r => ({
                        ...r,
                        traitAverage: 3.0 + Math.random() * 2.0,
                        promotionRecommendation: Math.random() > 0.8 ? 'EP' : (Math.random() > 0.5 ? 'MP' : 'P') as any
                    }));

                    variants.push({ ...g, status: currentStatus, reports: reportsWithScores });

                    // 2. Historic Group (Archived) - Previous Year
                    // Clone/modify ID and date
                    const prevYearDate = new Date(g.periodEndDate);
                    prevYearDate.setFullYear(prevYearDate.getFullYear() - 1);

                    variants.push({
                        ...g,
                        id: `${g.id}-prev`,
                        periodEndDate: prevYearDate.toISOString().split('T')[0],
                        status: 'Accepted',
                        reports: reportsWithScores.map(r => ({ ...r, id: `${r.id}-prev` })) // Clone reports too
                    });

                    // 3. Future Group (Projected) - Next Year
                    // Clone/modify ID and date
                    const nextYearDate = new Date(g.periodEndDate);
                    nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);

                    variants.push({
                        ...g,
                        id: `${g.id}-next`,
                        periodEndDate: nextYearDate.toISOString().split('T')[0],
                        status: 'Projected',
                        reports: [] // Future usually has no reports yet
                    });

                    return variants;
                });

                setSummaryGroups(enriched);
            }
        };
        initData();
    }, [propsSummaryGroups]);

    const [selectedCompGroupName, setSelectedCompGroupName] = useState<string | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

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
                    break;
                }
            }
            if (onClearRequest) onClearRequest();
        }
    }, [pendingRequest, summaryGroups, onClearRequest]);

    // Handlers
    const handleCompGroupSelect = (name: string) => {
        setSelectedCompGroupName(name === selectedCompGroupName ? null : name); // Toggle or Select
        setSelectedGroupId(null);
        setSelectedReportId(null);
    };

    const handleReportSelect = (reportId: string) => {
        setSelectedReportId(reportId);
    };

    const handleBackToCompGroup = () => {
        setSelectedGroupId(null);
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

    // Kanban categorisation
    const getGroupsByStatus = (status: 'Projected' | 'Draft' | 'Submitted' | 'Archived') => {
        // Mapping status strings to columns
        return groupsInCurrentCompGroup.filter(g => {
            const s = g.status || 'Pending';
            if (status === 'Projected') return s === 'Projected' || s === 'Planned';
            if (status === 'Draft') return s === 'Pending' || s === 'Draft';
            if (status === 'Submitted') return s === 'Submitted' || s === 'Review';
            if (status === 'Archived') return s === 'Accepted' || s === 'Rejected' || s === 'Final';
            return false;
        });
    };

    // --- ADMIN TRACKER STATS ---
    const adminStats = useMemo(() => {
        let totalReports = 0;
        let actionRequired = 0;
        let signed = 0;
        let adverse = 0;

        summaryGroups.forEach(g => {
            g.reports.forEach(r => {
                totalReports++;
                if (r.draftStatus === 'Draft' || r.draftStatus === 'Review' || g.status === 'Rejected') {
                    actionRequired++;
                }
                if (r.draftStatus === 'Final' || g.status === 'Accepted') {
                    signed++;
                }
                if (r.isAdverse || r.promotionRecommendation === 'SP' || r.promotionRecommendation === 'Prog') {
                    adverse++;
                }
            });
        });

        return { totalReports, actionRequired, signed, adverse };
    }, [summaryGroups]);


    // --- CATEGORIZATION LOGIC ---
    const getCategory = (groupName: string) => {
        const base = groupName.toUpperCase();
        if (base.startsWith('O-') || base.startsWith('W-') || base.includes('OFFICER') || base.includes('CWO')) return 'Wardroom';
        if (base.startsWith('E-7') || base.startsWith('E-8') || base.startsWith('E-9') || base.includes('CHIEF')) return 'CPO Mess';
        return 'Crew';
    };

    const categorizedGroups = useMemo(() => {
        const uniqueNames = Array.from(new Set(summaryGroups.map(g => g.name))).sort();
        const categories: Record<string, string[]> = {
            'Wardroom': [],
            'CPO Mess': [],
            'Crew': []
        };

        uniqueNames.forEach(name => {
            const cat = getCategory(name);
            if (categories[cat]) categories[cat].push(name);
            else categories['Crew'].push(name); // Fallback
        });

        return categories;
    }, [summaryGroups]);

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden flex-col">
            <CompetitiveGroupHeader
                summaryGroups={summaryGroups}
                selectedCompGroupName={selectedCompGroupName}
                onSelectCompGroup={handleCompGroupSelect}
            />

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* 1. REPORT EDITOR VIEW (Drills down) */}
                {selectedReportId && selectedReport ? (
                    <div className="flex-1 overflow-hidden flex flex-col z-30 bg-slate-50 relative">
                        <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center gap-4 shrink-0">
                            <button onClick={() => setSelectedReportId(null)} className="text-slate-400 hover:text-slate-600">
                                <ChevronRight className="w-5 h-5 rotate-180" />
                            </button>
                            <span className="text-sm font-medium text-slate-500">Back to Group</span>
                        </div>
                        <ReportEditor
                            report={selectedReport}
                            onBack={() => setSelectedReportId(null)}
                            readOnly={!isReportEditable(selectedReport, selectedSummaryGroup?.status)}
                        />
                    </div>
                ) : (
                    /* 2. MAIN DASHBOARD / SELECTED COMP GROUP VIEW (Shared Scattergram) */
                    selectedCompGroupName ? (
                        <div className="flex-1 overflow-y-auto h-full scrollbar-thin flex flex-col">
                            {/* Sticky Scattergram (Shared) */}
                            <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 shadow-sm pt-4 px-6 pb-6 shrink-0">
                                <StrategyScattergram
                                    summaryGroups={groupsInCurrentCompGroup}
                                    onOpenReport={(_mId, _name, _rank, rId) => handleReportSelect(rId || '')}
                                    onUpdateReport={handleUpdateReport}
                                    minimal={false}
                                    height={320}
                                    focusDate={selectedSummaryGroup?.periodEndDate}
                                />
                            </div>

                            {/* CONTENT AREA */}
                            {selectedGroupId && selectedSummaryGroup ? (
                                /* A. SUMMARY GROUP DETAIL VIEW (Detailed List) */
                                <div className="p-6 flex-1 bg-white min-h-[500px] animate-in fade-in duration-300">
                                    <div className="flex items-center gap-2 mb-6">
                                        <button onClick={handleBackToCompGroup} className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
                                            <ChevronRight className="w-5 h-5 rotate-180" />
                                            <span className="text-sm font-medium">Back</span>
                                        </button>
                                        <div className="ml-4">
                                            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                                                {selectedSummaryGroup.name}
                                                <span className={cn(
                                                    "text-sm px-2 py-1 rounded-full border",
                                                    selectedSummaryGroup.status === 'Accepted' ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"
                                                )}>
                                                    {selectedSummaryGroup.status || 'Pending'}
                                                </span>
                                            </h1>
                                            <p className="text-slate-500 font-medium text-sm mt-1">Closeout: {selectedSummaryGroup.periodEndDate}</p>
                                        </div>
                                    </div>

                                    {/* Detailed Report List Table */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                                <tr className="border-b border-slate-200">
                                                    <th className="px-6 py-3">Member</th>
                                                    <th className="px-6 py-3">Rank</th>
                                                    <th className="px-6 py-3">Type</th>
                                                    <th className="px-6 py-3 text-center">Prom Rec</th>
                                                    <th className="px-6 py-3 text-right">Trait Avg (Planned)</th>
                                                    <th className="px-6 py-3 text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {selectedSummaryGroup.reports
                                                    .sort((a, b) => (b.traitAverage || 0) - (a.traitAverage || 0))
                                                    .map(report => (
                                                        <tr
                                                            key={report.id}
                                                            onClick={() => handleReportSelect(report.id)}
                                                            className="hover:bg-slate-50 cursor-pointer transition-colors group"
                                                        >
                                                            <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-indigo-600 flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                                                    {report.memberId.substring(0, 2).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div>{report.memberId}</div>
                                                                    <div className="text-[10px] text-slate-400 font-normal">ID: {report.id.substring(0, 6)}</div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-slate-600 font-medium">{report.grade}</td>
                                                            <td className="px-6 py-4 text-slate-500">{report.type}</td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className={cn(
                                                                    "px-2 py-1 rounded text-xs font-bold w-12 inline-block",
                                                                    report.promotionRecommendation === 'EP' ? 'bg-indigo-100 text-indigo-700' :
                                                                        report.promotionRecommendation === 'MP' ? 'bg-slate-100 text-slate-700 dashed border border-slate-300' :
                                                                            report.promotionRecommendation === 'P' ? 'bg-slate-50 text-slate-500' : 'bg-slate-100 text-slate-400'
                                                                )}>
                                                                    {report.promotionRecommendation}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">
                                                                {report.traitAverage ? report.traitAverage.toFixed(2) : '-'}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span className={cn(
                                                                    "px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide",
                                                                    report.draftStatus === 'Final' ? 'bg-green-100 text-green-700' :
                                                                        report.draftStatus === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                                                                            'bg-amber-50 text-amber-600'
                                                                )}>
                                                                    {report.draftStatus}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                        {selectedSummaryGroup.reports.length === 0 && (
                                            <div className="p-12 text-center text-slate-400 italic bg-slate-50/50">
                                                No reports in this summary group yet.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* B. MAIN DASHBOARD VIEW (Kanban Cards) */
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {[
                                            { label: 'Planned', key: 'Projected' },
                                            { label: 'Drafted', key: 'Draft' },
                                            { label: 'Submitted', key: 'Submitted' },
                                            { label: 'Archived', key: 'Archived' }
                                        ].map((col) => {
                                            const groups = getGroupsByStatus(col.key as any);
                                            return (
                                                <div key={col.key} className="flex flex-col gap-4">
                                                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{col.label}</h3>
                                                        <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{groups.length}</span>
                                                    </div>

                                                    <div className="flex flex-col gap-3">
                                                        {groups.map(group => {
                                                            const stats = getGroupStats(group);
                                                            return (
                                                                <div key={group.id} onClick={() => setSelectedGroupId(group.id)} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-400 cursor-pointer transition-all">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <div className="font-semibold text-slate-900 text-sm">{group.periodEndDate}</div>
                                                                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full uppercase font-bold", group.status === 'Accepted' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600')}>{group.status?.substring(0, 3) || 'PEN'}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-end text-xs text-slate-500">
                                                                        <div>{stats.total} Reports</div>
                                                                        {stats.total > 0 && <div className="font-mono font-medium">{stats.average}</div>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        {groups.length === 0 && (
                                                            <div className="text-xs text-slate-400 italic text-center py-4 border-2 border-dashed border-slate-100 rounded-lg">
                                                                No groups
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* 3. LANDING DASHBOARD (Category Overview) */
                        <div className="h-full overflow-hidden flex flex-col">
                            {/* STICKY REPORT ADMIN TRACKER */}
                            <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm px-8 py-4 shrink-0 flex items-center justify-between gap-8">
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Reports</span>
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-5 h-5 text-slate-600" />
                                            <span className="text-2xl font-bold text-slate-900">{adminStats.totalReports}</span>
                                        </div>
                                    </div>
                                    <div className="w-px h-10 bg-slate-100"></div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Action Required</span>
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5 text-amber-500" />
                                            <span className="text-2xl font-bold text-slate-900">{adminStats.actionRequired}</span>
                                        </div>
                                    </div>
                                    <div className="w-px h-10 bg-slate-100"></div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Signed/Final</span>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                            <span className="text-2xl font-bold text-slate-900">{adminStats.signed}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Additional Stats / Visuals */}
                                <div className="flex items-center gap-8">
                                    {adminStats.adverse > 0 && (
                                        <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-100">
                                            <AlertCircle className="w-4 h-4" />
                                            <span className="text-sm font-bold">{adminStats.adverse} Adverse</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SCROLLABLE CONTENT WITH CATEGORIZED GROUPS */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                {Object.entries(categorizedGroups).map(([category, groupNames]) => {
                                    if (groupNames.length === 0) return null;
                                    return (
                                        <div key={category}>
                                            <h3 className="text-lg font-bold text-slate-500 mb-4 flex items-center gap-2">
                                                <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                                                {category}
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                {groupNames.map(compGroupName => {
                                                    const groupSummaries = summaryGroups.filter(g => g.name === compGroupName);
                                                    const totalReports = groupSummaries.reduce((acc, g) => acc + g.reports.length, 0);
                                                    const activeGroups = groupSummaries.filter(g => g.status !== 'Accepted' && g.status !== 'Rejected').length;

                                                    // Calculate generic average for display
                                                    let totalSum = 0;
                                                    let totalCount = 0;
                                                    groupSummaries.forEach(g => {
                                                        g.reports.forEach(r => {
                                                            if (r.traitAverage) {
                                                                totalSum += r.traitAverage;
                                                                totalCount++;
                                                            }
                                                        });
                                                    });
                                                    const avg = totalCount > 0 ? (totalSum / totalCount).toFixed(2) : '0.00';

                                                    return (
                                                        <div key={compGroupName} onClick={() => setSelectedCompGroupName(compGroupName)} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-500 cursor-pointer transition-all p-6 group">
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 font-bold text-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                                    {compGroupName.split(' ')[0]}
                                                                </div>
                                                                <div className="flex flex-col items-end">
                                                                    <span className="text-2xl font-bold text-slate-900">{activeGroups}</span>
                                                                    <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Active Groups</span>
                                                                </div>
                                                            </div>

                                                            <h3 className="text-xl font-bold text-slate-900 mb-1">{compGroupName}</h3>
                                                            <p className="text-slate-500 text-sm mb-6">Competitive Group</p>

                                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                                                <div>
                                                                    <div className="text-sm font-medium text-slate-500">Total Reports</div>
                                                                    <div className="text-lg font-bold text-slate-700">{totalReports}</div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-sm font-medium text-slate-500">Avg RSCA</div>
                                                                    <div className="text-lg font-bold text-indigo-600 font-mono">{avg}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
