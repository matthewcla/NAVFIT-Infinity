

export interface KPICardProps {
    title: string;
    value: string;
    subtext: string;
    trend?: 'up' | 'down';
    color?: 'blue' | 'red';
}

export const KPICard = ({ title, value, subtext, trend, color = 'blue' }: KPICardProps) => (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start mb-2">
            <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider">{title}</h3>
            {trend && (
                <span className={`flex items-center text-xs font-bold ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {trend === 'up' ? '↑' : '↓'}
                </span>
            )}
        </div>
        <div className="text-3xl font-bold text-slate-800 mb-1">{value}</div>
        <div className={`text-xs ${color === 'red' ? 'text-red-500' : 'text-slate-400'}`}>{subtext}</div>
    </div>
);
