import { useMemo } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { useSummaryGroups } from './useSummaryGroups';
import { getCompetitiveGroup } from '../logic/planSummaryGroups'; // Reusing this helper
import type { SummaryGroup } from '@/types';

export interface DashboardAlert {
    id: string;
    type: 'Operational' | 'Administrative';
    severity: 'High' | 'Medium' | 'Low';
    title: string;
    description: string;
    actionLabel: string;
    targetMode: 'planner' | 'cycles';
    targetId: string; // Group Key (Planner) or Group ID (Cycles)
    meta?: {
        count?: number;
        unrankedIds?: string[];
    };
}

export function useStrategyNotifications() {
    const { roster, competitiveGroupRankings } = useNavfitStore();
    const summaryGroups = useSummaryGroups();

    const alerts = useMemo(() => {
        const results: DashboardAlert[] = [];

        // 1. Operational Alerts (Competitive Groups)
        // Group roster by Competitive Group Key
        const rosterByGroup: Record<string, string[]> = {};
        roster.forEach(m => {
            const key = getCompetitiveGroup(m).label;
            if (!rosterByGroup[key]) rosterByGroup[key] = [];
            rosterByGroup[key].push(m.id);
        });

        // Check for Missing/Unranked Members
        Object.entries(rosterByGroup).forEach(([groupKey, memberIds]) => {
            const rankedIds = competitiveGroupRankings[groupKey] || [];
            const unranked = memberIds.filter(id => !rankedIds.includes(id));

            if (rankedIds.length === 0) {
                // No Plan Exists
                results.push({
                    id: `op-missing-${groupKey}`,
                    type: 'Operational',
                    severity: 'High',
                    title: `${groupKey} Plan`,
                    description: 'No master rank order established. Setup required.',
                    actionLabel: 'Establish Plan',
                    targetMode: 'planner',
                    targetId: groupKey,
                    meta: { count: memberIds.length }
                });
            } else if (unranked.length > 0) {
                // Partial Plan / New Gains
                results.push({
                    id: `op-update-${groupKey}`,
                    type: 'Operational',
                    severity: 'Medium',
                    title: `${groupKey} Plan`,
                    description: `${unranked.length} new member${unranked.length > 1 ? 's' : ''} added. Update ranking.`,
                    actionLabel: 'Update Rank',
                    targetMode: 'planner',
                    targetId: groupKey,
                    meta: { count: unranked.length, unrankedIds: unranked }
                });
            }
        });

        // 2. Administrative Alerts (Summary Groups)
        // Filter for Active/Upcoming
        const activeGroups = summaryGroups.filter(g =>
            ['Draft', 'Review', 'Planning', 'Drafting'].includes(g.status || '') ||
            (g.status === 'Planned' && new Date(g.periodEndDate) > new Date() && new Date(g.periodEndDate).getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000) // Within 90 days
        );

        activeGroups.forEach(g => {
            let severity: 'High' | 'Medium' | 'Low' = 'Low';
            let description = `Due ${new Date(g.periodEndDate).toLocaleDateString()}`;

            if (g.status === 'Review') {
                severity = 'High';
                description = 'Ready for signature review.';
            } else if (g.status === 'Draft' || g.status === 'Drafting') {
                severity = 'Medium';
                description = 'Drafting in progress.';
            }

            results.push({
                id: `admin-${g.id}`,
                type: 'Administrative',
                severity,
                title: g.name,
                description,
                actionLabel: g.status === 'Planned' ? 'Start Cycle' : 'Manage Cycle',
                targetMode: 'cycles',
                targetId: g.id,
                meta: { count: g.reports.length }
            });
        });

        // Sort: High Severity first, then Operational
        return results.sort((a, b) => {
            const severityMap = { High: 3, Medium: 2, Low: 1 };
            if (severityMap[b.severity] !== severityMap[a.severity]) {
                return severityMap[b.severity] - severityMap[a.severity];
            }
            // Operational first (as requested: "If they have not set... it must be the focus")
            if (a.type !== b.type) return a.type === 'Operational' ? -1 : 1;
            return 0;
        });

    }, [roster, competitiveGroupRankings, summaryGroups]);

    return alerts;
}
