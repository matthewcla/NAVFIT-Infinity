import { useState, useEffect } from 'react';
import type { Board } from '../../types';
import { cn } from '../../lib/utils';
import { RefreshCw, Calendar, Users, Plus, ChevronRight, Filter } from 'lucide-react';
import { BoardService } from '../../lib/services/boardService';

export function SelectionBoardsManager() {
    const [boards, setBoards] = useState<Board[]>([]);
    const [loading, setLoading] = useState(false);
    const [year, setYear] = useState(new Date().getFullYear());

    useEffect(() => {
        loadData();
    }, [year]);

    const loadData = async () => {
        setLoading(true);
        try {
            const schedule = await BoardService.getSchedule(year);
            setBoards(schedule.boards);
        } catch (e) {
            console.error("Error loading board data", e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCustomBoard = async () => {
        const name = prompt("Enter Custom Board Name:");
        if (!name) return;

        await BoardService.addCustomBoard({
            name,
            type: 'Custom',
            conveningDate: new Date().toISOString().split('T')[0],
            eligibles: []
        });
        loadData();
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header - Consistent with StrategicPulseDashboard */}
            <header className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-8 shadow-sm flex-shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white">
                        <Calendar size={18} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 leading-tight">Board Schedule</h1>
                        <p className="text-xs text-slate-500 font-medium">{year} Schedule</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Year Toggle */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button onClick={() => setYear(year - 1)} className="px-3 py-1 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-white rounded-md transition-all">
                            {year - 1}
                        </button>
                        <div className="px-3 py-1 text-xs font-bold text-indigo-700 bg-white rounded-md shadow-sm border border-slate-200/50">
                            {year}
                        </div>
                        <button onClick={() => setYear(year + 1)} className="px-3 py-1 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-white rounded-md transition-all">
                            {year + 1}
                        </button>
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-1" />

                    <button onClick={loadData} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors" title="Refresh Data">
                        <RefreshCw size={18} className={cn(loading && "animate-spin")} />
                    </button>

                    <button
                        onClick={handleAddCustomBoard}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Add Board
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* Summary Cards Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Boards</h3>
                            <div className="flex items-end justify-between">
                                <span className="text-3xl font-bold text-slate-900">{boards.length}</span>
                                <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">+2 from last year</span>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Statutory</h3>
                            <div className="flex items-end justify-between">
                                <span className="text-3xl font-bold text-slate-900">{boards.filter(b => b.type === 'Statutory').length}</span>
                                <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 w-3/4"></div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Eligible Sailors</h3>
                            <div className="flex items-end justify-between">
                                <span className="text-3xl font-bold text-slate-900">
                                    {boards.reduce((acc, b) => acc + (b.zones?.inZone?.length || 0) + (b.eligibles?.length || 0), 0)}
                                </span>
                                <Users className="text-indigo-200" size={24} />
                            </div>
                        </div>
                    </div>


                    {/* Main List */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                            <h2 className="font-semibold text-slate-800">Scheduled Boards</h2>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:border-indigo-300 transition-colors">
                                <Filter size={14} />
                                Filter Type
                            </button>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 w-1/3">Board Name</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3">Convening Date</th>
                                    <th className="px-6 py-3 text-center">Eligibility</th>
                                    <th className="px-6 py-3 text-right">Status</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {boards.map((board, idx) => (
                                    <tr key={board.id} className="group hover:bg-indigo-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    board.type === 'Statutory' ? "bg-indigo-500" :
                                                        board.type === 'Administrative' ? "bg-emerald-500" : "bg-slate-400"
                                                )} />
                                                <span className="font-semibold text-slate-900">{board.name}</span>
                                                {board.type === 'Custom' && <span className="px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded border border-slate-200">CUSTOM</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{board.type}</td>
                                        <td className="px-6 py-4 font-mono text-slate-600">{board.conveningDate}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium group-hover:bg-white group-hover:shadow-sm transition-all">
                                                <Users size={12} />
                                                {(board.zones?.inZone?.length || 0) + (board.eligibles?.length || 0)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {idx === 0 ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                    Upcoming
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-xs">Scheduled</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                                                <ChevronRight size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {boards.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                            <Calendar className="mx-auto w-8 h-8 mb-2 opacity-20" />
                                            No boards found for {year}.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
