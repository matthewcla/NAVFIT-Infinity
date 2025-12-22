
import { ChevronDown } from 'lucide-react';

interface GroupHeaderProps {
    title: string;
    count: number;
    avgRSCA: string | number;
}

export const GroupHeader = ({ title, count, avgRSCA }: GroupHeaderProps) => (
    <div className="bg-slate-100 px-4 py-2 border-y border-slate-200 flex justify-between items-center">
        <div className="flex items-center space-x-2">
            <ChevronDown size={16} className="text-slate-500" />
            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{title}</h4>
            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{count}</span>
        </div>
        <div className="text-xs font-mono text-slate-500">
            Current Group Avg: <span className="font-bold text-slate-700">{avgRSCA}</span>
        </div>
    </div>
);
