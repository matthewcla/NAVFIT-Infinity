

interface PromotionBadgeProps {
    recommendation: string; // 'SP', 'PR', 'P', 'MP', 'EP', 'NOB', etc.
    size?: 'xs' | 'sm' | 'md';
    className?: string;
}

export function PromotionBadge({ recommendation, size = 'md', className = '' }: PromotionBadgeProps) {
    const getStyle = (rec: string) => {
        const normalized = rec.toUpperCase();
        switch (normalized) {
            case 'SP':
                return 'bg-red-100 text-red-700 border-red-200';
            case 'PR': // Prog
            case 'PROG':
                return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'P':
                return 'bg-slate-100 text-slate-700 border-slate-200';
            case 'MP':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'EP':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            default:
                return 'bg-gray-100 text-gray-500 border-gray-200';
        }
    };

    const baseClasses = "inline-flex items-center justify-center font-bold rounded border leading-none tracking-wide";

    let sizeClasses = "px-2 py-0.5 text-xs";
    if (size === 'xs') sizeClasses = "px-1 py-0 text-[9px]";
    else if (size === 'sm') sizeClasses = "px-1.5 py-0.5 text-[10px]";

    return (
        <span className={`${baseClasses} ${sizeClasses} ${getStyle(recommendation)} ${className}`}>
            {recommendation}
        </span>
    );
}
