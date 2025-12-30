import { useMemo } from 'react';
import type { SummaryGroup } from '@/types';
import { cn } from '@/lib/utils';
// import { LayoutGrid } from 'lucide-react'; // Removed unused icon

interface CompetitiveGroupHeaderProps {
    summaryGroups: SummaryGroup[];
    selectedCompGroupName: string | null;
    onSelectCompGroup: (groupName: string) => void;
}

export function CompetitiveGroupHeader({
    summaryGroups,
    selectedCompGroupName,
    onSelectCompGroup
}: CompetitiveGroupHeaderProps) {

    // Organise Data: Unique Competitive Group Names
    const groupNames = useMemo(() => {
        const names = new Set(summaryGroups.map(g => g.name));
        return Array.from(names).sort();
    }, [summaryGroups]);

    // Helper to parse Group Name (e.g., "O-4 SWO" -> { payGrade: "O-4", segment: "SWO" })
    const parseGroupLabel = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return { payGrade: parts[0], segment: parts.slice(1).join(' ') };
        }
        return { payGrade: name.substring(0, 3).toUpperCase(), segment: '' }; // Fallback
    };

    return (
        <div className="w-full bg-white border-b border-slate-200 flex items-center px-6 py-3 gap-6 shrink-0 z-20 overflow-x-auto scrollbar-hide">
            <div className="text-slate-800 font-bold text-lg shrink-0 w-48 truncate flex items-center">
                {selectedCompGroupName || "All Groups"}
            </div>

            <div className="h-8 w-px bg-slate-200 shrink-0" />

            <div className="flex items-center gap-4">
                {groupNames.map(name => {
                    const { payGrade, segment } = parseGroupLabel(name);
                    const isSelected = selectedCompGroupName === name;

                    return (
                        <button
                            key={name}
                            onClick={() => onSelectCompGroup(name)}
                            className="group relative flex flex-col items-center gap-1 focus:outline-none shrink-0"
                            title={name}
                        >
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-200 shadow-sm",
                                isSelected
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md scale-105"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-slate-50 hover:text-indigo-600"
                            )}>
                                {payGrade}
                            </div>
                            <span className={cn(
                                "text-[10px] font-medium transition-colors whitespace-nowrap",
                                isSelected ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-500"
                            )}>
                                {segment}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
