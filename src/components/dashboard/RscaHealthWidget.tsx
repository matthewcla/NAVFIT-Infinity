import { Activity } from 'lucide-react';

export const RscaHealthWidget = () => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <Activity className="text-blue-600" size={20} />
                    <h3 className="font-bold text-slate-800">RSCA Health Summary</h3>
                </div>
                <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    Stabilized
                </span>
            </div>

            <div className="space-y-6">
                {/* O-3 Group */}
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-slate-700">O-3 Group (N=24)</span>
                        <span className="text-green-600 font-bold">Safe (+4)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 mb-1">
                        <div className="bg-green-500 h-2.5 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                    <p className="text-xs text-slate-500">
                        High flexibility to reward top performers. 4 buffers available.
                    </p>
                </div>

                {/* E-6 Group */}
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-slate-700">E-6 Group (N=18)</span>
                        <span className="text-yellow-600 font-bold">Caution (-1)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 mb-1">
                        <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                    <p className="text-xs text-slate-500">
                        Approaching instability. 1 gap closer recommended.
                    </p>
                </div>

                {/* O-4 Group */}
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-slate-700">O-4 Group (N=8)</span>
                        <span className="text-slate-400 font-medium">Developing</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 mb-1">
                        <div className="bg-slate-300 h-2.5 rounded-full" style={{ width: '30%' }}></div>
                    </div>
                    <p className="text-xs text-slate-500">
                        Group too small for valid RSCA projection.
                    </p>
                </div>
            </div>
        </div>
    );
};
