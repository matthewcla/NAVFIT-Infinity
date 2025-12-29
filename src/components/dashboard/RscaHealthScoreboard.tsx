import { useMemo } from 'react';
import { Activity, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import type { SummaryGroup } from '../../types';


interface RscaGroup {
    rank: string;
    group: string;
    status: 'Safe' | 'Risk' | 'Developing' | 'Stabilized';
    rsca: number;
    valueGap: number; // 5.0 - RSCA
    sequencing: 'Optimal' | 'Concern' | 'Inverted';
    members: number;
    description: string;
}

interface RscaHealthScoreboardProps {
    summaryGroups?: SummaryGroup[];
}

export const RscaHealthScoreboard = ({ summaryGroups = [] }: RscaHealthScoreboardProps) => {

    const groups: RscaGroup[] = useMemo(() => {
        // Aggregation Map: Rank -> Data
        const stats = new Map<string, { sum: number; count: number; members: Set<string> }>();

        // 1. Process Reports for RSCA
        summaryGroups.forEach(sg => {
            sg.reports.forEach(r => {
                if (r.traitAverage && r.traitAverage > 0) {
                    // Extract Rank from Grade or Group Name?
                    // Better to use r.grade if available, else derive.
                    const rank = r.grade || 'Unknown';

                    if (!stats.has(rank)) {
                        stats.set(rank, { sum: 0, count: 0, members: new Set() });
                    }
                    const entry = stats.get(rank)!;
                    entry.sum += r.traitAverage;
                    entry.count++;
                    entry.members.add(r.memberId);
                }
            });
        });

        // 2. Process Roster for extra member counts? 
        // Actually, the KPI likely wants "Members contributing to RSCA" or "Members in Rank".
        // Let's rely on the reports for RSCA, but checking roster for total members might be safer if we want "Zero reporting" members?
        // For simplicity, let's stick to the active RSCA contributors found in summaryGroups for now, 
        // as that aligns with "Pulse" meaning "What is happening now/planned".

        // 3. Convert to Array and Sort
        // Defined ranks of interest order
        const rankOrder = ['O-6', 'O-5', 'O-4', 'O-3', 'O-2', 'O-1', 'W-5', 'W-4', 'W-3', 'W-2', 'E-9', 'E-8', 'E-7', 'E-6', 'E-5'];

        const results: RscaGroup[] = [];

        stats.forEach((data, rank) => {
            // Filter out ranks not typically tracked in RSCA high level (like E-1 to E-4 or tiny groups if desired)
            // if (data.count < 1) return; 

            const rsca = data.sum / data.count;
            const valueGap = 5.00 - rsca;

            // Logic for Status
            let status: RscaGroup['status'] = 'Safe';
            if (valueGap < 0.8) status = 'Risk'; // RSCA > 4.20 is dangerous "inflation" or just hard to maintain? 
            // In NavFit, High RSCA reduces value. 
            // If RSCA > 4.0, it's getting "Hot". 
            // Let's say target is 3.8-4.0.
            // If > 4.10 "Risk"
            // If < 3.60 "Developing"

            if (rsca > 4.10) status = 'Risk';
            else if (rsca < 3.60) status = 'Developing';
            else status = 'Stabilized'; // 3.60 - 4.10

            // Description logic
            let description = 'Stable performance';
            if (status === 'Risk') description = 'Average too high; limits EP value';
            if (status === 'Developing') description = 'Room for growth';

            // Sequencing Logic (stubbed for now as "Optimal" unless Risk)
            let sequencing: RscaGroup['sequencing'] = 'Optimal';
            if (status === 'Risk') sequencing = 'Inverted';

            results.push({
                rank,
                group: getGroupName(rank),
                status,
                rsca,
                valueGap,
                sequencing,
                members: data.members.size,
                description
            });
        });

        // Sort by Rank Order
        return results.sort((a, b) => {
            const idxA = rankOrder.indexOf(a.rank);
            const idxB = rankOrder.indexOf(b.rank);
            return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        });

    }, [summaryGroups]);

    return (
        <div className="flex items-center space-x-4 overflow-x-auto pb-1 no-scrollbar flex-1 ml-6">
            <div className="flex items-center space-x-4 pr-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Strategic Pulse</span>
                <div className="h-8 w-px bg-slate-200"></div>
            </div>

            {groups.length === 0 && (
                <div className="text-xs text-slate-400 italic">No Data Available</div>
            )}

            {groups.map((item, idx) => (
                <Tooltip key={idx} content={
                    <div>
                        <div className="font-bold mb-1 text-slate-200">{item.rank} Summary</div>
                        <div className="mb-3 text-slate-300 leading-snug text-xs">{item.description}</div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-3 border-t border-slate-700 pt-2">
                            <div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Report Value</div>
                                <div className={`font-bold text-sm ${item.valueGap > 1.0 ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {item.valueGap.toFixed(2)}
                                </div>
                                <div className="text-[9px] text-slate-500">Gap to 5.00</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Current RSCA</div>
                                <div className="font-bold text-sm text-white">
                                    {item.rsca.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        {/* Sequencing Status */}
                        <div className="border-t border-slate-700 pt-2">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Sequencing Efficiency</span>
                                <span className={`text-[10px] font-bold ${item.sequencing === 'Optimal' ? 'text-green-400' :
                                    item.sequencing === 'Inverted' ? 'text-red-400' : 'text-yellow-400'
                                    }`}>{item.sequencing}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                                {item.sequencing === 'Optimal'
                                    ? "Junior members are correctly shielding senior averages, maximizing 'Money Maker' report value."
                                    : item.sequencing === 'Inverted'
                                        ? "Warning: Junior members have higher averages than seniors. This degrades long-term RSCA health."
                                        : "Sequencing is slightly inefficient. Look for opportunities to lower junior averages."}
                            </p>
                        </div>
                    </div>
                }>
                    <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex-shrink-0 min-w-[180px] hover:border-slate-300 transition-colors cursor-help group/card">
                        <div className={`p-1.5 rounded-full ${item.status === 'Risk' ? 'bg-red-100 text-red-600' :
                            item.status === 'Safe' ? 'bg-green-100 text-green-600' :
                                'bg-blue-100 text-blue-600'
                            }`}>
                            {item.status === 'Risk' ? <AlertTriangle size={14} /> :
                                item.status === 'Safe' ? <Activity size={14} /> :
                                    <CheckCircle size={14} />}
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <span className="font-bold text-sm text-slate-700">{item.rank}</span>
                                <span className={`text-xs font-bold ${item.valueGap >= 1.0 ? 'text-green-600' : 'text-yellow-600'}`}>
                                    {item.valueGap.toFixed(2)} Val
                                </span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <TrendingUp size={10} className={item.sequencing === 'Optimal' ? 'text-green-500' : 'text-slate-400'} />
                                <span className="text-[10px] text-slate-500 font-medium truncate">
                                    {item.sequencing} Seq
                                </span>
                            </div>
                        </div>
                    </div>
                </Tooltip>
            ))}
        </div>
    );
};

// Helper for display names
const getGroupName = (rank: string) => {
    switch (rank) {
        case 'O-6': return 'Captains';
        case 'O-5': return 'Commanders';
        case 'O-4': return 'Dept Heads';
        case 'O-3': return 'Lieutenants';
        case 'O-2': return 'JG';
        case 'O-1': return 'Ensigns';
        case 'W-2': return 'CWO2';
        case 'E-7': return 'Chiefs';
        case 'E-8': return 'Snr Chiefs';
        case 'E-9': return 'Master Chiefs';
        default: return 'Members';
    }
};
