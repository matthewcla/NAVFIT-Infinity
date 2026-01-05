import type { Member, SummaryGroup, Report } from '@/types/index';

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

export async function fetchInitialData(): Promise<{ members: Member[]; summaryGroups: SummaryGroup[] }> {
    const [memberDetailsRes, summaryGroupsRes] = await Promise.all([
        fetch('/member_details.json'),
        fetch('/summary_groups_test_data.json')
    ]);

    if (!memberDetailsRes.ok || !summaryGroupsRes.ok) {
        throw new Error('Failed to load initial data');
    }

    const memberDetails: RawMemberDetails = await memberDetailsRes.json();
    const summaryGroupsData: RawSummaryGroupData = await summaryGroupsRes.json();

    // Map Members
    const rosterMap = new Map<string, RawRosterItem>();
    summaryGroupsData.roster.forEach(item => rosterMap.set(item.id, item));

    const members: Member[] = Object.values(memberDetails).map(detail => {
        const rosterItem = rosterMap.get(detail.id);
        const history: Report[] = (rosterItem?.history || []).map(rawReport => ({
            ...rawReport,
            type: (rawReport.type as any) || 'Periodic', // Default
            traitGrades: rawReport.traitGrades || {}, // Default empty
            draftStatus: (rawReport.draftStatus as any) || 'Final'
        }));

        return {
            id: detail.id,
            name: `${detail.lastName}, ${detail.firstName}`,
            rank: detail.rank || '',
            payGrade: detail.payGrade,
            designator: detail.designator,
            milestone: detail.milestoneTour,
            prd: detail.prd,
            status: 'Onboard', // Defaulting as these seem to be active
            gainDate: detail.gainDate,
            dateReported: detail.dateReported, // Extended field mapping
            history: history
        };
    });

    // Map Summary Groups
    const summaryGroups: SummaryGroup[] = summaryGroupsData.summaryGroups.map(rawGroup => {
        const reports: Report[] = rawGroup.reports.map(rawReport => ({
            ...rawReport,
            type: (rawReport.type as any) || 'Periodic',
            traitGrades: rawReport.traitGrades || {},
            draftStatus: (rawReport.draftStatus as any) || 'Draft'
        }));

        return {
            ...rawGroup,
            promotionStatus: rawGroup.promotionStatus || 'REGULAR',
            reports: reports,
            status: (rawGroup.status as any) || 'Draft'
        };
    });

    return { members, summaryGroups };
}
