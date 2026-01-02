import { useMemo } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { generateSummaryGroups } from '@/features/strategy/logic/reportGenerator';

export function useSummaryGroups(startYear: number = 2023) {
    const { roster, rsConfig, projections, deletedGroupIds, deletedReportIds } = useNavfitStore();

    const summaryGroups = useMemo(() => {
        const generated = generateSummaryGroups(roster, rsConfig, startYear, projections);

        return generated
            .filter(group => !deletedGroupIds.includes(group.id))
            .map(group => ({
                ...group,
                reports: group.reports.filter(report => !deletedReportIds.includes(report.id))
            }));
    }, [roster, rsConfig, startYear, projections, deletedGroupIds, deletedReportIds]);

    return summaryGroups;
}
