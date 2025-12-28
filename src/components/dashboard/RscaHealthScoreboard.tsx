import { Activity, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

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

const groups: RscaGroup[] = [
    {
        rank: 'O-3',
        group: 'Lieutenants',
        status: 'Stabilized',
        rsca: 3.42,
        valueGap: 1.58,
        sequencing: 'Optimal',
        members: 24,
        description: 'High flexibility'
    },
    {
        rank: 'E-6',
        group: 'First Class',
        status: 'Risk',
        rsca: 4.15,
        valueGap: 0.85,
        sequencing: 'Inverted',
        members: 18,
        description: 'Approaching instability'
    },
    {
        rank: 'O-4',
        group: 'Department Heads',
        status: 'Developing',
        rsca: 3.80,
        valueGap: 1.20,
        sequencing: 'Concern',
        members: 8,
        description: 'Group too small'
    },
    {
        rank: 'E-7',
        group: 'Chiefs',
        status: 'Safe',
        rsca: 3.60,
        valueGap: 1.40,
        sequencing: 'Optimal',
        members: 15,
        description: 'Stable'
    },
];

export const RscaHealthScoreboard = () => {
    return (
        <div className="flex items-center space-x-4 overflow-x-auto pb-1 no-scrollbar flex-1 ml-6">
            <div className="flex items-center space-x-4 pr-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Strategic Pulse</span>
                <div className="h-8 w-px bg-slate-200"></div>
            </div>

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
