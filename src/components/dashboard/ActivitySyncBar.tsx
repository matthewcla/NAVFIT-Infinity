import { RefreshCw, CheckCircle2 } from 'lucide-react';

export const ActivitySyncBar = () => {
    return (
        <div className="bg-white border-t border-slate-200 px-8 py-3 flex justify-between items-center text-sm">
            <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2 text-slate-600">
                    <span className="font-semibold">Recent Activity:</span>
                    <span>LT Mitchell (O-3) Draft Updated</span>
                    <span className="text-slate-400">•</span>
                    <span>2 mins ago</span>
                </div>
            </div>

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
    );
};
