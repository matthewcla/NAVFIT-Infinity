
import type { Report } from '@/types';

interface ReportCommentsTabProps {
    formData: Report;
    setFormData: (data: Report) => void;
    readOnly?: boolean;
}

export function ReportCommentsTab({ formData, setFormData, readOnly = false }: ReportCommentsTabProps) {
    return (
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ring-1 ring-slate-900/5">
            <div className="p-6">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">
                    43. Comments on Performance
                </h2>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-500 uppercase">
                            Opening Statement
                        </label>
                        <textarea
                            disabled={readOnly}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow resize-none"
                            rows={2}
                            value={formData.openingStatement || ''}
                            onChange={(e) => setFormData({ ...formData, openingStatement: e.target.value })}
                            placeholder="Opening statement..."
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-500 uppercase">
                            Narrative Body
                        </label>
                        <textarea
                            disabled={readOnly}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow min-h-[300px]"
                            value={formData.comments || ''}
                            onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                            placeholder="Enter performance comments..."
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
