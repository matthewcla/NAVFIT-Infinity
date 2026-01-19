import { Layout } from 'lucide-react';

export function DashboardMetrics() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Layout className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Select a cycle to view strategy context</p>
        </div>
    );
}
