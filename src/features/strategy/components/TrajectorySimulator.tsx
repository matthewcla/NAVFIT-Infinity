
import { useState, useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { Calculator } from 'lucide-react';

interface TrajectorySimulatorProps {
    currentAvg: number;
    totalReportsSoFar: number;
    // Optional: Pre-fill targets from career path data
    targetCA?: number;
}

export function TrajectorySimulator({ currentAvg, totalReportsSoFar, targetCA = 4.30 }: TrajectorySimulatorProps) {
    // Inputs
    const [target, setTarget] = useState(targetCA);
    const [remainingReports, setRemainingReports] = useState(3);

    // Calculation: Required Average to hit Target CA at end of tour
    // (CurrentAvg * N_past + Required * N_future) / (N_past + N_future) = Target
    // Required * N_future = Target * (N_past + N_future) - (CurrentAvg * N_past)
    // Required = (Target * Total - CurrentSum) / N_future

    const requiredMta = useMemo(() => {
        const pastSum = currentAvg * totalReportsSoFar;
        const totalReports = totalReportsSoFar + remainingReports;
        const totalSumNeeded = target * totalReports;
        const remainingSumNeeded = totalSumNeeded - pastSum;

        let req = remainingSumNeeded / remainingReports;
        // Clamp visually but keep real value for logic
        return req;
    }, [currentAvg, totalReportsSoFar, target, remainingReports]);

    const isFeasible = requiredMta <= 5.0;
    const isEasy = requiredMta <= currentAvg;

    // Visualization Data
    const data = useMemo(() => {
        const points = [];
        // Past (Simplified as one point or start point)
        points.push({ name: 'Start', ca: currentAvg, type: 'actual' });

        // Future Projection
        let runningSum = currentAvg * totalReportsSoFar;
        for (let i = 1; i <= remainingReports; i++) {
            const mta = Math.min(5.0, requiredMta); // Visual cap at 5.0
            runningSum += mta;
            const ca = runningSum / (totalReportsSoFar + i);
            points.push({
                name: `+${i}`,
                ca: Number(ca.toFixed(2)),
                requiredMta: Number(mta.toFixed(2)),
                type: 'projected'
            });
        }
        return points;
    }, [currentAvg, totalReportsSoFar, requiredMta, remainingReports]);

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 w-full">
            <div className="flex items-center gap-2 mb-4 text-slate-700">
                <Calculator className="w-4 h-4" />
                <h3 className="text-sm font-semibold">Trajectory Simulator</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="text-xs text-slate-500 uppercase font-semibold">Target Cumulative</label>
                    <div className="flex items-center gap-2 mt-1">
                        <input
                            type="number" step="0.01"
                            className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 font-bold text-slate-800"
                            value={target}
                            onChange={e => setTarget(parseFloat(e.target.value))}
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs text-slate-500 uppercase font-semibold">Remaining Reports</label>
                    <div className="flex items-center gap-2 mt-1">
                        <input
                            type="number" step="1"
                            className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 font-bold text-slate-800"
                            value={remainingReports}
                            onChange={e => setRemainingReports(parseInt(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            <div className={`p-3 rounded-md mb-6 border ${isFeasible ? 'bg-indigo-50 border-indigo-100' : 'bg-red-50 border-red-100'}`}>
                <div className="text-xs font-semibold uppercase text-slate-500 mb-1">Required Average</div>
                <div className={`text-2xl font-bold ${isFeasible ? 'text-indigo-600' : 'text-red-600'}`}>
                    {requiredMta.toFixed(2)}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                    {!isFeasible
                        ? "Impossible. Exceeds 5.0 max."
                        : isEasy
                            ? "On Track. Below current average."
                            : "Stretch Goal. Above current average."}
                </div>
            </div>

            <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip
                            contentStyle={{ borderRadius: '6px', fontSize: '12px' }}
                            formatter={(val: number | string | Array<number | string> | undefined, name) => [val, name === 'ca' ? 'Cumulative Avg' : 'Report MTA']}
                        />
                        <ReferenceLine y={target} stroke="#10b981" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="ca" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
