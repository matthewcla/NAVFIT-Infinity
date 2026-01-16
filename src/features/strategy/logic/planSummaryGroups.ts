/**
 * Plan Summary Groups Module
 * 
 * Generates planned summary groups for:
 * 1. Periodic Reports - Standard evaluation cycles based on paygrade schedule
 * 2. Detachment of Individual - Member transfer/PRD-based reports
 * 3. Detachment of Reporting Senior - End-of-tour reports when RS departs
 * 
 * All planned groups have status "Planned" and include EOT RSCA projections.
 */

import type { SummaryGroup, Report } from '@/types';
import type { RosterMember, ReportingSeniorConfig } from '@/types/roster';
import { PERIODIC_SCHEDULE } from '@/lib/constants';
import { getCompetitiveCategory, getCategoryLabel } from './competitiveGroupUtils';
import { calculateEotRsca, getCompetitiveGroupStats } from './rsca';

// ============================================================================
// Types
// ============================================================================

export interface PlannedGroupResult {
    group: SummaryGroup;
    eotRsca: number;
    memberProjections: Record<string, number>;
}

interface CompGroupKey {
    paygrade: string;
    designator: string;
    promotionStatus: 'REGULAR' | 'FROCKED' | 'SELECTED' | 'SPOT';
    label: string;
    categoryCode: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Groups with periodEndDate beyond this threshold get status "Planned" */
const PLANNED_THRESHOLD_MONTHS = 3;

// ============================================================================
// Helper Functions
// ============================================================================

const formatISODate = (year: number, monthIndex: number, day: number): string => {
    const mm = String(monthIndex + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
};

export const getCompetitiveGroup = (member: RosterMember): CompGroupKey => {
    const { rank, payGrade, designator, promotionStatus = 'REGULAR' } = member;
    // Sanitize displayRank to remove 'OFFICER' garbage if present
    const displayRank = (payGrade || rank).replace(/\s+OFFICER/i, '').trim();
    const isOfficer = payGrade ? (payGrade.startsWith('O') || payGrade.startsWith('W')) : false;

    let categoryCode = '';

    if (isOfficer && designator) {
        const cat = getCompetitiveCategory(designator);
        categoryCode = cat.code;
    }

    // Match the format used by summaryGroupGenerator.ts:
    // Officers: "${rank} ${categoryLabel}" (e.g., "O-3 URL Active")
    // Enlisted: "${rank} ${component}" (e.g., "E-6 Active" or "E-6 Reserve")
    const enlistedSuffix = member.component || 'Active';
    let labelBase: string = isOfficer ? displayRank : `${displayRank} ${enlistedSuffix}`;

    if (isOfficer && designator) {
        // Use getCategoryLabel to resolve standard label (e.g. "URL Active")
        const cat = getCompetitiveCategory(designator);
        const catLabel = getCategoryLabel(cat);
        labelBase = `${displayRank} ${catLabel}`;
    }

    const label = `${labelBase} ${promotionStatus !== 'REGULAR' ? `(${promotionStatus})` : ''}`.trim();

    return {
        paygrade: (payGrade || rank) as any, // Cast to any/PayGrade to satisfy type check
        designator: designator,
        promotionStatus: promotionStatus as 'REGULAR' | 'FROCKED' | 'SELECTED' | 'SPOT',
        label: label,
        categoryCode: categoryCode
    };
};

const calculateStartValue = (
    member: RosterMember,
    reportType: 'Periodic' | 'Detachment' | 'Transfer'
): number => {
    let baseline = 3.40;
    if (['O-5', 'O-6', 'W-5', 'E-9'].includes(member.rank)) baseline = 4.00;
    else if (['O-4', 'W-4', 'E-8'].includes(member.rank)) baseline = 3.80;
    else if (['O-3', 'W-3', 'E-7'].includes(member.rank)) baseline = 3.60;

    if (member.lastTrait && member.lastTrait > 0) {
        baseline = Math.max(baseline, member.lastTrait);
        if (baseline < 4.80) baseline += 0.05;
    }

    // Transfer Boost for detachment reports
    if (reportType === 'Detachment' || reportType === 'Transfer') {
        baseline += 0.10;
    }

    return Math.min(5.00, Math.round(baseline * 100) / 100);
};

const groupExistsInStore = (
    existingGroups: SummaryGroup[],
    competitiveGroupKey: string,
    periodEndDate: string
): boolean => {
    return existingGroups.some(g =>
        g.competitiveGroupKey === competitiveGroupKey &&
        g.periodEndDate === periodEndDate
    );
};

const isPlannedThreshold = (periodEndDate: string): boolean => {
    const today = new Date();
    const endDate = new Date(periodEndDate);
    const monthsDiff = (endDate.getFullYear() - today.getFullYear()) * 12 +
        (endDate.getMonth() - today.getMonth());
    return monthsDiff > PLANNED_THRESHOLD_MONTHS;
};

const createPlannedReport = (
    member: RosterMember,
    periodEndDate: string,
    reportType: 'Periodic' | 'Detachment',
    rsConfig: ReportingSeniorConfig,
    isDetachmentOfIndividual: boolean = false
): Report => {
    const mta = calculateStartValue(member, reportType === 'Detachment' ? 'Detachment' : 'Periodic');
    const prdDate = new Date(member.prd);
    const reportDate = new Date(periodEndDate);
    const reportsRemaining = Math.max(0, prdDate.getFullYear() - reportDate.getFullYear());

    return {
        id: `r-planned-${member.id}-${reportType.toLowerCase()}-${periodEndDate}`,
        memberId: member.id,
        memberRank: member.rank,
        memberName: `${member.lastName}, ${member.firstName} ${member.middleInitial || ''}`.trim(),
        periodEndDate: periodEndDate,
        type: reportType,
        traitAverage: mta,
        promotionRecommendation: mta > 0 ? 'P' : 'NOB',
        draftStatus: 'Planned',
        isProjected: true,
        traitGrades: {},
        isAdverse: false,
        notObservedReport: false,
        detachmentOfIndividual: isDetachmentOfIndividual,
        grade: member.rank,
        designator: member.designator,
        promotionStatus: member.promotionStatus,
        reportingSeniorName: rsConfig.name,
        reportsRemaining: reportsRemaining,
    };
};

// ============================================================================
// Planning Functions
// ============================================================================

/**
 * Plans periodic report summary groups for future cycles.
 * Uses PERIODIC_SCHEDULE to determine cycle months per paygrade.
 */
export function planPeriodicGroups(
    roster: RosterMember[],
    rsConfig: ReportingSeniorConfig,
    existingGroups: SummaryGroup[]
): PlannedGroupResult[] {
    const results: PlannedGroupResult[] = [];
    const groupsMap = new Map<string, SummaryGroup>();
    const rsEndDate = new Date(rsConfig.changeOfCommandDate);
    const today = new Date();

    const ensureGroup = (key: CompGroupKey, endDate: string): SummaryGroup => {
        const idParts = [
            key.paygrade,
            key.categoryCode || key.designator || 'NODESIG',
            key.promotionStatus,
            endDate
        ].join('|');

        const id = `sg-planned-periodic-${idParts.replace(/[\s|]+/g, '-')}`;

        if (!groupsMap.has(id)) {
            groupsMap.set(id, {
                id,
                name: key.label,
                periodEndDate: endDate,
                status: 'Planned',
                reports: [],
                paygrade: key.paygrade,
                designator: key.designator,
                competitiveGroupKey: key.label,
                promotionStatus: key.promotionStatus
            });
        }
        return groupsMap.get(id)!;
    };

    roster.forEach(member => {
        const groupKey = getCompetitiveGroup(member);
        const memberPRD = new Date(member.prd);
        const periodicMonth = PERIODIC_SCHEDULE[member.rank as string];

        if (!periodicMonth) return;

        let currentYear = today.getFullYear();
        const endYear = rsEndDate.getFullYear();

        while (currentYear <= endYear + 1) {
            const pMonthIndex = periodicMonth - 1;
            const pDate = new Date(currentYear, pMonthIndex + 1, 0); // Last day of month
            const memberRepDate = new Date(member.dateReported);

            // Constraints: future, before RS leaves, before member leaves, member has reported
            if (pDate > today &&
                pDate <= rsEndDate &&
                pDate <= memberPRD &&
                pDate >= memberRepDate &&
                isPlannedThreshold(formatISODate(currentYear, pMonthIndex, pDate.getDate()))) {

                const pDateStr = formatISODate(currentYear, pMonthIndex, pDate.getDate());

                // Check if group already exists in store
                if (!groupExistsInStore(existingGroups, groupKey.label, pDateStr)) {
                    const group = ensureGroup(groupKey, pDateStr);

                    if (!group.reports.some(r => r.memberId === member.id)) {
                        const report = createPlannedReport(member, pDateStr, 'Periodic', rsConfig);
                        group.reports.push(report);
                    }
                }
            }
            currentYear++;
        }
    });

    // Calculate EOT RSCA for each group
    for (const group of groupsMap.values()) {
        if (group.reports.length === 0) continue;

        const stats = getCompetitiveGroupStats(existingGroups, group.paygrade || '', undefined, ['Final']);
        const eotResult = calculateEotRsca(
            roster.map(m => ({ id: m.id, rank: m.rank, prd: m.prd, lastTrait: m.lastTrait ?? undefined })),
            stats.average,
            stats.count,
            rsConfig.changeOfCommandDate,
            group.paygrade || ''
        );

        results.push({
            group: { ...group, eotRsca: eotResult.eotRsca },
            eotRsca: eotResult.eotRsca,
            memberProjections: eotResult.memberProjections
        });
    }

    return results;
}

/**
 * Plans detachment of individual summary groups for members leaving before RS.
 */
export function planDetachmentOfIndividualGroups(
    roster: RosterMember[],
    rsConfig: ReportingSeniorConfig,
    existingGroups: SummaryGroup[]
): PlannedGroupResult[] {
    const results: PlannedGroupResult[] = [];
    const rsEndDate = new Date(rsConfig.changeOfCommandDate);
    const today = new Date();

    roster.forEach(member => {
        const memberPRD = new Date(member.prd);
        const memberRepDate = new Date(member.dateReported);

        // Member leaves before RS, is in the future, and beyond planned threshold
        if (memberPRD < rsEndDate &&
            memberPRD > today &&
            memberPRD > memberRepDate &&
            isPlannedThreshold(member.prd)) {

            const groupKey = getCompetitiveGroup(member);
            const prdStr = member.prd;

            // Check if already exists  
            if (!groupExistsInStore(existingGroups, groupKey.label, prdStr)) {
                const group: SummaryGroup = {
                    id: `sg-planned-doi-${member.id}-${memberPRD.getFullYear()}`,
                    name: groupKey.label,
                    periodEndDate: prdStr,
                    status: 'Planned',
                    reports: [createPlannedReport(member, prdStr, 'Detachment', rsConfig, true)],
                    paygrade: groupKey.paygrade,
                    designator: groupKey.designator,
                    competitiveGroupKey: groupKey.label,
                    promotionStatus: groupKey.promotionStatus
                };

                const stats = getCompetitiveGroupStats(existingGroups, groupKey.paygrade, undefined, ['Final']);
                const eotResult = calculateEotRsca(
                    roster.map(m => ({ id: m.id, rank: m.rank, prd: m.prd, lastTrait: m.lastTrait ?? undefined })),
                    stats.average,
                    stats.count,
                    rsConfig.changeOfCommandDate,
                    groupKey.paygrade
                );

                results.push({
                    group: { ...group, eotRsca: eotResult.eotRsca },
                    eotRsca: eotResult.eotRsca,
                    memberProjections: eotResult.memberProjections
                });
            }
        }
    });

    return results;
}

/**
 * Plans detachment of reporting senior summary groups for RS departure.
 */
export function planDetachmentOfReportingSeniorGroups(
    roster: RosterMember[],
    rsConfig: ReportingSeniorConfig,
    existingGroups: SummaryGroup[]
): PlannedGroupResult[] {
    const results: PlannedGroupResult[] = [];
    const groupsMap = new Map<string, SummaryGroup>();
    const rsEndDate = new Date(rsConfig.changeOfCommandDate);
    const rsDateStr = rsConfig.changeOfCommandDate;
    const today = new Date();

    // Only plan if RS detachment is in the future and beyond threshold
    if (rsEndDate <= today || !isPlannedThreshold(rsDateStr)) {
        return results;
    }

    roster.forEach(member => {
        const memberPRD = new Date(member.prd);
        const memberRepDate = new Date(member.dateReported);

        // Member will still be onboard when RS leaves
        if (memberPRD >= rsEndDate && memberRepDate < rsEndDate) {
            const groupKey = getCompetitiveGroup(member);

            // Check if already exists
            if (!groupExistsInStore(existingGroups, groupKey.label, rsDateStr)) {
                const idParts = [
                    groupKey.paygrade,
                    groupKey.categoryCode || groupKey.designator || 'NODESIG',
                    groupKey.promotionStatus,
                    rsDateStr
                ].join('|');

                const id = `sg-planned-dors-${idParts.replace(/[\s|]+/g, '-')}`;

                if (!groupsMap.has(id)) {
                    groupsMap.set(id, {
                        id,
                        name: groupKey.label,
                        periodEndDate: rsDateStr,
                        status: 'Planned',
                        reports: [],
                        paygrade: groupKey.paygrade,
                        designator: groupKey.designator,
                        competitiveGroupKey: groupKey.label,
                        promotionStatus: groupKey.promotionStatus
                    });
                }

                const group = groupsMap.get(id)!;
                if (!group.reports.some(r => r.memberId === member.id)) {
                    const report = createPlannedReport(member, rsDateStr, 'Detachment', rsConfig);
                    group.reports.push(report);
                }
            }
        }
    });

    // Calculate EOT RSCA for each group
    for (const group of groupsMap.values()) {
        if (group.reports.length === 0) continue;

        const stats = getCompetitiveGroupStats(existingGroups, group.paygrade || '', undefined, ['Final']);
        const eotResult = calculateEotRsca(
            roster.map(m => ({ id: m.id, rank: m.rank, prd: m.prd, lastTrait: m.lastTrait ?? undefined })),
            stats.average,
            stats.count,
            rsConfig.changeOfCommandDate,
            group.paygrade || ''
        );

        results.push({
            group: { ...group, eotRsca: eotResult.eotRsca },
            eotRsca: eotResult.eotRsca,
            memberProjections: eotResult.memberProjections
        });
    }

    return results;
}

// ============================================================================
// Sorting Helper
// ============================================================================

const sortReportsByMasterRank = (reports: Report[], masterRankList: string[] | undefined) => {
    if (!masterRankList || masterRankList.length === 0) return;
    reports.sort((a, b) => {
        const indexA = masterRankList.indexOf(a.memberId);
        const indexB = masterRankList.indexOf(b.memberId);

        // Members in the master list come first, sorted by their order
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;

        // Members not in the master list come after
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;

        // Tie-breaker for members not in master list (e.g. by name)
        return a.memberName.localeCompare(b.memberName);
    });
};

/**
 * Main orchestrator - plans all summary groups.
 * Automatically checks for existing groups to avoid duplicates.
 */
export function planAllSummaryGroups(
    roster: RosterMember[],
    rsConfig: ReportingSeniorConfig,
    existingGroups: SummaryGroup[],
    masterRankMap?: Record<string, string[]>
): PlannedGroupResult[] {
    const periodicGroups = planPeriodicGroups(roster, rsConfig, existingGroups);
    const doiGroups = planDetachmentOfIndividualGroups(roster, rsConfig, existingGroups);
    const dorsGroups = planDetachmentOfReportingSeniorGroups(roster, rsConfig, existingGroups);

    const allResults = [...periodicGroups, ...doiGroups, ...dorsGroups];

    // Apply Master Rank Sort to all generated groups
    if (masterRankMap) {
        allResults.forEach(res => {
            const key = res.group.competitiveGroupKey; // e.g., "O-3 URL Active"
            const masterList = masterRankMap[key];
            if (masterList) {
                sortReportsByMasterRank(res.group.reports, masterList);

                // Optional: Re-distribute planned MTAs based on this new rank order
                // For now, we trust the sort. The "Plan" visualization uses the list order.
            }
        });
    }

    // Sort by periodEndDate
    allResults.sort((a, b) => a.group.periodEndDate.localeCompare(b.group.periodEndDate));

    return allResults;
}
