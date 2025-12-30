import { useMemo } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { generateSummaryGroups } from '@/features/strategy/logic/reportGenerator';

export function useSummaryGroups(startYear: number = 2023) {
    const { roster, rsConfig, projections } = useNavfitStore();

    const summaryGroups = useMemo(() => {
        return generateSummaryGroups(roster, rsConfig, startYear, projections);
    }, [roster, rsConfig, startYear, projections]);

    return summaryGroups;
}
