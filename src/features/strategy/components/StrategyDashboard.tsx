import { useStrategyNotifications, type DashboardAlert } from '../hooks/useStrategyNotifications';
import { useNavfitStore } from '@/store/useNavfitStore';
import {
    AlertTriangle,
    FileText,
    ChevronRight,
    ShieldAlert,
    Users,
    LayoutDashboard,
    ArrowRight
} from 'lucide-react';

export function StrategyDashboard() {
    const alerts = useStrategyNotifications();
    const { setStrategyViewMode, selectCycle, setSelectedCompetitiveGroupKey } = useNavfitStore();

    const handleAction = (alert: DashboardAlert) => {
        if (alert.targetMode === 'planner') {
            setSelectedCompetitiveGroupKey(alert.targetId);
            setStrategyViewMode('planner');
        } else {
            // For summary groups, we need the comp group key for context if possible,
            // but selectCycle handles loading the group.
            // We might need to lookup the group to get the key?
            // selectCycle(id, key)
            // Ideally alerts should carry the key too.
            // For now, we assume the store finds it or we pass a dummy key if needed (the store uses ID primarily).
            selectCycle(alert.targetId, '');
            setStrategyViewMode('cycles'); // Ensure we are in cycle mode (though selectCycle usually sets workspace)
        }
    };

    const operationalAlerts = alerts.filter(a => a.type === 'Operational');
    const adminAlerts = alerts.filter(a => a.type === 'Administrative');

    return (
        <div className="h-full bg-slate-50 overflow-y-auto">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <LayoutDashboard size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Strategy Command Center</h1>
                </div>
                <p className="text-slate-500 max-w-2xl">
                    Overview of your operational strategy and active administrative cycles.
                    Prioritize establishing rank orders for new gains and managing upcoming summary groups.
                </p>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">

                {/* Column 1: Operational Planning (Competitive Groups) */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Users className="text-indigo-600" size={20} />
                            Competitive Group Plans
                        </h2>
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {operationalAlerts.length} Action Items
                        </span>
                    </div>

                    <div className="grid gap-4">
                        {operationalAlerts.length === 0 ? (
                            <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-slate-500">
                                <p>All competitive groups are ranked and up to date.</p>
                            </div>
                        ) : (
                            operationalAlerts.map(alert => (
                                <div
                                    key={alert.id}
                                    onClick={() => handleAction(alert)}
                                    className="group relative bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer overflow-hidden"
                                >
                                    <div className={`absolute top-0 left-0 w-1 h-full ${alert.severity === 'High' ? 'bg-amber-500' : 'bg-indigo-500'}`} />

                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                    {alert.title}
                                                </h3>
                                                {alert.severity === 'High' && (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                                        <AlertTriangle size={10} />
                                                        Attention
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500 mb-3">{alert.description}</p>

                                            <div className="flex items-center text-xs font-medium text-indigo-600 group-hover:translate-x-1 transition-transform">
                                                {alert.actionLabel} <ArrowRight size={12} className="ml-1" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Always show generic entry point */}
                        <button
                            onClick={() => setStrategyViewMode('planner')}
                            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-medium text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2"
                        >
                            View All Competitive Groups
                        </button>
                    </div>
                </div>

                {/* Column 2: Administration (Summary Groups) */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <FileText className="text-emerald-600" size={20} />
                            Summary Group Admin
                        </h2>
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {adminAlerts.length} Active Cycles
                        </span>
                    </div>

                    <div className="grid gap-4">
                        {adminAlerts.length === 0 ? (
                            <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-slate-500">
                                <p>No active summary groups requiring attention.</p>
                            </div>
                        ) : (
                            adminAlerts.map(alert => (
                                <div
                                    key={alert.id}
                                    onClick={() => handleAction(alert)}
                                    className="group relative bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />

                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors mb-1">
                                                {alert.title}
                                            </h3>
                                            <p className="text-sm text-slate-500 mb-3">{alert.description}</p>

                                            <div className="flex items-center text-xs font-medium text-emerald-600 group-hover:translate-x-1 transition-transform">
                                                {alert.actionLabel} <ArrowRight size={12} className="ml-1" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}

                        <button
                            onClick={() => setStrategyViewMode('cycles')}
                            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-medium text-slate-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all flex items-center justify-center gap-2"
                        >
                            View All Summary Groups
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
