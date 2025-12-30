import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { OpportunityRadarWidget } from '@/features/strategy/components/OpportunityRadarWidget';
import { QuickReportTuner } from '@/features/strategy/components/QuickReportTuner';
import { cn } from '@/lib/utils';

export function ContextRail() {
    const {
        selectedReportId,
        selectedMemberId,
        isContextRailOpen,
        toggleContextRail
    } = useNavfitStore();

    return (
        <div
            className={cn(
                "h-full border-l border-slate-200 bg-white transition-all duration-300 ease-in-out flex flex-col relative",
                !isContextRailOpen ? "w-[20px]" : "w-[320px]"
            )}
        >
            <button
                onClick={toggleContextRail}
                className="absolute -left-3 top-6 bg-white border border-slate-200 rounded-full p-1 shadow-sm hover:bg-slate-50 z-10"
            >
                {!isContextRailOpen ? (
                    <ChevronLeft size={14} className="text-slate-500" />
                ) : (
                    <ChevronRight size={14} className="text-slate-500" />
                )}
            </button>

            <div className={cn("flex-1 overflow-y-auto overflow-x-hidden", !isContextRailOpen && "invisible")}>
                <div className="p-4 space-y-4">
                    {/* Content Logic */}
                    {selectedReportId ? (
                        <QuickReportTuner />
                    ) : selectedMemberId ? (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div className="flex items-center space-x-2 mb-2">
                                <User className="text-slate-400" size={16} />
                                <h3 className="font-semibold text-slate-700">Member Profile</h3>
                            </div>
                            <p className="text-xs text-slate-500">Summary of performance and history.</p>
                            <div className="mt-4 h-32 bg-white rounded border border-slate-200 border-dashed flex items-center justify-center text-xs text-slate-400">
                                Profile Summary
                            </div>
                        </div>
                    ) : (
                        <OpportunityRadarWidget />
                    )}
                </div>
            </div>
        </div>
    );
}
