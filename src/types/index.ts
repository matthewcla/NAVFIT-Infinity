import type { PolicyViolation } from '@/domain/policy/types';

export type PayGrade = 'O-1' | 'O-2' | 'O-3' | 'O-4' | 'O-5' | 'O-6' | 'O-7' | 'O-8' | 'O-9' | 'O-10' | 'W-1' | 'W-2' | 'W-3' | 'W-4' | 'W-5' | 'E-1' | 'E-2' | 'E-3' | 'E-4' | 'E-5' | 'E-6' | 'E-7' | 'E-8' | 'E-9';

export type Designator = string; // Broaden type definition to allow enlisted rates and diverse designators

export interface Member {
    id: string;
    name: string; // Combined for display
    rank: string;
    payGrade?: string;
    designator?: string; // Officer
    rating?: string; // Enlisted
    milestone?: string; // DIVO, DH, LPO, etc.
    prd?: string; // Projected Rotation Date YYYY-MM-DD
    status: 'Onboard' | 'Gain' | 'Loss';
    gainDate?: string;
    lastTrait?: number;
    target?: number;
    lastExam?: number;
    history?: Report[];
    promotionStatus?: 'REGULAR' | 'FROCKED' | 'SELECTED' | 'SPOT';
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
    draftStatus?: 'Draft' | 'Review' | 'Submitted' | 'Projected' | 'Final';

    // Constraints (User Overrides)
    isLocked?: boolean; // If locked, optimization engine won't touch

    // Validation
    traitGrades?: {
        [key: string]: number // 'Professional Expertise': 4.0
    };
    violations?: PolicyViolation[];

    // Detailed Report Flags
    isAdverse?: boolean;
    notObservedReport?: boolean;
    detachmentOfIndividual?: boolean;
    reportingSeniorName?: string;
    reportsRemaining?: number;

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

    // Metrics
    rsca?: number; // Current RSCA including this group
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
