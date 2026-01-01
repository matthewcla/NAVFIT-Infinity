

interface StatusBadgeProps {
    status?: string;
    className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
    if (!status) return null;

    const base = "text-[10px] font-bold px-1.5 py-0.5 rounded border inline-block whitespace-nowrap";
    const combinedClass = `${base} ${className}`;

    switch (status) {
        case 'Drafting':
            return <span className={`${combinedClass} bg-slate-100 text-slate-500 border-slate-200`}>Drafting</span>;
        case 'Planning':
            return <span className={`${combinedClass} bg-blue-50 text-blue-600 border-blue-200`}>Planning</span>;
        case 'Review':
            return <span className={`${combinedClass} bg-amber-50 text-amber-600 border-amber-200`}>Review</span>;
        case 'Submitted':
            return <span className={`${combinedClass} bg-emerald-50 text-emerald-600 border-emerald-200`}>Submitted</span>;
        case 'Final':
            return <span className={`${combinedClass} bg-slate-100 text-slate-600 border-slate-200`}>Final</span>;
        case 'Rejected':
            return <span className={`${combinedClass} bg-red-50 text-red-600 border-red-200`}>Rejected</span>;
        default:
            return <span className={`${combinedClass} bg-slate-50 text-slate-400 border-slate-100`}>{status}</span>;
    }
}
