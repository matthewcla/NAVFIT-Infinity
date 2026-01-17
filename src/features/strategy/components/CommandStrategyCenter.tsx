import { useState, useEffect } from 'react';
import { Anchor, CheckCircle2, RefreshCw, LayoutDashboard, List, Layers } from 'lucide-react';
import { SummaryGroupManager } from './SummaryGroupManager';
import { StrategyDashboard } from './StrategyDashboard';
import { CompetitiveGroupManager } from './CompetitiveGroupManager';

type StrategyView = 'dashboard' | 'comp-groups' | 'summary-groups';

export function CommandStrategyCenter() {
    const [activeView, setActiveView] = useState<StrategyView>('dashboard');
    // We listen to store purely to know if we should switch?
    // Actually the dashboard component dispatches a custom event.

    useEffect(() => {
        const handleSwitch = (e: CustomEvent<StrategyView>) => {
            setActiveView(e.detail);
        };
        // Cast to any because CustomEvent generic is not perfectly inferred in standard DOM types without augmentation
        window.addEventListener('navfit-switch-strategy-tab' as any, handleSwitch as any);
        return () => window.removeEventListener('navfit-switch-strategy-tab' as any, handleSwitch as any);
    }, []);

    const renderContent = () => {
        switch (activeView) {
            case 'dashboard': return <StrategyDashboard />;
            case 'comp-groups': return <CompetitiveGroupManager />;
            case 'summary-groups': return <SummaryGroupManager />;
            default: return <StrategyDashboard />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between shrink-0 bg-white border-slate-200">
                <div className="flex items-center gap-8">
                     {/* Logo Area */}
                    <div className="flex items-center gap-3">
                        <div className="relative text-indigo-900 w-8 h-8 flex items-center justify-center">
                            <Anchor className="absolute w-7 h-7 stroke-[2.5]" />
                        </div>
                        <h1 className="text-xl font-normal text-slate-900">
                            <span className="font-bold">NAVFIT</span> Infinity
                        </h1>
                    </div>

                    {/* Navigation Tabs */}
                    <nav className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveView('dashboard')}
                            className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                                activeView === 'dashboard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            Dashboard
                        </button>
                        <button
                            onClick={() => setActiveView('comp-groups')}
                            className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                                activeView === 'comp-groups' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <List className="w-4 h-4 mr-2" />
                            Competitive Groups
                        </button>
                        <button
                            onClick={() => setActiveView('summary-groups')}
                            className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                                activeView === 'summary-groups' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Layers className="w-4 h-4 mr-2" />
                            Summary Groups
                        </button>
                    </nav>
                </div>

                {/* Status */}
                <div className="flex items-center space-x-4">
                     <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                        <CheckCircle2 size={14} />
                        <span className="font-medium text-xs">CNPC Sync: Active</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-500 hover:text-blue-600 cursor-pointer transition-colors">
                        <RefreshCw size={14} />
                        <span className="text-xs">Last synced: 10:42 AM</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                {renderContent()}
            </div>
        </div>
    );
}
