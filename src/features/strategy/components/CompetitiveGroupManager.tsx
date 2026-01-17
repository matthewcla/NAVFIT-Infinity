import { useStrategyMetrics } from '../hooks/useStrategyMetrics';
import { Users, TrendingUp, TrendingDown, Target } from 'lucide-react';

export function CompetitiveGroupManager() {
    const { compGroups } = useStrategyMetrics();

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-50">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Competitive Groups</h2>
                        <p className="text-slate-500">Manage strategy and health across all competitive categories.</p>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {compGroups.map(group => (
                        <div key={group.id} className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col">
                            {/* Card Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900">{group.label}</h3>
                                    <div className="flex items-center mt-1 text-slate-500 text-sm">
                                        <Users className="w-3.5 h-3.5 mr-1" />
                                        <span>{group.memberCount} Members</span>
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-semibold border ${
                                    group.rscaDelta > 0.1 ? 'bg-red-50 text-red-700 border-red-200' :
                                    group.rscaDelta > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-green-50 text-green-700 border-green-200'
                                }`}>
                                    {group.rscaDelta > 0 ? `+${group.rscaDelta.toFixed(2)}` : group.rscaDelta.toFixed(2)} Delta
                                </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-slate-50 p-3 rounded-md">
                                    <p className="text-xs text-slate-500 mb-1 flex items-center">
                                        <Target className="w-3 h-3 mr-1" /> Target
                                    </p>
                                    <p className="text-lg font-bold text-slate-700">{group.targetRsca.toFixed(2)}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-md">
                                    <p className="text-xs text-slate-500 mb-1 flex items-center">
                                        <TrendingUp className="w-3 h-3 mr-1" /> Projected
                                    </p>
                                    <p className={`text-lg font-bold ${
                                        group.projectedRsca > group.targetRsca ? 'text-red-600' : 'text-slate-700'
                                    }`}>
                                        {group.projectedRsca.toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            {/* Gains / Losses Footer */}
                            <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center text-sm">
                                <div className="flex space-x-4">
                                    <span className="flex items-center text-green-600 font-medium">
                                        <TrendingUp className="w-3 h-3 mr-1" />
                                        {group.gains} Gains
                                    </span>
                                    <span className="flex items-center text-red-600 font-medium">
                                        <TrendingDown className="w-3 h-3 mr-1" />
                                        {group.losses} Losses
                                    </span>
                                </div>

                                {/* Placeholder for drill down action */}
                                {/* <button className="text-indigo-600 hover:text-indigo-800 p-1">
                                    <ArrowRight className="w-4 h-4" />
                                </button> */}
                            </div>
                        </div>
                    ))}
                </div>

                {compGroups.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        No competitive groups found. Check your roster data.
                    </div>
                )}
            </div>
        </div>
    );
}
