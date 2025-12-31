import { cn } from '@/lib/utils';

interface RscaFlexibilityWidgetProps {
    score: number;
    max?: number;
    message?: string;
    className?: string;
}

export function RscaFlexibilityWidget({
    score,
    max = 100,
    message = "High flexibility. You can support additional EPs.",
    className
}: RscaFlexibilityWidgetProps) {
    const percentage = Math.min(100, Math.max(0, (score / max) * 100));

    return (
        <div className={cn("p-4 bg-white border border-slate-200 rounded-lg shadow-sm", className)}>
            <div className="flex justify-between items-start mb-2">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">RSCA Flexibility Score</div>
            </div>

            <div className="flex items-end space-x-2 mb-2">
                <span className="text-3xl font-bold text-green-600">{score}</span>
                <span className="text-xs text-slate-400 mb-1">/ {max}</span>
            </div>

            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                    className="bg-green-500 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>

            {message && (
                <p className="text-[11px] text-slate-500 mt-2 leading-tight">
                    {message}
                </p>
            )}
        </div>
    );
}
