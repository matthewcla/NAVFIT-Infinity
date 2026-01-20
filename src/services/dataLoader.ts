import type { Member, SummaryGroup, Report } from '@/types/index';
import { getCompetitiveCategory, getCategoryLabel } from '../features/strategy/logic/competitiveGroupUtils';
import { assignRecommendationsByRank } from '../features/strategy/logic/recommendation';

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
            firstName: detail.firstName,
            lastName: detail.lastName,
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

        // RECOVERY & NORMALIZATION: Standardize group names and keys
        // This fixes legacy mock data artifacts (e.g. "E-4 COMP") and ensures Officers have correct Category labels
        let groupName = rawGroup.name;
        let compKey = rawGroup.competitiveGroupKey;

        if (reports.length > 0) {
            const firstDesignator = reports[0].designator;
            const rank = rawGroup.paygrade || reports[0].memberRank;

            if (rank) {
                // Enlisted Rate to Paygrade Mapping
                const RATE_TO_PAYGRADE: Record<string, string> = {
                    'SR': 'E-1', 'AA': 'E-1', 'AR': 'E-1', 'FR': 'E-1', 'CR': 'E-1',
                    'SA': 'E-2', 'DA': 'E-2', 'FA': 'E-2', // Generic E-2s
                    'SN': 'E-3', 'AN': 'E-3', 'FN': 'E-3', 'CN': 'E-3',
                    'PO3': 'E-4',
                    'PO2': 'E-5',
                    'PO1': 'E-6',
                    'CPO': 'E-7',
                    'MCPO': 'E-9', 'MC': 'E-9',
                    'SCPO': 'E-8', 'SC': 'E-8'
                };

                const OFFICER_RANK_TO_PAYGRADE: Record<string, string> = {
                    'ENS': 'O-1',
                    'LTJG': 'O-2',
                    'LT': 'O-3',
                    'LCDR': 'O-4',
                    'CDR': 'O-5',
                    'CAPT': 'O-6',
                    'RDML': 'O-7',
                    'RADM': 'O-8',
                    'VADM': 'O-9',
                    'ADM': 'O-10',
                    'CWO2': 'W-2', 'CWO3': 'W-3', 'CWO4': 'W-4', 'CWO5': 'W-5'
                };

                const normalizedOfficerPaygrade = OFFICER_RANK_TO_PAYGRADE[rank.toUpperCase()];
                const isOfficerRank = !!normalizedOfficerPaygrade;
                const isOfficer = rank.startsWith('O') || rank.startsWith('W') || isOfficerRank;

                // Enhanced Enlisted Detection & Normalization
                // We map known rates to their Paygrade to ensure "E-4 Active" format instead of "PO3 Active"
                const normalizedRank = RATE_TO_PAYGRADE[rank.toUpperCase()];
                const isRate = !!normalizedRank;
                // Strict check: It's enlisted if it matches E-X pattern OR it's a known Rate.
                // Avoid "ENS" triggering startsWith('E').
                const isEnlisted = (rank.startsWith('E') && !isOfficer) || isRate;

                const status = rawGroup.promotionStatus || 'REGULAR';
                const suffix = status !== 'REGULAR' ? ` (${status})` : '';

                if (isOfficer && firstDesignator) {
                    // For Officers/Warrants: Use designator to determine Competitive Category (URL, RL, Staff, LDO, CWO)
                    const cat = getCompetitiveCategory(firstDesignator);
                    const nicelabel = getCategoryLabel(cat);

                    const finalRank = normalizedOfficerPaygrade || rank;

                    if (nicelabel) {
                        const expectedBase = `${finalRank} ${nicelabel}`;
                        groupName = `${expectedBase}${suffix}`;
                        compKey = expectedBase;
                    }
                } else if (isEnlisted) {
                    // For Enlisted: Normalize to "[Paygrade] Active" (e.g. "E-4 Active")
                    // If we have a mapped paygrade (from PO3->E-4), use it.
                    // If the rank itself is already E-4, use it.
                    const paygradeToken = normalizedRank || rank;

                    const expectedBase = `${paygradeToken} Active`;
                    groupName = `${expectedBase}${suffix}`;
                    compKey = expectedBase;
                } else if (rawGroup.competitiveGroupKey?.endsWith(' COMP')) {
                    // Catch-all fallthrough
                    const expectedBase = rawGroup.competitiveGroupKey.replace(' COMP', ' Active');
                    groupName = `${expectedBase}${suffix}`;
                    compKey = expectedBase;
                }
            }
        }

        // --- AUTO-RANK FOR DEMO ---
        // Automatically assign Promotion Recommendations based on Trait Average (Merit Order)
        // to prevent "Unranked Members" in Command Feed for the demo.

        let rankedReports = reports;
        const initialGroupState: SummaryGroup = {
            id: rawGroup.id,
            name: groupName,
            competitiveGroupKey: compKey,
            promotionStatus: rawGroup.promotionStatus || 'REGULAR',
            reports: reports,
            status: (rawGroup.status as any) || 'Draft',
            paygrade: rawGroup.paygrade,
            designator: rawGroup.designator,
            periodEndDate: rawGroup.periodEndDate
        };

        if (reports.length > 0) {
            // Sort by Trait Average Descending (Merit)
            const sortedReports = [...reports].sort((a, b) => b.traitAverage - a.traitAverage);
            // Assign Recommendations
            rankedReports = assignRecommendationsByRank(sortedReports, initialGroupState);
        }

        return {
            ...initialGroupState,
            reports: rankedReports
        };
    });

    return { members, summaryGroups };
}
