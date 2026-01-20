import { useState } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { DistributionPanel } from './DistributionPanel';
import { MemberInspector } from './MemberInspector';
import { ChevronLeft } from 'lucide-react';

interface CycleWorkspaceProps {
    cycleId: string;
    onBack: () => void;
}

export function CycleWorkspace({ cycleId, onBack }: CycleWorkspaceProps) {
    const { summaryGroups, selectedMemberId, selectMember } = useNavfitStore();
    const [previewProjections, setPreviewProjections] = useState<Record<string, number>>({});

    // Find the specific cycle (SummaryGroup)
    const activeGroup = summaryGroups.find(g => g.id === cycleId);

    if (!activeGroup) {
        return (
            <div className="h-full flex items-center justify-center p-8 text-center bg-slate-50">
                <div className="max-w-md">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Cycle Not Found</h3>
                    <p className="text-slate-500 mb-4">The requested cycle could not be loaded.</p>
                    <button
                        onClick={onBack}
                        className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
                    >
                        Return to Group
                    </button>
                </div>
            </div>
        );
    }

    const handleCloseInspector = () => {
        selectMember(null);
        setPreviewProjections({});
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Context Header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-200 shrink-0">
                <button
                    onClick={onBack}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-baseline gap-3">
                    <h2 className="text-lg font-bold text-slate-800">{activeGroup.name}</h2>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">{activeGroup.status || 'Draft'}</span>
                </div>
            </div>

            {/* Workspace Content Row */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Distribution Panel - Main Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    <DistributionPanel
                        group={activeGroup}
                        previewProjections={previewProjections}
                    />
                </div>

                {/* Member Inspector - Slide-in Panel */}
                {selectedMemberId && (
                    <div className="shrink-0 h-full z-20 shadow-xl lg:static lg:z-auto absolute right-0 top-0 bottom-0">
                        <MemberInspector
                            memberId={selectedMemberId}
                            onClose={handleCloseInspector}
                            onPreviewMTA={(val) => setPreviewProjections({ [selectedMemberId]: val })}
                            initialMode="sidebar"
                        // Future: Add Navigation handlers here (Next/Prev)
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
