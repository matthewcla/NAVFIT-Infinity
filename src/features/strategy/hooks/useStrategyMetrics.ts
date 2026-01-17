import { useMemo } from 'react';
import { useNavfitStore } from '@/store/useNavfitStore';
import { getCompetitiveCategory, getCategoryLabel } from '@/features/strategy/logic/competitiveGroupUtils';
import type { SummaryGroup } from '@/types';
import { differenceInDays, parseISO } from 'date-fns';

export interface CompGroupMetric {
    id: string; // e.g., "O-3 URL Active"
    label: string;
    memberCount: number;
    gains: number;
    losses: number;
    targetRsca: number;
    projectedRsca: number;
    rscaDelta: number; // Projected - Target
    nextReportDue?: string;
}

export interface StrategyTask {
    id: string;
    title: string;
    description: string;
    priority: 'High' | 'Medium' | 'Low';
    type: 'Review' | 'Draft' | 'Violation' | 'Adherence';
    groupId: string;
    date?: string;
}

export function useStrategyMetrics() {
    const { roster, summaryGroups, rsConfig } = useNavfitStore();

    const metrics = useMemo(() => {
        const statsMap = new Map<string, CompGroupMetric>();
        const taskList: StrategyTask[] = [];

        // 1. Group Roster Members by Competitive Group (Paygrade + Category)
        roster.forEach(member => {
            const cat = getCompetitiveCategory(member.designator || '');
            const catLabel = getCategoryLabel(cat);
            if (catLabel === 'Unknown' || !member.payGrade) return;

            const key = `${member.payGrade} ${catLabel}`; // "O-3 URL Active"

            if (!statsMap.has(key)) {
                statsMap.set(key, {
                    id: key,
                    label: key,
                    memberCount: 0,
                    gains: 0,
                    losses: 0,
                    targetRsca: rsConfig.targetRsca || 3.60, // Default if missing
                    projectedRsca: 0,
                    rscaDelta: 0,
                });
            }

            const stats = statsMap.get(key)!;
            stats.memberCount++;

            // Gains/Losses Logic
            // Gain: Status is Gain OR Gain Date in future?
            // For now, relying on 'status' field which is usually derived from dates.
            if (member.status === 'Gain') stats.gains++;
            if (member.status === 'Loss') stats.losses++;

            // Also check dates if status is generic 'Onboard' but dates indicate movement?
            // Assuming status is source of truth for now.
        });

        // 2. Aggregate Summary Group Data (RSCA & Tasks)
        // We need to map Summary Groups to the same keys.
        // Summary Groups have `paygrade` and `designator`.

        // Group Summary Groups by our Key
        const groupsByKey = new Map<string, SummaryGroup[]>();

        summaryGroups.forEach(group => {
            if (!group.paygrade) return;
            const designator = group.designator || ''; // Some groups might capture multiple designators?
            // If designator is missing, maybe look at competitiveGroupKey?
            // Assuming designator is present on the group for now.

            const cat = getCompetitiveCategory(designator);
            const catLabel = getCategoryLabel(cat);
            const key = `${group.paygrade} ${catLabel}`;

            if (!groupsByKey.has(key)) groupsByKey.set(key, []);
            groupsByKey.get(key)!.push(group);

            // Ensure stats entry exists (e.g. if no members but has groups)
            if (!statsMap.has(key)) {
                statsMap.set(key, {
                    id: key,
                    label: key,
                    memberCount: 0,
                    gains: 0,
                    losses: 0,
                    targetRsca: rsConfig.targetRsca || 3.60,
                    projectedRsca: 0,
                    rscaDelta: 0,
                });
            }

            // --- TASK GENERATION ---
            const daysUntilDue = group.periodEndDate ? differenceInDays(parseISO(group.periodEndDate), new Date()) : 999;

            // Priority 1: Review/Submitted
            if (group.status === 'Review' || group.status === 'Submitted') {
                taskList.push({
                    id: `review-${group.id}`,
                    title: `Review Required: ${group.name}`,
                    description: `${group.reports.length} reports awaiting signature.`,
                    priority: 'High',
                    type: 'Review',
                    groupId: group.id,
                    date: group.periodEndDate
                });
            }

            // Priority 2: Drafts Due Soon (< 30 days)
            if (group.status === 'Draft' && daysUntilDue < 30 && daysUntilDue >= 0) {
                taskList.push({
                    id: `draft-due-${group.id}`,
                    title: `Upcoming Deadline: ${group.name}`,
                    description: `Due in ${daysUntilDue} days.`,
                    priority: daysUntilDue < 14 ? 'High' : 'Medium',
                    type: 'Draft',
                    groupId: group.id,
                    date: group.periodEndDate
                });
            }

            // Priority 3: Violations
            const violationCount = group.reports.reduce((acc, r) => acc + (r.violations?.length || 0), 0);
            if (violationCount > 0) {
                taskList.push({
                    id: `violations-${group.id}`,
                    title: `Policy Violations: ${group.name}`,
                    description: `${violationCount} violations detected.`,
                    priority: 'High',
                    type: 'Violation',
                    groupId: group.id
                });
            }
        });

        // 3. Calculate RSCA Adherence per Group
        // Find the "Latest" projected EOT RSCA for each key.
        groupsByKey.forEach((groups, key) => {
            const stats = statsMap.get(key);
            if (!stats) return;

            // Sort groups by date descending to find the latest projection
            // Use `eotRsca` if available.
            const sortedGroups = [...groups].sort((a, b) => new Date(b.periodEndDate).getTime() - new Date(a.periodEndDate).getTime());

            // Find first group with eotRsca
            const latestGroup = sortedGroups.find(g => g.eotRsca !== undefined && g.eotRsca > 0);

            if (latestGroup && latestGroup.eotRsca) {
                stats.projectedRsca = latestGroup.eotRsca;
                stats.rscaDelta = parseFloat((stats.projectedRsca - stats.targetRsca).toFixed(2));
                stats.nextReportDue = sortedGroups[sortedGroups.length - 1].periodEndDate; // Earliest upcoming? Or latest? "Next Report Due" usually implies earliest future.

                // Refine Next Due
                const futureGroups = sortedGroups.filter(g => new Date(g.periodEndDate) >= new Date()).sort((a, b) => new Date(a.periodEndDate).getTime() - new Date(b.periodEndDate).getTime());
                if (futureGroups.length > 0) {
                    stats.nextReportDue = futureGroups[0].periodEndDate;
                }
            }
        });

        // Priority 4: RSCA Adherence Tasks
        statsMap.forEach(stats => {
            if (stats.rscaDelta > 0.10) { // Tolerance?
                 taskList.push({
                    id: `rsca-${stats.id}`,
                    title: `RSCA Alert: ${stats.label}`,
                    description: `Projected ${stats.projectedRsca.toFixed(2)} exceeds target ${stats.targetRsca.toFixed(2)}.`,
                    priority: 'Medium',
                    type: 'Adherence',
                    groupId: groupsByKey.get(stats.id)?.[0]?.id || '' // Link to latest or list?
                });
            }
        });

        // Sort Tasks
        const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
        taskList.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return {
            compGroups: Array.from(statsMap.values()).sort((a, b) => a.id.localeCompare(b.id)),
            taskList
        };

    }, [roster, summaryGroups, rsConfig]);

    return metrics;
}
