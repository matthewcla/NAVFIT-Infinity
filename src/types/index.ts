export type PayGrade = 'O-1' | 'O-2' | 'O-3' | 'O-4' | 'O-5' | 'O-6' | 'O-7' | 'O-8' | 'O-9' | 'O-10' | 'W-1' | 'W-2' | 'W-3' | 'W-4' | 'W-5' | 'E-1' | 'E-2' | 'E-3' | 'E-4' | 'E-5' | 'E-6' | 'E-7' | 'E-8' | 'E-9';

export type Designator =
    | '1110' | '1120' | '1310' | '1320' // URL
    | '1200' | '1810' | '1830'          // RL
    | '3100'                            // SC - Staff Corps
    | '6130' | '6410';                  // LDO/CWO

export interface TimelineMonth {
    label: string;
    monthIndex: number;
    year: number;
    index: number;
}

export interface WaterfallMember extends Member {
    periodicReportId?: string;
    transferReportId?: string;
}

export interface ReportingSenior {
    id: string;
    name: string;
    rank: string;
    title: string;
    command: string;
    currentRSCA: Partial<Record<PayGrade, number>>; // Rank -> RSCA
}

export interface Member {
    id: string;
    name: string; // Combined for display
    rank: string;
    designator?: string; // Officer
    rating?: string; // Enlisted
    milestone?: string; // DIVO, DH, LPO, etc.
    prd?: string; // Projected Rotation Date YYYY-MM-DD
    status: 'Onboard' | 'Gain' | 'Loss';
    gainDate?: string;
    lastTrait?: number | null;
    nextPlan?: number | 'NOB' | null;
    target?: number | null;
    history: Report[];
}

export interface Report {
    id: string;
    memberId: string;
    periodEndDate: string; // Block 15
    type: 'Periodic' | 'Detachment' | 'Promotion' | 'Special'; // Block 10-13 implied
    traitGrades: Record<string, number>; // Block 33-39
    traitAverage: number;
    promotionRecommendation: 'EP' | 'MP' | 'P' | 'Prog' | 'SP' | 'NOB'; // Block 42
    summaryGroupAvg?: number;
    rscaAtTime?: number;
    narrative?: string; // Block 43 (formerly implied, now explicit)
    openingStatement?: string; // Block 43 Opening Statement

    // New Fields for Reports Manager
    draftStatus?: 'Draft' | 'Review' | 'Submitted' | 'Final' | 'Projected';
    isAdverse?: boolean;
    boardId?: string; // Link to a Selection Board

    // Administrative Data
    grade?: string; // Block 2
    designator?: string; // Block 3
    ssn?: string; // Block 4
    dutyStatus?: 'ACT' | 'TAR' | 'INACT' | 'AT/ADSW/265'; // Block 5
    uic?: string; // Block 6
    shipStation?: string; // Block 7
    promotionStatus?: string; // Block 8
    dateReported?: string; // Block 9
    detachmentOfIndividual?: boolean; // Block 11
    periodStartDate?: string; // Block 14
    notObservedReport?: boolean; // Block 16
    isRegular?: boolean; // Block 17
    isConcurrent?: boolean; // Block 18
    isOpsCdr?: boolean; // Block 19
    physicalReadiness?: string; // Block 20
    billetSubcategory?: string; // Block 21
    reportingSeniorId?: string; // Block 22 (Link)

    // Reporting Senior Snapshot (Blocks 22-27)
    reportingSeniorName?: string;
    reportingSeniorGrade?: string;
    reportingSeniorDesig?: string;
    reportingSeniorTitle?: string;
    reportingSeniorUic?: string;
    reportingSeniorSsn?: string;

    // Duties & Command
    commandEmployment?: string; // Block 28
    primaryDuty?: string; // Block 29 (Primary)
    collateralDuties?: string; // Block 29 (Collateral)
    watchstandingDuties?: string; // Block 29 (Watchstanding)

    // Counseling
    counselingDate?: string; // Block 30
    counselorName?: string; // Block 31

    // Narrative Sections
    careerRecommendations?: string; // Block 40
    comments?: string; // Block 41/43 (Main narrative body)

    // Projected Data
    reportsRemaining?: number; // Calculated field: (PRD - PeriodEndDate) / 12 months (approx)
    isLocked?: boolean; // If true, auto-plan logic will not override traitAverage
}

export interface SummaryGroup {
    id: string;
    name: string; // e.g., "O-3 SWO Regular"
    paygrade?: string;
    designator?: string;
    competitiveGroupKey: string; // e.g. "O-3 1110" - Links Frocked/Selected back to pool
    promotionStatus?: 'REGULAR' | 'FROCKED' | 'SELECTED' | 'SPOT';
    reports: Report[];
    periodEndDate: string;
    status?: 'Pending' | 'Accepted' | 'Rejected' | 'Projected' | 'Planned' | 'Draft' | 'Submitted' | 'Review' | 'Final';
    dateFinalized?: string;
    dateAcceptedOrRejected?: string;
}

export interface Board {
    id: string;
    name: string;
    type: 'Statutory' | 'Administrative' | 'Screening' | 'Custom';
    conveningDate: string; // YYYY-MM-DD
    zones?: {
        aboveZone: string[]; // List of Member IDs
        inZone: string[];
        belowZone: string[];
    };
    eligibles?: string[]; // For non-zone boards, list of eligible Member IDs
}

export interface BoardSchedule {
    year: number;
    boards: Board[];
}

export interface RosterEntry {
    memberId: string;
    fullName: string;
    rank: string;
    designator: string;
    dateReported: string;
    prd: string;
    uic: string;
    // Extended admin data from feed
    gender?: string;
    activeDutyBaseDate?: string;
    payEntryBaseDate?: string;
    address?: string;
}
