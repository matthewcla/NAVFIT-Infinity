import { X, AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';

interface UnsavedChangesModalProps {
    isOpen: boolean;
    onApply: () => void;
    onDiscard: () => void;
    onCancel: () => void;
}

export function UnsavedChangesModal({
    isOpen,
    onApply,
    onDiscard,
    onCancel
}: UnsavedChangesModalProps) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Unsaved Changes</h2>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-slate-600">
                        You have unsaved changes to this record. Would you like to apply them before leaving?
                    </p>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onDiscard}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 focus:outline-none transition-colors"
                    >
                        Discard Changes
                    </button>
                    <button
                        onClick={onApply}
                        className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                        Apply Changes
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
