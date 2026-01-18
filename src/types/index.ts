import type { PolicyViolation } from '@/domain/policy/types';

export type PayGrade = 'O-1' | 'O-2' | 'O-3' | 'O-4' | 'O-5' | 'O-6' | 'O-7' | 'O-8' | 'O-9' | 'O-10' | 'W-1' | 'W-2' | 'W-3' | 'W-4' | 'W-5' | 'E-1' | 'E-2' | 'E-3' | 'E-4' | 'E-5' | 'E-6' | 'E-7' | 'E-8' | 'E-9';

export type Designator = string; // Broaden type definition to allow enlisted rates and diverse designators

export type TraitGradeSet = { [key: string]: number };

export interface Member {
    id: string;
    name: string; // Combined for display
    rank: string;
    payGrade?: string;
    designator?: string; // Officer
    rating?: string; // Enlisted
    milestone?: string; // DIVO, DH, LPO, etc.
    prd?: string; // Projected Rotation Date YYYY-MM-DD
    eda?: string; // Estimated Date of Arrival
    edd?: string; // Estimated Date of Departure
    status: 'Onboard' | 'Gain' | 'Loss';
    gainDate?: string;
    dateReported?: string;
    lastTrait?: number | null;
    target?: number | null;
    lastExam?: number;
    history?: Report[];
    promotionStatus?: 'REGULAR' | 'FROCKED' | 'SELECTED' | 'SPOT';
    nextPlan?: number | string | null; // Planned next report MTA
    timeInGrade?: number; // Years in current paygrade
}

export interface Report {
    id: string;
    memberId: string;
    memberRank: string;
    memberName: string;
    type: 'Periodic' | 'Detachment' | 'Promotion' | 'Special';
    periodEndDate: string; // YYYY-MM-DD
    traitAverage: number; // 2.00 - 5.00
    promotionRecommendation: 'NOB' | 'SP' | 'Prog' | 'P' | 'MP' | 'EP';
    rscaAtTime?: number; // Snapshot of RSCA when report was signed

    // Auto-Plan Logic
    isProjected?: boolean;
    isDraft?: boolean;
    draftStatus?: 'Draft' | 'Review' | 'Submitted' | 'Planned' | 'Final';

    // Constraints (User Overrides)
    isLocked?: boolean; // If locked, optimization engine won't touch

    // Validation
    traitGrades?: TraitGradeSet;
    violations?: PolicyViolation[];

    // Detailed Report Flags
    isAdverse?: boolean;
    notObservedReport?: boolean;
    detachmentOfIndividual?: boolean;
    reportingSeniorName?: string;
    reportsRemaining?: number;

    // Type of Report (Blocks 17-19)
    isRegular?: boolean;
    isConcurrent?: boolean;
    isOpsCdr?: boolean;

    // Additional Administrative Fields
    physicalReadiness?: string; // Block 20
    billetSubcategory?: string; // Block 21
    reportingSeniorGrade?: string; // Block 23
    reportingSeniorDesig?: string; // Block 24
    reportingSeniorTitle?: string; // Block 25
    reportingSeniorUic?: string; // Block 26
    reportingSeniorSsn?: string; // Block 27
    openingStatement?: string; // Block 43 opening

    // Administrative Data
    grade?: string; // Block 2
    designator?: string; // Block 3
    ssn?: string; // Block 4
    dutyStatus?: 'ACT' | 'TAR' | 'INACT' | 'AT/ADSW/265'; // Block 5
    uic?: string; // Block 6
    shipStation?: string; // Block 7
    promotionStatus?: string; // Block 8
    dateReported?: string; // Block 9
    occasion?: string; // Block 10-16
    periodStartDate?: string; // Block 14
    // ... Blocks 20-27 (Traits) ...
    primaryDuty?: string; // Block 29

    comments?: string; // Block 43
    narrative?: string; // Alternative to comments
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
    status?: 'Pending' | 'Accepted' | 'Rejected' | 'Planned' | 'Draft' | 'Submitted' | 'Review' | 'Final';
    hasManualOrder?: boolean; // True if user has manually reordered members via drag-and-drop

    // Metrics
    rsca?: number; // Current RSCA including this group
    eotRsca?: number; // Projected EOT RSCA including this group
    totalMembers?: number;

    // Constraints
    maxEP?: number;
    maxMP?: number;
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
}

// Timeline types for ManningWaterfall
export interface TimelineMonth {
    label: string;
    monthIndex: number;
    year: number;
    index: number;
}

export interface WaterfallMember extends Member {
    history: Report[];
    periodicReportId?: string;
    transferReportId?: string;
}

// Board types
export interface BoardZones {
    inZone: string[];
    aboveZone: string[];
    belowZone: string[];
}

export interface Board {
    id: string;
    name: string;
    conveneDate: string;
    conveningDate?: string; // Alias for conveneDate used in some places
    type: 'Promotion' | 'Selection' | 'Review' | 'Statutory' | 'Administrative' | 'Custom';
    status?: 'Scheduled' | 'In Progress' | 'Complete';
    zones?: BoardZones;
    eligibles?: string[];
}

export interface BoardSchedule {
    id: string;
    boardId: string;
    paygrade: string;
    designator?: string;
    recordsDueDate: string;
    year?: number;
    boards?: Board[];
}

// Reporting Senior types
export interface ReportingSenior {
    id: string;
    name: string;
    rank: string;
    title: string;
    uic?: string;
    ssn?: string;
    designator?: string;
}
