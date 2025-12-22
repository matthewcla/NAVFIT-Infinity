import { Radar, ArrowRight, TrendingUp } from 'lucide-react';

export const OpportunityRadarWidget = () => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <Radar className="text-purple-600" size={20} />
                    <h3 className="font-bold text-slate-800">Opportunity Radar</h3>
                </div>
                <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                    High Volume
                </span>
            </div>

            <div className="mb-6">
                <div className="text-sm font-medium text-slate-500 mb-1">Strategic Volume Available</div>
                <div className="text-3xl font-bold text-slate-800 flex items-end">
                    5 Reports
                    <span className="text-sm font-normal text-slate-500 ml-2 mb-1">eligible for 90-day Special</span>
                </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-4">
                <div className="flex items-start space-x-3">
                    <TrendingUp className="text-purple-600 mt-0.5" size={18} />
                    <div>
                        <h4 className="text-sm font-bold text-purple-900">Insight</h4>
                        <p className="text-xs text-purple-800 mt-1">
                            Completing these 5 reports now will lower your O-3 RSCA by <strong>0.04</strong> before the November periodic cycle.
                        </p>
                    </div>
                </div>
            </div>

            <button className="w-full py-2 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center group">
                Review Candidates
                <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
    );
};
