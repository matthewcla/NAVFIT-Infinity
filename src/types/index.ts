export interface ReportingSenior {
    id: string;
    name: string;
    rank: string;
    title: string;
    command: string;
    currentRSCA: Record<string, number>; // Rank -> RSCA
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
    periodEndDate: string;
    type: 'Periodic' | 'Detachment' | 'Promotion' | 'Special';
    traitGrades: Record<string, number>; // Block 33-39
    traitAverage: number;
    promotionRecommendation: 'EP' | 'MP' | 'P' | 'Prog' | 'SP' | 'NOB';
    summaryGroupAvg?: number;
    rscaAtTime?: number;
    narrative?: string;
}

export interface SummaryGroup {
    id: string;
    name: string; // e.g., "O-3 SWO"
    reports: Report[];
    periodEndDate: string;
}
