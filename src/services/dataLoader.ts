import type { Member, SummaryGroup, Report } from '@/types/index';
import { getCompetitiveCategory, getCategoryLabel } from '../features/strategy/logic/competitiveGroupUtils';

// Interfaces matching public/member_details.json
export interface RawMemberDetail {
    id: string;
    prd?: string;
    eda?: string;
    edd?: string;
    gainDate?: string;
    detachDate?: string;
    milestoneTour?: string;
    linealNumber?: number;
    commissioningDate?: string;
    dateOfRank?: string;
    firstName: string;
    lastName: string;
    designator?: string;
    dateReported?: string;
    payGrade?: string;
    rank?: string;
    timeInGrade?: number;
}

export type RawMemberDetails = Record<string, RawMemberDetail>;

// Interfaces matching public/summary_groups_test_data.json
export interface RawReport {
    id: string;
    memberId: string;
    periodEndDate: string;
    traitAverage: number;
    promotionRecommendation: 'EP' | 'MP' | 'P' | 'Prog' | 'SP' | 'NOB';
    firstName?: string;
    lastName?: string;
    memberName?: string;
    memberRank?: string;
    rank?: string;
    designator?: string;
    draftStatus?: string;
    isLocked?: boolean;
    // Fields that might be missing in JSON but required in Domain Report
    type?: string;
    traitGrades?: Record<string, number>;
}

export interface RawRosterItem {
    id: string;
    history?: RawReport[];
}

export interface RawSummaryGroup {
    id: string;
    name: string;
    paygrade?: string;
    competitiveGroupKey: string;
    periodEndDate: string;
    status?: string;
    reports: RawReport[];
    designator?: string;
    promotionStatus?: 'REGULAR' | 'FROCKED' | 'SELECTED' | 'SPOT';
    dateFinalized?: string;
    dateAcceptedOrRejected?: string;
}

export interface RawRsConfig {
    name: string;
    rank: string;
    title: string;
    changeOfCommandDate: string;
    targetRsca?: number;
    totalReports?: number;
}

export interface RawSummaryGroupData {
    roster: RawRosterItem[];
    summaryGroups: RawSummaryGroup[];
    rsConfig?: RawRsConfig;
    version?: string;
    timestamp?: string;
}

export async function fetchInitialData(userId: string = 'user_1'): Promise<{ members: Member[]; summaryGroups: SummaryGroup[] }> {
    const filename = `/user_${userId.replace('user_', '')}.json`;

    // Fallback to user_1 if specific file doesn't exist is risky here as we are client side,
    // but typically we'd catch error. For now assume files exist if logic is correct.
    // However, if we fail, we could fallback to summary_groups_test_data.json if needed, but per plan we use user_X.json.

    // We always load the master member list
    const [memberDetailsRes, summaryGroupsRes] = await Promise.all([
        fetch('/member_details.json'),
        fetch(filename)
    ]);

    if (!memberDetailsRes.ok) {
        throw new Error('Failed to load member details');
    }

    if (!summaryGroupsRes.ok) {
        throw new Error(`Failed to load user data for ${userId}`);
    }

    const memberDetails: RawMemberDetails = await memberDetailsRes.json();
    const summaryGroupsData: RawSummaryGroupData = await summaryGroupsRes.json();

    // Map Members
    // Only map members that are in the user's roster to keep memory usage sane?
    // Or map all? The interface returns Member[].
    // Usually we only need the members relevant to the user.
    // The roster array in summaryGroupsData defines the user's scope.

    const rosterMap = new Map<string, RawRosterItem>();
    summaryGroupsData.roster.forEach(item => rosterMap.set(item.id, item));

    const members: Member[] = [];

    // We iterate the ROSTER from the user file, and look up details in the master file.
    summaryGroupsData.roster.forEach(rosterItem => {
        const detail = memberDetails[rosterItem.id];
        if (!detail) return; // Should not happen if data is consistent

        const history: Report[] = (rosterItem.history || []).map(rawReport => ({
            ...rawReport,
            type: (rawReport.type as any) || 'Periodic',
            traitGrades: rawReport.traitGrades || {},
            draftStatus: (rawReport.draftStatus as any) || 'Final',
            memberRank: detail.rank || '',
            memberName: `${detail.lastName}, ${detail.firstName}`
        }));

        members.push({
            id: detail.id,
            name: `${detail.lastName}, ${detail.firstName}`,
            rank: detail.rank || '',
            payGrade: detail.payGrade,
            designator: detail.designator,
            milestone: detail.milestoneTour,
            prd: detail.prd,
            eda: detail.eda,
            edd: detail.edd,
            status: 'Onboard', // Default, logic might need refinement if 'Gain' is a status
            gainDate: detail.gainDate,
            dateReported: detail.dateReported,
            history: history,
            timeInGrade: detail.timeInGrade
        });
    });

    // Map Summary Groups
    const summaryGroups: SummaryGroup[] = summaryGroupsData.summaryGroups.map(rawGroup => {
        const reports: Report[] = rawGroup.reports.map(rawReport => {
            const member = members.find(m => m.id === rawReport.memberId);
            return {
                ...rawReport,
                type: (rawReport.type as any) || 'Periodic',
                traitGrades: rawReport.traitGrades || {},
                draftStatus: (rawReport.draftStatus as any) || 'Draft',
                memberRank: member?.rank || rawReport.memberRank || rawReport.rank || '',
                memberName: member?.name || rawReport.memberName || (rawReport.firstName && rawReport.lastName ? `${rawReport.lastName}, ${rawReport.firstName}` : '') || '',
                // Ensure designator is available on report if not present
                designator: rawReport.designator || member?.designator
            };
        });

        // RECOVERY: If group name is generic (e.g., "O-3 Active") but should have specific category (e.g., "O-3 LDO Active")
        // we reconstruct it from the first member's designator.
        let groupName = rawGroup.name;
        let compKey = rawGroup.competitiveGroupKey;

        if (reports.length > 0) {
            const firstDesignator = reports[0].designator;
            const rank = rawGroup.paygrade || reports[0].memberRank;

            // Only attempt fix for Officers (O/W) if name doesn't seem to contain category
            // Simple check: if name is just "RANK Active" or "RANK" but designator suggests specific category
            const isOfficer = rank && (rank.startsWith('O') || rank.startsWith('W'));

            if (isOfficer && firstDesignator) {
                const cat = getCompetitiveCategory(firstDesignator);
                const nicelabel = getCategoryLabel(cat);

                // If we found a valid category label (e.g. "LDO Active", "URL Active")
                if (nicelabel) {
                    // Reconstruct likely correct base name
                    const expectedBase = `${rank} ${nicelabel}`;

                    // If current name is just "RANK Active" but we expect "RANK LDO Active"
                    // we update it.
                    // This fixes "O-3 Active" -> "O-3 LDO Active"
                    // Also handles "O-3 OFFICER Active" cleanup if it persists

                    const status = rawGroup.promotionStatus || 'REGULAR';
                    const suffix = status !== 'REGULAR' ? ` (${status})` : '';

                    // We overwrite the name to be correct
                    groupName = `${expectedBase}${suffix}`;
                    compKey = expectedBase;
                }
            }
        }

        return {
            ...rawGroup,
            name: groupName,
            competitiveGroupKey: compKey, // Ensure key matches name structure
            promotionStatus: rawGroup.promotionStatus || 'REGULAR',
            reports: reports,
            status: (rawGroup.status as any) || 'Draft'
        };
    });

    return { members, summaryGroups };
}
