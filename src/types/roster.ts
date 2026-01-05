import type { Report, PayGrade, Designator } from './index';
export type { PayGrade, Designator };



export interface RosterMember {
    id: string;
    firstName: string;
    lastName: string;
    middleInitial?: string;
    rank: string; // Title (e.g. Ensign)
    payGrade: PayGrade; // Code (e.g. O-1)
    designator: Designator;
    promotionStatus?: 'REGULAR' | 'FROCKED' | 'SELECTED' | 'SPOT'; // Defaults to REGULAR if undefined

    // Enlisted Rating (e.g. "BM", "IT"). Undefined for Officers or unrated/undesignated (E-1 to E-3).
    rating?: string;

    dateReported: string; // YYYY-MM-DD
    prd: string;          // Projected Rotation Date
    eda?: string;         // Estimated Date of Arrival
    edd?: string;         // Estimated Date of Departure
    milestoneTour?: string;

    lastTrait?: number;
    target?: number;

    // History for Ghost Baseline / Flight Path
    history?: Report[];

    // Auto-Plan Fields
    status?: 'Promotable' | 'Transferring' | 'Retiring' | string;
    reportsRemaining?: number;
    rankOrder?: number;
}

export interface ReportingSeniorConfig {
    name: string;
    rank: PayGrade;
    title: string; // e.g., "CO", "XO"
    changeOfCommandDate: string; // YYYY-MM-DD - Triggers RS Detach Reports
    targetRsca?: number; // Target RSCA for Auto-Plan calculations
    totalReports?: number; // Total reports by this RS (0 = New RS)
}
