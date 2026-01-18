import { X, AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useScaleFactor } from '@/context/ScaleContext';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'neutral';
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'neutral'
}: ConfirmationModalProps) {
    const { scale } = useScaleFactor();

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-infinity-tooltip flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                width: `${100 / scale}%`,
                height: `${100 / scale}%`
            }}
        >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
                    <div className="flex items-center gap-3">
                        {variant === 'danger' && (
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                        )}
                        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-slate-600">{description}</p>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${variant === 'danger'
                            ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                            : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
