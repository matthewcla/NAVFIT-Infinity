import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
    type ChartOptions
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useStrategyMetrics } from '../hooks/useStrategyMetrics';
import { useNavfitStore } from '@/store/useNavfitStore';
import { Calendar, CheckCircle2, FileText, ArrowRight } from 'lucide-react';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement
);

export function StrategyDashboard() {
    const { compGroups, taskList } = useStrategyMetrics();
    const { selectCycle } = useNavfitStore();

    // --- Chart Data Preparation ---
    const labels = compGroups.map(g => g.label);

    // 1. Gains vs Losses
    const gainsLossesData = {
        labels,
        datasets: [
            {
                label: 'Gains',
                data: compGroups.map(g => g.gains),
                backgroundColor: 'rgba(34, 197, 94, 0.6)', // Green-500
                borderColor: 'rgba(34, 197, 94, 1)',
                borderWidth: 1,
            },
            {
                label: 'Losses',
                data: compGroups.map(g => g.losses),
                backgroundColor: 'rgba(239, 68, 68, 0.6)', // Red-500
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 1,
            },
        ],
    };

    const glOptions: ChartOptions<'bar'> = {
        responsive: true,
        plugins: {
            legend: { position: 'top' as const },
            title: { display: false, text: 'Gains vs Losses' },
        },
        scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } }
        }
    };

    // 2. RSCA Adherence (Projected vs Target)
    // We'll use a Bar chart for Projected, and maybe a Line for Target if it varies?
    // Since Target is roughly constant (or per group), we can plot it.
    // If we use 'bar' type, we can mix types if we want, but simple side-by-side or stacked is fine.
    // Let's do side-by-side: Projected vs Target.
    const rscaData = {
        labels,
        datasets: [
            {
                label: 'Projected RSCA',
                data: compGroups.map(g => g.projectedRsca),
                backgroundColor: 'rgba(99, 102, 241, 0.6)', // Indigo-500
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1,
            },
            {
                label: 'Target RSCA',
                data: compGroups.map(g => g.targetRsca),
                type: 'line' as const, // Line overlay
                borderColor: 'rgba(245, 158, 11, 1)', // Amber-500
                borderWidth: 2,
                pointRadius: 3,
                fill: false,
            }
        ],
    };

    const rscaOptions: ChartOptions<'bar'> = {
        responsive: true,
        plugins: {
            legend: { position: 'top' as const },
            title: { display: false, text: 'RSCA Adherence' },
        },
        scales: {
            y: {
                min: 3.0, // Zoom in to relevant range
                max: 4.5, // Usually max is 5.0 but for RSCA 4.5 is high enough
            }
        }
    };

    // --- Task Handling ---
    const handleTaskClick = (groupId: string) => {
        // Navigate to the Summary Group Manager and select the group
        // First switch tab/view if needed (though we are in Strategy tab)
        // We need to switch the view mode in CommandStrategyCenter (which is handled by local state in parent currently, but needs to be accessible).
        // Wait, `CommandStrategyCenter` (wrapper) will handle view switching.
        // If I click a task, I want to go to the "Summary Groups" view AND select the cycle.

        // Use store to set selection
        // We need a way to tell the parent to switch tabs.
        // OR we put the `activeView` state in the store.
        // For now, I'll update the store to select the cycle. The user will have to switch tabs manually unless I add a global view state.
        // Requirement said "integrated landing page".
        // I should probably add `strategyDashboardView` to the store or use the existing `strategyViewMode`.
        // Currently `strategyViewMode` is 'landing' | 'workspace'.
        // I might need to expand it or add `activeStrategyTab`.
        // Let's assume for now I select it and the user might need to click "Summary Groups" or I can simulate it.

        // Actually, I will add `setStrategyDashboardTab` to the store if I can, OR I'll modify `strategyViewMode`.
        // But I don't want to modify store schema too much if I can avoid it.

        // Let's rely on `selectCycle` which sets `selectedCycleId`.
        // In the parent `CommandStrategyCenter`, if `selectedCycleId` changes, maybe we should auto-switch to Summary Groups?
        // Or I pass a callback props? No, `StrategyDashboard` is a child.

        // I will trigger `selectCycle`.
        // And I will use a custom event or store state.
        // Let's use `selectCycle`.
        // And I will add a button "Go to Report" which does `selectCycle`.

        // To make it seamless, I'll update `useNavfitStore` to add `strategyDashboardTab` state?
        // No, I'll just use `selectCycle`. The parent component `CommandStrategyCenter` can watch `selectedCycleId`?
        // No, that might be annoying if I just want to select.

        // For now: Just select.

        // Actually, looking at `CommandStrategyCenter` (the new wrapper I will build), I can check `selectedCycleId`.
        // If I click a task, I likely want to go to the details.

        const group = useNavfitStore.getState().summaryGroups.find(g => g.id === groupId);
        if (group) {
             selectCycle(group.id, group.competitiveGroupKey);
             // Dispatch a custom event to tell CommandStrategyCenter to switch tab?
             window.dispatchEvent(new CustomEvent('navfit-switch-strategy-tab', { detail: 'summary-groups' }));
        }
    };

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-50">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header Section */}
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Command Dashboard</h2>
                    <p className="text-slate-500">Overview of competitive group health and prioritized tasks.</p>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Gains / Losses */}
                    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
                            <ArrowRight className="w-4 h-4 mr-2 text-indigo-500" />
                            Projected Gains & Losses
                        </h3>
                        <div className="h-64">
                            <Bar data={gainsLossesData} options={glOptions} />
                        </div>
                    </div>

                    {/* RSCA Adherence */}
                    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
                            <CheckCircle2 className="w-4 h-4 mr-2 text-indigo-500" />
                            RSCA Plan Adherence
                        </h3>
                        <div className="h-64">
                            <Bar data={rscaData as any} options={rscaOptions} />
                        </div>
                    </div>
                </div>

                {/* Prioritized Task List */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800 flex items-center">
                            <FileText className="w-4 h-4 mr-2 text-indigo-500" />
                            Prioritized Tasks
                        </h3>
                        <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                            {taskList.length} Pending
                        </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {taskList.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <CheckCircle2 className="w-12 h-12 mx-auto text-green-400 mb-3" />
                                <p>All caught up! No critical tasks requiring attention.</p>
                            </div>
                        ) : (
                            taskList.map(task => (
                                <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4 cursor-pointer" onClick={() => handleTaskClick(task.groupId)}>
                                    <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${
                                        task.priority === 'High' ? 'bg-red-500' :
                                        task.priority === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'
                                    }`} />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-sm font-medium text-slate-900 truncate">
                                                {task.title}
                                            </p>
                                            {task.date && (
                                                <span className="flex items-center text-xs text-slate-500">
                                                    <Calendar className="w-3 h-3 mr-1" />
                                                    {new Date(task.date).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500 truncate">
                                            {task.description}
                                        </p>
                                    </div>

                                    <div className="flex-shrink-0 self-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            task.type === 'Violation' ? 'bg-red-100 text-red-800' :
                                            task.type === 'Review' ? 'bg-purple-100 text-purple-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                            {task.type}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
