import { useState } from 'react';
import type { Report } from '../../types';
import { ArrowLeft, ChevronDown, ChevronUp, Save, FileOutput } from 'lucide-react';


interface ReportEditorProps {
    report: Report;
    onBack: () => void;
}

export function ReportEditor({ report, onBack }: ReportEditorProps) {
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
    const [formData, setFormData] = useState<Report>(report);

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            {/* Top Navigation Bar */}
            <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0 z-30">
                <div className="flex items-center gap-6">
                    <button
                        onClick={onBack}
                        className="text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to List
                    </button>
                    <div className="h-6 w-px bg-slate-200" />
                    <div>
                        <h1 className="font-bold text-slate-800 text-lg leading-tight">Fitness Report</h1>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {report.memberId}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md border border-slate-200 shadow-sm transition-all">
                        <Save className="w-4 h-4" />
                        Save Draft
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 shadow-sm transition-all">
                        <FileOutput className="w-4 h-4" />
                        Export PDF
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">

                    {/* Sticky Administrative Data Section */}
                    <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-6 z-20 ring-1 ring-slate-900/5">
                        {/* Header Row (Blocks 1-4) - Always Visible */}
                        <div className="p-6 bg-white">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                                    Member Identity
                                </h2>
                                <button
                                    onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    {isHeaderCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                {/* Block 1: Name */}
                                <div className="md:col-span-4 space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-700">
                                        1. Name <span className="text-slate-400 font-normal">(Last, First MI Suffix)</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow uppercase"
                                        value={formData.memberId}
                                        onChange={(e) => setFormData({ ...formData, memberId: e.target.value.toUpperCase() })}
                                        placeholder="Enter name..."
                                    />
                                </div>

                                {/* Block 2: Grade/Rate */}
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-700">
                                        2. Grade/Rate
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow uppercase"
                                        value={formData.grade || ''}
                                        onChange={(e) => setFormData({ ...formData, grade: e.target.value.toUpperCase() })}
                                        placeholder="e.g. LCDR"
                                    />
                                </div>

                                {/* Block 3: Desig */}
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-700">
                                        3. Desig
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow"
                                        value={formData.designator || ''}
                                        onChange={(e) => setFormData({ ...formData, designator: e.target.value })}
                                        placeholder="e.g. 1110"
                                    />
                                </div>

                                {/* Block 4: SSN */}
                                <div className="md:col-span-4 space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-700">
                                        4. SSN
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow"
                                        value={formData.ssn || ''}
                                        onChange={(e) => setFormData({ ...formData, ssn: e.target.value })}
                                        placeholder="***-**-****"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Collapsible Section */}
                        {!isHeaderCollapsed && (
                            <div className="bg-slate-50 border-t border-slate-200 px-6 py-6 transition-all">
                                {/* Row 2: Blocks 5-9 */}
                                <div className="flex flex-wrap gap-6 items-start justify-between">

                                    {/* Block 5: Duty Status */}
                                    <div className="space-y-1.5 flex-none">
                                        <label className="block text-sm font-medium text-slate-700">
                                            5. Duty Status
                                        </label>
                                        <div className="flex items-start gap-4 pt-1">
                                            {['ACT', 'TAR', 'INACT', 'AT/ADSW/265'].map((status) => {
                                                const value = status.split('/')[0];
                                                const isChecked = formData.dutyStatus === value || (status.includes('AT') && formData.dutyStatus === 'AT/ADSW/265');
                                                return (
                                                    <div key={status} className="flex flex-col items-start gap-1.5">
                                                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-tight">{status}</span>
                                                        <input
                                                            type="checkbox"
                                                            className="w-6 h-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors cursor-pointer"
                                                            checked={isChecked}
                                                            onChange={() => setFormData({ ...formData, dutyStatus: status.includes('AT') ? 'AT/ADSW/265' : value as any })}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Block 6: UIC */}
                                    <div className="w-[12%] space-y-1.5 flex-none">
                                        <label className="block text-sm font-medium text-slate-700">
                                            6. UIC
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={5}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-center uppercase font-mono tracking-wider"
                                            value={formData.uic || ''}
                                            onChange={(e) => setFormData({ ...formData, uic: e.target.value.toUpperCase() })}
                                            placeholder="55555"
                                        />
                                    </div>

                                    {/* Block 7: Ship/Station */}
                                    <div className="grow space-y-1.5 min-w-[200px]">
                                        <label className="block text-sm font-medium text-slate-700">
                                            7. Ship/Station
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase"
                                            value={formData.shipStation || ''}
                                            onChange={(e) => setFormData({ ...formData, shipStation: e.target.value.toUpperCase() })}
                                            placeholder="USS SHIPNAME"
                                        />
                                    </div>

                                    {/* Block 8: Promotion Status */}
                                    <div className="w-[15%] space-y-1.5 flex-none">
                                        <label className="block text-sm font-medium text-slate-700">
                                            8. Prom Status
                                        </label>
                                        <select
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                            value={formData.promotionStatus || ""}
                                            onChange={(e) => setFormData({ ...formData, promotionStatus: e.target.value })}
                                        >
                                            <option value="">Select...</option>
                                            <option value="REGULAR">Regular</option>
                                            <option value="FROCKED">Frocked</option>
                                            <option value="SELECTED">Selected</option>
                                            <option value="SPOT">Spot</option>
                                        </select>
                                    </div>

                                    {/* Block 9: Date Reported */}
                                    <div className="w-[15%] space-y-1.5 flex-none">
                                        <label className="block text-sm font-medium text-slate-700">
                                            9. Date Rpt
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                            value={formData.dateReported || ''}
                                            onChange={(e) => setFormData({ ...formData, dateReported: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Row 3: Occasion (10-13) and Period (14-15) */}
                                <div className="mt-4 flex flex-wrap gap-x-8 gap-y-4">

                                    {/* Group: Occasion for Report */}
                                    <div className="flex flex-col space-y-1.5">
                                        <h3 className="text-sm font-medium text-slate-700">
                                            Occasion for Report
                                        </h3>
                                        <div className="flex gap-6 items-end mt-auto">
                                            {/* Block 10: Periodic */}
                                            <div className="flex items-end gap-2">
                                                <div className="text-[10px] font-bold text-slate-500 uppercase leading-tight text-right">
                                                    <div className="block">10. Periodic</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="w-6 h-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors cursor-pointer"
                                                    checked={formData.type === 'Periodic'}
                                                    onChange={() => setFormData({ ...formData, type: 'Periodic', detachmentOfIndividual: undefined })}
                                                />
                                            </div>

                                            {/* Block 11: Detach of Individual */}
                                            <div className="flex items-end gap-2">
                                                <div className="text-[10px] font-bold text-slate-500 uppercase leading-tight text-right">
                                                    <div className="block">11. Detach of</div>
                                                    <div className="block">Individual</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="w-6 h-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors cursor-pointer"
                                                    checked={formData.type === 'Detachment' && formData.detachmentOfIndividual}
                                                    onChange={() => setFormData({ ...formData, type: 'Detachment', detachmentOfIndividual: true })}
                                                />
                                            </div>

                                            {/* Block 12: Detach of Reporting Senior */}
                                            <div className="flex items-end gap-2">
                                                <div className="text-[10px] font-bold text-slate-500 uppercase leading-tight text-right">
                                                    <div className="block">12. Detach of</div>
                                                    <div className="block">Reporting Senior</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="w-6 h-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors cursor-pointer"
                                                    checked={formData.type === 'Detachment' && !formData.detachmentOfIndividual}
                                                    onChange={() => setFormData({ ...formData, type: 'Detachment', detachmentOfIndividual: false })}
                                                />
                                            </div>

                                            {/* Block 13: Special */}
                                            <div className="flex items-end gap-2">
                                                <div className="text-[10px] font-bold text-slate-500 uppercase leading-tight text-right">
                                                    <div className="block">13. Special</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="w-6 h-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors cursor-pointer"
                                                    checked={formData.type === 'Special'}
                                                    onChange={() => setFormData({ ...formData, type: 'Special', detachmentOfIndividual: undefined })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Group: Period Covered */}
                                    <div className="flex flex-col space-y-1.5">
                                        <h3 className="text-sm font-medium text-slate-700">
                                            Period Covered
                                        </h3>
                                        <div className="flex items-end gap-6 mt-auto">
                                            {/* Block 14: From */}
                                            <div className="flex items-end gap-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2">14. From</label>
                                                <input
                                                    type="date"
                                                    className="w-32 px-2 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                    value={formData.periodStartDate || ''}
                                                    onChange={(e) => setFormData({ ...formData, periodStartDate: e.target.value })}
                                                />
                                            </div>

                                            {/* Block 15: To */}
                                            <div className="flex items-end gap-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2">15. To</label>
                                                <input
                                                    type="date"
                                                    className="w-32 px-2 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                    value={formData.periodEndDate || ''}
                                                    onChange={(e) => setFormData({ ...formData, periodEndDate: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Row 4: Blocks 16-21 */}
                                <div className="mt-4 flex flex-wrap gap-x-8 gap-y-4">

                                    {/* Block 16: Not Observed */}
                                    <div className="flex h-full gap-2 relative">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase leading-tight text-right self-start pt-1">
                                            <div className="block">16. Not Observed</div>
                                            <div className="block">Report</div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="w-6 h-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors cursor-pointer self-end mb-1"
                                            checked={formData.notObservedReport || false}
                                            onChange={() => setFormData({ ...formData, notObservedReport: true, isRegular: false, isConcurrent: false, isOpsCdr: false })}
                                        />
                                    </div>

                                    {/* Group: Type of Report (17-19) */}
                                    <div className="flex flex-col space-y-1.5">
                                        <h3 className="text-sm font-medium text-slate-700">
                                            Type of Report
                                        </h3>
                                        <div className="flex gap-6 items-end mt-auto">
                                            {/* Block 17: Regular */}
                                            <div className="flex items-center gap-2">
                                                <div className="text-[10px] font-bold text-slate-500 uppercase leading-tight text-right">
                                                    <div className="block">17. Regular</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="w-6 h-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors cursor-pointer"
                                                    checked={formData.isRegular || false}
                                                    onChange={() => setFormData({ ...formData, notObservedReport: false, isRegular: true, isConcurrent: false, isOpsCdr: false })}
                                                />
                                            </div>

                                            {/* Block 18: Concurrent */}
                                            <div className="flex items-center gap-2">
                                                <div className="text-[10px] font-bold text-slate-500 uppercase leading-tight text-right">
                                                    <div className="block">18. Concurrent</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="w-6 h-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors cursor-pointer"
                                                    checked={formData.isConcurrent || false}
                                                    onChange={() => setFormData({ ...formData, notObservedReport: false, isRegular: false, isConcurrent: true, isOpsCdr: false })}
                                                />
                                            </div>

                                            {/* Block 19: Ops Cdr */}
                                            <div className="flex items-center gap-2">
                                                <div className="text-[10px] font-bold text-slate-500 uppercase leading-tight text-right">
                                                    <div className="block">19. Ops Cdr</div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="w-6 h-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors cursor-pointer"
                                                    checked={formData.isOpsCdr || false}
                                                    onChange={() => setFormData({ ...formData, notObservedReport: false, isRegular: false, isConcurrent: false, isOpsCdr: true })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Block 20: Physical Readiness */}
                                    <div className="flex flex-col space-y-1.5">
                                        <label className="block text-sm font-medium text-slate-700">
                                            20. Physical Readiness
                                        </label>
                                        <input
                                            type="text"
                                            className="w-32 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase mt-auto"
                                            value={formData.physicalReadiness || ''}
                                            onChange={(e) => setFormData({ ...formData, physicalReadiness: e.target.value.toUpperCase() })}
                                            placeholder="PSEP"
                                        />
                                    </div>

                                    {/* Block 21: Billet Subcategory */}
                                    <div className="flex flex-col space-y-1.5 grow min-w-[150px]">
                                        <label className="block text-sm font-medium text-slate-700">
                                            21. Billet Subcategory
                                        </label>
                                        <select
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 mt-auto"
                                            value={formData.billetSubcategory || 'NA'}
                                            onChange={(e) => setFormData({ ...formData, billetSubcategory: e.target.value })}
                                        >
                                            <option value="NA">NA</option>
                                            <option value="CO AFLOAT">CO AFLOAT</option>
                                            <option value="CO ASHORE">CO ASHORE</option>
                                            <option value="INDIV AUG">INDIV AUG</option>
                                            <option value="RESAC1">RESAC1</option>
                                            <option value="RESAC6">RESAC6</option>
                                            <option value="APPROVED">APPROVED</option>
                                            <option value="SCREENED">SCREENED</option>
                                            <option value="BASIC">BASIC</option>
                                            <option value="OIC">OIC</option>
                                            <option value="SEA COMP">SEA COMP</option>
                                            <option value="CRF">CRF</option>
                                            <option value="CANVASSER">CANVASSER</option>
                                            <option value="RESIDENT">RESIDENT</option>
                                            <option value="INTERN">INTERN</option>
                                            <option value="INSTRUCTOR">INSTRUCTOR</option>
                                            <option value="STUDENT">STUDENT</option>
                                            {Array.from({ length: 20 }, (_, i) => (
                                                <option key={i} value={`SPECIAL${String(i + 1).padStart(2, '0')}`}>
                                                    {`SPECIAL${String(i + 1).padStart(2, '0')}`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Row 5: Reporting Senior (Blocks 22-27) */}
                                <div className="mt-6 flex flex-wrap gap-4 items-start justify-between">
                                    {/* Block 22: Reporting Senior Name */}
                                    <div className="w-[23%] space-y-1.5 flex-none">
                                        <label className="block text-sm font-medium text-slate-700">
                                            22. Reporting Senior <span className="text-slate-400 font-normal">(Last, FI MI)</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow uppercase"
                                            value={formData.reportingSeniorName || ''}
                                            onChange={(e) => setFormData({ ...formData, reportingSeniorName: e.target.value.toUpperCase() })}
                                            placeholder="LAST, FI MI"
                                        />
                                    </div>

                                    {/* Block 23: Grade */}
                                    <div className="w-[15%] space-y-1.5 flex-none">
                                        <label className="block text-sm font-medium text-slate-700">
                                            23. Grade
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow uppercase"
                                            value={formData.reportingSeniorGrade || ''}
                                            onChange={(e) => setFormData({ ...formData, reportingSeniorGrade: e.target.value.toUpperCase() })}
                                            placeholder="CAPT"
                                        />
                                    </div>

                                    {/* Block 24: Desig */}
                                    <div className="w-[8%] space-y-1.5 flex-none">
                                        <label className="block text-sm font-medium text-slate-700">
                                            24. Desig
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow uppercase"
                                            value={formData.reportingSeniorDesig || ''}
                                            onChange={(e) => setFormData({ ...formData, reportingSeniorDesig: e.target.value.toUpperCase() })}
                                            placeholder="1110"
                                        />
                                    </div>

                                    {/* Block 25: Title */}
                                    <div className="flex-1 space-y-1.5 min-w-[200px]">
                                        <label className="block text-sm font-medium text-slate-700">
                                            25. Title
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow uppercase"
                                            value={formData.reportingSeniorTitle || ''}
                                            onChange={(e) => setFormData({ ...formData, reportingSeniorTitle: e.target.value.toUpperCase() })}
                                            placeholder="COMMANDING OFFICER"
                                        />
                                    </div>

                                    {/* Block 26: UIC */}
                                    <div className="w-[8%] space-y-1.5 flex-none">
                                        <label className="block text-sm font-medium text-slate-700">
                                            26. UIC
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={5}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow uppercase font-mono tracking-wider"
                                            value={formData.reportingSeniorUic || ''}
                                            onChange={(e) => setFormData({ ...formData, reportingSeniorUic: e.target.value.toUpperCase() })}
                                            placeholder="55555"
                                        />
                                    </div>

                                    {/* Block 27: SSN */}
                                    <div className="w-[14%] space-y-1.5 flex-none">
                                        <label className="block text-sm font-medium text-slate-700">
                                            27. SSN
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow"
                                            value={formData.reportingSeniorSsn || ''}
                                            onChange={(e) => setFormData({ ...formData, reportingSeniorSsn: e.target.value })}
                                            placeholder="***-**-****"
                                        />
                                    </div>
                                </div>

                                <div className="mt-8 pt-8 border-t border-dashed border-slate-200 text-center">
                                    <p className="text-slate-400 text-sm">Blocks 16-29 will continue here...</p>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Placeholder for future sections to demonstrate scrolling */}
                    <div className="h-screen bg-slate-100/50 rounded-xl border border-dashed border-slate-300 flex items-center justify-center">
                        <span className="text-slate-400">Future Performance & Narrative Sections</span>
                    </div>

                </div>
            </div>
        </div>
    );
}
