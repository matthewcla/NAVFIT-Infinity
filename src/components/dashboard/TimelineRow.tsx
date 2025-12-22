
import {
    Plus,
    Users,
} from 'lucide-react';
import type { Member } from '../../types';
import { MONTHS, PERIODIC_SCHEDULE, CURRENT_YEAR } from '../../lib/constants';

interface TimelineRowProps {
    member: Member;
    coDetachDate: string;
    avgRSCA: number;
    onReportClick: () => void;
}

export const TimelineRow = ({ member, coDetachDate, avgRSCA, onReportClick }: TimelineRowProps) => {
    // Helper to calculate position percentage (0-100%) based on month (0-11)
    const getPos = (monthIndex: number, day = 15) => {
        const totalDays = 12 * 30;
        const currentDays = (monthIndex * 30) + day;
        return (currentDays / totalDays) * 100;
    };

    const periodicMonth = PERIODIC_SCHEDULE[member.rank] || -1;
    const periodicPos = periodicMonth > 0 ? getPos(periodicMonth - 1, 15) : -1;

    // Parse Dates
    const detachDateObj = new Date(coDetachDate);
    const coDetachPos = getPos(detachDateObj.getMonth(), detachDateObj.getDate());

    const isTransferring = member.prd && member.prd.startsWith(CURRENT_YEAR.toString());
    const transferDate = isTransferring && member.prd ? new Date(member.prd) : null;
    const transferPos = transferDate ? getPos(transferDate.getMonth(), transferDate.getDate()) : -1;

    const isGaining = member.status === 'Gain';
    const gainDate = isGaining && member.gainDate ? new Date(member.gainDate) : null;
    const gainPos = gainDate ? getPos(gainDate.getMonth(), gainDate.getDate()) : -1;

    return (
        <div className="grid grid-cols-12 gap-4 py-3 border-b border-slate-100 hover:bg-slate-50 items-center">
            {/* Member Info */}
            <div className="col-span-3 pl-4">
                <div className="font-bold text-slate-800 text-sm">{member.name}</div>
                <div className="text-xs text-slate-500 flex items-center space-x-2">
                    <span className="bg-slate-200 px-1.5 rounded text-slate-700 font-mono">{member.rank}</span>
                    <span>{member.designator || member.rating}</span>
                    <span className="text-blue-600 font-semibold">• {member.milestone}</span>
                </div>
            </div>

            {/* Trajectory Stats REMOVED */}
            {/* <div className="col-span-2 flex flex-col justify-center border-l border-r border-slate-100 px-2">
                ...
            </div> */}

            {/* The Timeline Visual */}
            <div className="col-span-9 relative h-12 flex items-center pr-4">
                {/* Background Grid Lines (Months) */}
                {MONTHS.map((_, idx) => (
                    <div key={idx} className="absolute h-full border-r border-slate-100 top-0" style={{ left: `${(idx + 1) * 8.33}%` }}></div>
                ))}

                {/* Timeline Track */}
                <div className="absolute w-full h-1 bg-slate-200 rounded top-1/2 -translate-y-1/2"></div>

                {/* 1. Periodic Report Marker - Only show if before Detach Date */}
                {!isGaining && periodicPos > 0 && periodicPos <= coDetachPos && (
                    <div
                        className={`absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 shadow-sm flex items-center justify-center z-10 group cursor-pointer hover:scale-110 transition-transform ${typeof member.nextPlan === 'number' && member.nextPlan >= avgRSCA
                            ? 'bg-blue-500 border-green-400 ring-2 ring-green-100'
                            : 'bg-blue-500 border-white'
                            }`}
                        style={{ left: `${periodicPos}%` }}
                        title={`Periodic Report Due: ${MONTHS[periodicMonth - 1]}`}
                        onClick={onReportClick}
                    >
                        <span className="text-[10px] font-bold text-white">
                            {member.nextPlan === 'NOB' || !member.nextPlan ? 'NOB' : (member.nextPlan as number).toFixed(2)}
                        </span>

                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 pointer-events-none text-center">
                            <div>Periodic: {member.nextPlan}</div>
                            {typeof member.nextPlan === 'number' && (
                                <div className={member.nextPlan >= avgRSCA ? 'text-green-300' : 'text-yellow-300'}>
                                    {member.nextPlan >= avgRSCA ? '+' : ''}{(member.nextPlan - avgRSCA).toFixed(2)} vs RSCA
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. Transfer/Loss Marker - Only show if before Detach Date */}
                {isTransferring && transferPos <= coDetachPos && (
                    <div
                        className={`absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 shadow-sm flex items-center justify-center z-10 group cursor-pointer hover:scale-110 transition-transform ${typeof member.target === 'number' && member.target >= avgRSCA
                            ? 'bg-red-500 border-green-400 ring-2 ring-green-100'
                            : 'bg-red-500 border-white'
                            }`}
                        style={{ left: `${transferPos}%` }}
                        title={`Transfer PRD: ${member.prd}`}
                        onClick={onReportClick}
                    >
                        <span className="text-[10px] font-bold text-white">
                            {member.target ? member.target.toFixed(2) : 'N/A'}
                        </span>

                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 pointer-events-none text-center">
                            <div>Transfer: Detach Report</div>
                            {typeof member.target === 'number' && (
                                <div className={member.target >= avgRSCA ? 'text-green-300' : 'text-yellow-300'}>
                                    {member.target >= avgRSCA ? '+' : ''}{(member.target - avgRSCA).toFixed(2)} vs RSCA
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. Gain Marker */}
                {isGaining && (
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center z-10 group cursor-pointer"
                        style={{ left: `${gainPos}%` }}
                        title={`Gain Date: ${member.gainDate}`}
                    >
                        <Plus size={12} className="text-white" />
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 pointer-events-none">
                            Gain: {member.gainDate}
                        </div>
                    </div>
                )}

                {/* 4. CO Detachment Line (Change of Reporting Senior) */}
                {/* Only show if the member is onboard during this time */}
                {(!isGaining || gainPos < coDetachPos) && (!isTransferring || transferPos > coDetachPos) && (
                    <div
                        className="absolute h-full w-0.5 bg-purple-500 top-0 z-0 opacity-60 dashed"
                        style={{ left: `${coDetachPos}%`, borderLeft: '2px dashed #a855f7' }}
                    >
                        <div className="absolute top-1/2 -translate-y-1/2 -left-2.5 w-5 h-5 bg-purple-100 rounded-full border border-purple-500 flex items-center justify-center z-20">
                            <Users size={10} className="text-purple-700" />
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
