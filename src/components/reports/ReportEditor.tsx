import { useState } from 'react';
import type { Report } from '../../types';
import { ArrowLeft, Save, FileOutput, Wand2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';
// import { generateOpeningStatement, formatWhiteSpace, scanForProhibitedContent, checkAdverseConditions } from '../../lib/reportLogic'; 

interface ReportEditorProps {
    report: Report;
    onBack: () => void;
}

export function ReportEditor({ report, onBack }: ReportEditorProps) {
    const [isAdminCollapsed, setIsAdminCollapsed] = useState(false);

    return (
        <div className="flex flex-col h-full bg-slate-100 relative">
            {/* Top Toolbar - Fixed */}
            <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between shrink-0 shadow-sm z-30 sticky top-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                    <div className="h-6 w-px bg-slate-200" />
                    <h2 className="font-bold text-slate-800 text-sm">
                        Fitness Report <span className="text-slate-400 font-normal">|</span> {report.memberId}
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    <span className={cn(
                        "text-[10px] uppercase font-bold px-2 py-0.5 rounded",
                        report.draftStatus === 'Final' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                    )}>
                        {report.draftStatus || 'Draft'}
                    </span>
                    <button className="p-1.5 text-slate-400 hover:text-indigo-600 rounded">
                        <Save className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-indigo-600 rounded">
                        <FileOutput className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto p-6 space-y-6">

                    {/* STICKY ADMIN DATA FRAME (Blocks 1-32) */}
                    <div className="sticky top-0 z-20 -mx-6 px-6 pt-2 pb-4 bg-slate-100/95 backdrop-blur-sm border-b border-slate-200/50 shadow-sm transition-all duration-300">
                        <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
                            {/* Header / Toggle */}
                            <div
                                className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => setIsAdminCollapsed(!isAdminCollapsed)}
                            >
                                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    Administrative Data (Blocks 1-32)
                                </h3>
                                <div className="flex items-center gap-2 text-slate-400">
                                    <span className="text-[10px] font-mono">{report.type} // {report.periodEndDate}</span>
                                    {isAdminCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                                </div>
                            </div>

                            {/* Dense Grid Form */}
                            {!isAdminCollapsed && (
                                <div className="p-3 grid grid-cols-12 gap-x-2 gap-y-2 bg-slate-50/30 text-xs">
                                    {/* --- ROW 1: MEMBER IDENTITY (Blocks 1-6, 20) --- */}
                                    <div className="col-span-3">
                                        <label className="form-label-compact">1. Name (Last, First MI Suffix)</label>
                                        <input type="text" className="form-input-compact font-bold" defaultValue={report.memberId} />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="form-label-compact">2. Grade</label>
                                        <input type="text" className="form-input-compact text-center" defaultValue={report.grade || "LCDR"} />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="form-label-compact">3. Desig</label>
                                        <input type="text" className="form-input-compact text-center" defaultValue={report.designator || "1110"} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="form-label-compact">4. SSN</label>
                                        <input type="text" className="form-input-compact text-center" defaultValue={report.ssn || "***-**-6789"} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="form-label-compact">5. Duty Status</label>
                                        <select className="form-input-compact py-0 h-[22px]" defaultValue={report.dutyStatus || "ACT"}>
                                            <option value="ACT">ACT</option>
                                            <option value="TAR">TAR</option>
                                            <option value="INACT">INACT</option>
                                            <option value="AT/ADSW/265">AT/ADSW...</option>
                                        </select>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="form-label-compact">6. UIC</label>
                                        <input type="text" className="form-input-compact text-center" defaultValue={report.uic || "55555"} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="form-label-compact">20. Physical Readiness</label>
                                        <input type="text" className="form-input-compact text-center" defaultValue={report.physicalReadiness} placeholder="P" />
                                    </div>

                                    {/* --- ROW 2: STATION & PERIOD (Blocks 7-15) --- */}
                                    <div className="col-span-3">
                                        <label className="form-label-compact">7. Ship/Station</label>
                                        <input type="text" className="form-input-compact" defaultValue={report.shipStation} placeholder="USS NEVERLAND" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="form-label-compact">8. Promotion Status</label>
                                        <select className="form-input-compact py-0 h-[22px]" defaultValue={report.promotionStatus || ""}>
                                            <option value="">-</option>
                                            <option value="REGULAR">Regular</option>
                                            <option value="FROCKED">Frocked</option>
                                            <option value="SELECTED">Selected</option>
                                            <option value="SPOT">Spot</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="form-label-compact">9. Date Reported</label>
                                        <input type="date" className="form-input-compact" defaultValue={report.dateReported} />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="form-label-compact">10-13. Occasion</label>
                                        <select className="form-input-compact py-0 h-[22px]" defaultValue={report.type}>
                                            <option>Periodic</option>
                                            <option>Detachment of Individual</option>
                                            <option>Detachment of Reporting Senior</option>
                                            <option>Special</option>
                                        </select>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="form-label-compact">14. From</label>
                                        <input type="date" className="form-input-compact" defaultValue={report.periodStartDate} />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="form-label-compact">15. To</label>
                                        <input type="date" className="form-input-compact" defaultValue={report.periodEndDate} />
                                    </div>

                                    {/* --- ROW 3: REPORT ATTRIBUTES (Blocks 16-19, 21) --- */}
                                    <div className="col-span-4 flex items-center justify-between px-1 border border-slate-200 rounded bg-white">
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input type="checkbox" className="w-3 h-3 text-indigo-600 rounded border-slate-300" defaultChecked={report.notObservedReport} />
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">16. NOB</span>
                                        </label>
                                        <div className="h-4 w-px bg-slate-200" />
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input type="checkbox" className="w-3 h-3 text-indigo-600 rounded border-slate-300" defaultChecked={report.isRegular} />
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">17. Reg</span>
                                        </label>
                                        <div className="h-4 w-px bg-slate-200" />
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input type="checkbox" className="w-3 h-3 text-indigo-600 rounded border-slate-300" defaultChecked={report.isConcurrent} />
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">18. Conc</span>
                                        </label>
                                        <div className="h-4 w-px bg-slate-200" />
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input type="checkbox" className="w-3 h-3 text-indigo-600 rounded border-slate-300" defaultChecked={report.isOpsCdr} />
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">19. Ops</span>
                                        </label>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="form-label-compact">21. Billet Subcat</label>
                                        <select className="form-input-compact py-0 h-[22px]" defaultValue={report.billetSubcategory || "NA"}>
                                            <option value="NA">N/A</option>
                                            <option value="BASIC">Basic</option>
                                            <option value="OPERATIONAL">Operational</option>
                                            <option value="JOINT">Joint</option>
                                        </select>
                                    </div>

                                    {/* --- ROW 4: REPORTING SENIOR (Blocks 22-27) --- */}
                                    <div className="col-span-12 grid grid-cols-12 gap-2 p-1.5 border border-indigo-100 rounded-md bg-indigo-50/20 mt-1">
                                        <div className="col-span-3">
                                            <label className="form-label-compact text-indigo-900/70">22. Reporting Senior (Last, FI MI)</label>
                                            <input type="text" className="form-input-compact border-indigo-200" defaultValue={report.reportingSeniorName} />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="form-label-compact text-indigo-900/70">23. Grd</label>
                                            <input type="text" className="form-input-compact border-indigo-200 text-center" defaultValue={report.reportingSeniorGrade} />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="form-label-compact text-indigo-900/70">24. Des</label>
                                            <input type="text" className="form-input-compact border-indigo-200 text-center" defaultValue={report.reportingSeniorDesig} />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="form-label-compact text-indigo-900/70">25. Title</label>
                                            <input type="text" className="form-input-compact border-indigo-200" defaultValue={report.reportingSeniorTitle} />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="form-label-compact text-indigo-900/70">26. UIC</label>
                                            <input type="text" className="form-input-compact border-indigo-200 text-center" defaultValue={report.reportingSeniorUic} />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="form-label-compact text-indigo-900/70">27. SSN</label>
                                            <input type="text" className="form-input-compact border-indigo-200 text-center" defaultValue={report.reportingSeniorSsn} />
                                        </div>
                                    </div>

                                    {/* --- ROW 5: COMMAND & DUTIES (Blocks 28-29) --- */}
                                    <div className="col-span-12 mt-1">
                                        <label className="form-label-compact">28. Command Employment and Achievements</label>
                                        <textarea
                                            className="form-input-compact h-12 uppercase resize-none leading-tight"
                                            placeholder="COMMAND EMPLOYMENT TEXT..."
                                            defaultValue={report.commandEmployment}
                                        />
                                    </div>

                                    {/* --- ROW 6: DUTIES BREAKDOWN (Block 29) --- */}
                                    <div className="col-span-6">
                                        <label className="form-label-compact">29. Primary Duties</label>
                                        <textarea
                                            className="form-input-compact h-16 uppercase resize-none leading-tight"
                                            placeholder="PRIMARY DUTIES..."
                                            defaultValue={report.primaryDuty}
                                        />
                                    </div>
                                    <div className="col-span-6 flex flex-col gap-2">
                                        <div>
                                            <label className="form-label-compact">Collateral Duties</label>
                                            <input
                                                type="text"
                                                className="form-input-compact uppercase"
                                                placeholder="COLLATERAL DUTIES..."
                                                defaultValue={report.collateralDuties}
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label-compact">Watchstanding Duties</label>
                                            <input
                                                type="text"
                                                className="form-input-compact uppercase"
                                                placeholder="WATCHSTANDING DUTIES..."
                                                defaultValue={report.watchstandingDuties}
                                            />
                                        </div>
                                    </div>

                                    {/* --- ROW 7: COUNSELING (Blocks 30-32) --- */}
                                    <div className="col-span-12 border-t border-slate-200 pt-1 mt-1 flex gap-2 items-center bg-slate-100/50 p-1 rounded">
                                        <div className="w-32">
                                            <label className="form-label-compact text-indigo-900">30. Date Counseled</label>
                                            <input type="date" className="form-input-compact bg-white" defaultValue={report.counselingDate} />
                                        </div>
                                        <div className="flex-1">
                                            <label className="form-label-compact text-indigo-900">31. Counselor</label>
                                            <input type="text" className="form-input-compact bg-white" placeholder="Last, First M" defaultValue={report.counselorName} />
                                        </div>
                                        <div className="w-48 flex items-center justify-end gap-2 pt-3">
                                            <input type="checkbox" className="w-3 h-3 text-indigo-600 rounded border-slate-300" id="sig" />
                                            <label htmlFor="sig" className="text-[10px] text-slate-600 font-medium cursor-pointer">32. Signature Verified</label>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SECTION 2: PERFORMANCE TRAITS (Blocks 33-39) */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Performance Traits (33-39)</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400">AVG:</span>
                                <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{report.traitAverage?.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="p-3 overflow-x-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2">
                                {[
                                    { id: '33', label: 'Prof. Expertise' },
                                    { id: '34', label: 'Equal Opp.' },
                                    { id: '35', label: 'Mil Bearing' },
                                    { id: '36', label: 'Teamwork' },
                                    { id: '37', label: 'Mission' },
                                    { id: '38', label: 'Leadership' },
                                    { id: '39', label: 'Tactical' },
                                ].map((trait) => (
                                    <div key={trait.id} className="border border-slate-200 rounded p-2 flex flex-col items-center bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition-colors">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">{trait.id} {trait.label}</span>
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map(val => (
                                                <button
                                                    key={val}
                                                    className={cn(
                                                        "w-6 h-6 rounded text-[10px] font-bold transition-all",
                                                        report.traitGrades[trait.id] === val
                                                            ? "bg-indigo-600 text-white shadow-sm scale-110"
                                                            : "bg-white border border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500"
                                                    )}
                                                >
                                                    {val}
                                                </button>
                                            ))}
                                            <button className={cn(
                                                "w-6 h-6 rounded text-[8px] font-bold uppercase transition-all ml-1",
                                                !report.traitGrades[trait.id] ? "bg-slate-200 text-slate-500" : "bg-white border border-slate-200 text-slate-300"
                                            )}>
                                                NOB
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: NARRATIVE (Blocks 40-43) - Expanded */}
                    <div className="space-y-4 pb-12">
                        {/* Block 40 */}
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                            <label className="form-label">40. Career Recommendations</label>
                            <input
                                type="text"
                                className="form-input font-mono uppercase text-sm"
                                placeholder="SCREEN FOR XO AFLOAT. RANK #2 OF 15 PEERS."
                                defaultValue={report.careerRecommendations}
                            />
                        </div>

                        {/* Block 41/43 */}
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex flex-col min-h-[500px]">
                            <div className="flex justify-between items-center mb-2">
                                <label className="form-label mb-0">41/43. Comments on Performance</label>

                                {/* Contextual Tools */}
                                <div className="flex gap-2">
                                    <button className="tool-btn bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                                        <Wand2 className="w-3 h-3 mr-1" />
                                        Generate Opening
                                    </button>
                                    <button className="tool-btn hover:bg-slate-100 text-slate-600">
                                        Format White Space
                                    </button>
                                </div>
                            </div>

                            <textarea
                                className="flex-1 w-full p-4 border border-slate-200 rounded-md font-mono text-sm uppercase resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 leading-relaxed"
                                placeholder="Narrative text..."
                                defaultValue={report.narrative}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .form-label-compact {
                    @apply block text-[9px] font-bold text-slate-400 mb-0.5 uppercase tracking-tight;
                }
                .form-input-compact {
                    @apply w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs shadow-sm placeholder-slate-300
                    focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                    disabled:bg-slate-50 disabled:text-slate-400;
                }
                .form-label {
                    @apply block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wide;
                }
                .form-input {
                    @apply w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm
                    focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500;
                }
                .tool-btn {
                    @apply px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors flex items-center shadow-sm border border-transparent;
                }
            `}</style>
        </div>
    );
}
