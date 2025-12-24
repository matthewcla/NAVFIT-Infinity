import { useState, useMemo } from 'react';
import type { SummaryGroup } from '../../types';
import { cn } from '../../lib/utils';
import {
    ChevronRight,
    ChevronDown,
    Users,
    FileText,
    LayoutGrid,
    PanelLeftClose,
    PanelLeftOpen
} from 'lucide-react';

interface CompetitiveGroupSidebarProps {
    summaryGroups: SummaryGroup[];
    selectedGroupId: string | null;
    selectedReportId: string | null;
    onSelectGroup: (groupId: string) => void;
    onSelectReport: (reportId: string) => void;
    collapsed: boolean;
    onToggleCollapse: () => void;
}

export function CompetitiveGroupSidebar({
    summaryGroups,
    selectedGroupId,
    selectedReportId,
    onSelectGroup,
    onSelectReport,
    collapsed,
    onToggleCollapse
}: CompetitiveGroupSidebarProps) {
    // State for expanded internal nodes
    const [expandedCompGroups, setExpandedCompGroups] = useState<Set<string>>(new Set());
    const [expandedSummaryGroups, setExpandedSummaryGroups] = useState<Set<string>>(new Set());

    // Organise Data: Competitive Group Name -> Summary Groups
    const groupedData = useMemo(() => {
        const map = new Map<string, SummaryGroup[]>();
        summaryGroups.forEach(group => {
            const current = map.get(group.name) || [];
            current.push(group);
            map.set(group.name, current);
        });
        // Sort keys
        const sortedKeys = Array.from(map.keys()).sort();
        return { map, sortedKeys };
    }, [summaryGroups]);

    const toggleCompGroup = (name: string) => {
        const next = new Set(expandedCompGroups);
        if (next.has(name)) {
            next.delete(name);
        } else {
            next.add(name);
        }
        setExpandedCompGroups(next);
    };

    const toggleSummaryGroup = (id: string) => {
        const next = new Set(expandedSummaryGroups);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setExpandedSummaryGroups(next);
    };

    // Helper to parse Group Name (e.g., "O-4 SWO" -> { payGrade: "O-4", segment: "SWO" })
    const parseGroupLabel = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return { payGrade: parts[0], segment: parts.slice(1).join(' ') };
        }
        return { payGrade: name.substring(0, 3).toUpperCase(), segment: '' }; // Fallback
    };

    if (collapsed) {
        return (
            <div className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 space-y-4 shrink-0 z-20 transition-all duration-300">
                <button
                    onClick={onToggleCollapse}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                >
                    <PanelLeftOpen className="w-5 h-5" />
                </button>
                <div className="w-8 h-px bg-slate-200" />
                {groupedData.sortedKeys.map(name => {
                    const { payGrade, segment } = parseGroupLabel(name);
                    return (
                        <div key={name} className="group relative flex flex-col items-center gap-1">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs hover:bg-indigo-50 hover:text-indigo-600 cursor-default border border-slate-200 transition-colors">
                                {payGrade}
                            </div>
                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tight text-center leading-tight max-w-[50px] truncate">
                                {segment}
                            </span>

                            {/* Tooltip for collapsed state */}
                            <div className="absolute left-full top-2 ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none">
                                {name}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20 transition-all duration-300 h-full">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-indigo-600" />
                    Explorer
                </h2>
                <button
                    onClick={onToggleCollapse}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <PanelLeftClose className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {groupedData.sortedKeys.map(groupName => {
                    const isExpanded = expandedCompGroups.has(groupName);
                    const groupsInCat = groupedData.map.get(groupName) || [];

                    return (
                        <div key={groupName} className="mb-1">
                            {/* Level 1: Competitive Group Name */}
                            <button
                                onClick={() => toggleCompGroup(groupName)}
                                className={cn(
                                    "w-full text-left px-2 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors",
                                    isExpanded ? "text-slate-900 bg-slate-50" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                )}
                                <Users className="w-4 h-4 text-indigo-500" />
                                <span className="truncate">{groupName}</span>
                                <span className="ml-auto text-xs text-slate-400 font-normal bg-slate-100 px-1.5 py-0.5 rounded-full">
                                    {groupsInCat.length}
                                </span>
                            </button>

                            {/* Level 2: Summary Groups */}
                            {isExpanded && (
                                <div className="ml-2 pl-2 border-l border-slate-100 mt-1 space-y-1">
                                    {groupsInCat.map(sg => {
                                        const isSgExpanded = expandedSummaryGroups.has(sg.id);
                                        const isSelected = selectedGroupId === sg.id;

                                        return (
                                            <div key={sg.id}>
                                                <button
                                                    onClick={() => {
                                                        toggleSummaryGroup(sg.id);
                                                        onSelectGroup(sg.id);
                                                    }}
                                                    className={cn(
                                                        "w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors",
                                                        isSelected
                                                            ? "bg-indigo-50 text-indigo-700"
                                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                    )}
                                                >
                                                    {isSgExpanded ? (
                                                        <ChevronDown className={cn("w-3 h-3", isSelected ? "text-indigo-400" : "text-slate-400")} />
                                                    ) : (
                                                        <ChevronRight className={cn("w-3 h-3", isSelected ? "text-indigo-400" : "text-slate-400")} />
                                                    )}
                                                    <span className="truncate flex-1 font-medium">{sg.periodEndDate}</span>
                                                    {/* Status Dot */}
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        sg.status === 'Accepted' ? 'bg-green-400' :
                                                            sg.status === 'Rejected' ? 'bg-red-400' :
                                                                'bg-amber-400'
                                                    )} />
                                                </button>

                                                {/* Level 3: Reports */}
                                                {isSgExpanded && (
                                                    <div className="ml-2 pl-2 border-l border-slate-100 mt-1 space-y-0.5">
                                                        {sg.reports.length > 0 ? (
                                                            sg.reports.map(report => (
                                                                <button
                                                                    key={report.id}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onSelectReport(report.id);
                                                                    }}
                                                                    className={cn(
                                                                        "w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2 transition-colors",
                                                                        selectedReportId === report.id
                                                                            ? "bg-indigo-100/50 text-indigo-700 font-medium"
                                                                            : "text-slate-500 hover:text-indigo-600 hover:bg-slate-50"
                                                                    )}
                                                                >
                                                                    <FileText className="w-3 h-3 opacity-70" />
                                                                    <span className="truncate">
                                                                        {report.memberId}
                                                                        <span className="opacity-50 ml-1">({report.promotionRecommendation || 'NR'})</span>
                                                                    </span>
                                                                </button>
                                                            ))
                                                        ) : (
                                                            <div className="px-2 py-1 text-xs text-slate-400 italic">No reports</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
