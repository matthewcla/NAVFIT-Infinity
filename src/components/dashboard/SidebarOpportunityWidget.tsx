import { Radar, ArrowRight, TrendingUp } from 'lucide-react';

export const SidebarOpportunityWidget = () => {
    return (
        <div className="p-4 mx-4 mb-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <div className="flex items-center space-x-2 mb-3">
                <Radar className="text-purple-400" size={16} />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Opportunity Radar</h3>
            </div>

            <div className="mb-3">
                <div className="text-2xl font-bold text-white flex items-baseline">
                    5
                    <span className="text-xs font-normal text-slate-400 ml-1.5">High Volume Candidates</span>
                </div>
            </div>

            <div className="bg-purple-900/20 p-2 rounded border border-purple-500/20 mb-3">
                <div className="flex items-start space-x-2">
                    <TrendingUp className="text-purple-400 mt-0.5 flex-shrink-0" size={14} />
                    <p className="text-[10px] text-purple-200 leading-snug">
                        Executing these strategies lowers O-3 RSCA by <strong className="text-purple-300">0.04</strong>.
                    </p>
                </div>
            </div>

            <div className="flex items-center text-[10px] text-slate-400 group cursor-pointer hover:text-white transition-colors">
                <span>View Candidates</span>
                <ArrowRight size={12} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
            </div>
        </div>
    );
};
