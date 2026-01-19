
import type { SummaryGroup } from '@/types';
import { StrategyGroupCard } from './StrategyGroupCard';
import { calculateImpact, getReportType } from '@/features/strategy/logic/cycleHelpers';
import { useNavfitStore } from '@/store/useNavfitStore';

interface CycleCardGridProps {
    cycles: SummaryGroup[];
    onSelect: (cycleId: string) => void;
    hoveredCycleId?: string | null;
    onCardHover?: (cycleId: string | null) => void;
}

export function CycleCardGrid({ cycles, onSelect, hoveredCycleId, onCardHover }: CycleCardGridProps) {
    const { summaryGroups } = useNavfitStore();

    if (cycles.length === 0) {
        return (
            <div className="p-8 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <p className="text-sm font-medium">No cycles found for this filter.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {cycles.map(group => {
                const rscaImpact = calculateImpact(group, summaryGroups);
                const memberCount = group.reports.length;
                const now = new Date();
                const endDate = new Date(group.periodEndDate);
                let status: 'Upcoming' | 'Active' | 'Overdue' | 'Complete' = 'Active';

                if (['Submitted', 'Final', 'Complete'].includes(group.status || '')) {
                    status = 'Complete';
                } else if (endDate < now) {
                    status = 'Overdue';
                }

                return (
                    <StrategyGroupCard
                        key={group.id}
                        title={group.name}
                        date={group.periodEndDate}
                        memberCount={memberCount}
                        status={status}
                        workflowStatus={group.status}
                        rscaImpact={rscaImpact}
                        promotionStatus={group.promotionStatus}
                        reportType={getReportType(group.name)}
                        onClick={() => onSelect(group.id)}
                        draggable={true}
                        isHovered={hoveredCycleId === group.id}
                        onMouseEnter={() => onCardHover && onCardHover(group.id)}
                        onMouseLeave={() => onCardHover && onCardHover(null)}
                    />
                );
            })}
        </div>
    );
}
