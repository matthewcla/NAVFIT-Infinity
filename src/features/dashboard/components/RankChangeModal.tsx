
import { createPortal } from 'react-dom';
import { AlertTriangle, X, Check } from 'lucide-react';

interface RankChangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    direction: 'up' | 'down';
    currentRank: number;
    newRank: number;
    memberName: string;
}

export function RankChangeModal({
    isOpen,
    onClose,
    onConfirm,

    currentRank,
    newRank,
    memberName
}: RankChangeModalProps) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-full shrink-0">
                        <AlertTriangle className="w-6 h-6" />
                    </div>

                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">
                            Rank Change Detected
                        </h3>

                        <p className="text-sm text-slate-600 leading-relaxed mb-4">
                            This change will move <strong>{memberName}</strong> from rank <span className="font-mono font-bold">#{currentRank}</span> to <span className="font-mono font-bold">#{newRank}</span>.
                            <br /><br />
                            Are you sure you want to proceed with this adjustment?
                        </p>

                        <div className="flex items-center justify-end gap-3 mt-6">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                Proceed
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
