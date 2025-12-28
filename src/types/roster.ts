export type PayGrade = 'O-1' | 'O-2' | 'O-3' | 'O-4' | 'O-5' | 'O-6' | 'O-7' | 'O-8' | 'O-9' | 'O-10' | 'W-1' | 'W-2' | 'W-3' | 'W-4' | 'W-5' | 'E-1' | 'E-2' | 'E-3' | 'E-4' | 'E-5' | 'E-6' | 'E-7' | 'E-8' | 'E-9';

export type Designator =
    | '1110' | '1120' | '1310' | '1320' // URL
    | '1200' | '1810' | '1830'          // RL
    | '3100'                            // SC - Staff Corps
    | '6130' | '6410';                  // LDO/CWO

export interface RosterMember {
    id: string;
    firstName: string;
    lastName: string;
    middleInitial?: string;
    rank: PayGrade;
    designator: Designator;
    // For Enlisted, would be rating. Keeping simple for Officers first.

    dateReported: string; // YYYY-MM-DD
    prd: string;          // Projected Rotation Date
    lastTrait?: number;
    target?: number;
}

export interface ReportingSeniorConfig {
    name: string;
    rank: PayGrade;
    title: string; // e.g., "CO", "XO"
    changeOfCommandDate: string; // YYYY-MM-DD - Triggers RS Detach Reports
}
