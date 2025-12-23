import { Activity } from 'lucide-react';

export const RscaHealthWidget = () => {
    return (
        <div className="grid grid-cols-12 gap-6 mb-6">
            {/* O-3 Group Card */}
            <div className="col-span-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-2">
                            <Activity className="text-blue-600" size={20} />
                            <h3 className="font-bold text-slate-800">O-3 Group</h3>
                        </div>
                        <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            Stabilized
                        </span>
                    </div>

                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-slate-500">24 Members</span>
                        <span className="text-green-600 font-bold">Safe (+4)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 mb-3">
                        <div className="bg-green-500 h-2.5 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        High flexibility to reward top performers. 4 buffers available.
                    </p>
                </div>
            </div>

            {/* E-6 Group Card */}
            <div className="col-span-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-2">
                            <Activity className="text-yellow-600" size={20} />
                            <h3 className="font-bold text-slate-800">E-6 Group</h3>
                        </div>
                        <span className="text-xs font-semibold bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                            Risk
                        </span>
                    </div>

                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-slate-500">18 Members</span>
                        <span className="text-yellow-600 font-bold">Caution (-1)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 mb-3">
                        <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Approaching instability. 1 gap closer recommended.
                    </p>
                </div>
            </div>

            {/* O-4 Group Card */}
            <div className="col-span-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-2">
                            <Activity className="text-slate-400" size={20} />
                            <h3 className="font-bold text-slate-800">O-4 Group</h3>
                        </div>
                        <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
                            Developing
                        </span>
                    </div>

                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-slate-500">8 Members</span>
                        <span className="text-slate-400 font-medium">--</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 mb-3">
                        <div className="bg-slate-300 h-2.5 rounded-full" style={{ width: '30%' }}></div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Group too small for valid RSCA projection.
                    </p>
                </div>
            </div>
        </div>
    );
};
