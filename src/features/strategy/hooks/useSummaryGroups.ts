import { useMemo } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';

export function useSummaryGroups() {
    const { summaryGroups, deletedGroupIds, deletedReportIds } = useNavfitStore();

    const filteredGroups = useMemo(() => {
        return summaryGroups
            .filter(group => !deletedGroupIds.includes(group.id))
            .map(group => ({
                ...group,
                reports: group.reports.filter(report => !deletedReportIds.includes(report.id))
            }));
    }, [summaryGroups, deletedGroupIds, deletedReportIds]);

    return filteredGroups;
}
