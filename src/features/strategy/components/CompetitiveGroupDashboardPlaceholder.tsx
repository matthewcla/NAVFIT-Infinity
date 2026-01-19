import { Orbit } from 'lucide-react';

export function CompetitiveGroupDashboardPlaceholder() {
    return (
        <div className="h-full bg-slate-50 border-l border-slate-200 p-8 flex flex-col items-center justify-center text-center text-slate-400">
            <Orbit className="w-16 h-16 mb-4 opacity-20 text-indigo-500" />
            <h2 className="text-xl font-bold text-slate-600 mb-2">Competitive Groups</h2>
            <p>Event-to-Event Timeline Dashboard coming soon.</p>
        </div>
    );
}
