
// Competitive Category Definitions and Logic
// Based on BUPERS instructions and user requirements.

export type CompetitiveCategoryType =
    | 'URL'
    | 'RL'
    | 'IWL'
    | 'STAFF'
    | 'LDO_CWO_RESERVE'
    | 'LDO_ACTIVE'
    | 'CWO_ACTIVE'
    | 'UNKNOWN';

export interface CompetitiveCategoryResult {
    code: CompetitiveCategoryType;
    name: string; // The specific group name (e.g. "Unrestricted Line", "Staff")
    subCategory?: string; // e.g. "Medical Corps" for Staff, or "Surface" for LDO
}

// Helper to check if a designator matches a pattern with 'X' wildcards
// X acts as a wildcard for any digit (semantically "XX" means any two digits)
const matchesPattern = (designator: string, pattern: string): boolean => {
    if (!designator || !pattern) return false;
    // Normalize case for safety, though we standardize on Upper
    const d = designator.toUpperCase();
    const p = pattern.toUpperCase();

    if (d.length !== p.length) return false;

    for (let i = 0; i < d.length; i++) {
        // If pattern char is 'X' (wildcard), we skip check (implies matches any char, practically digit)
        if (p[i] === 'X') continue;
        if (p[i] !== d[i]) return false;
    }
    return true;
};

const matchesAnyPattern = (designator: string, patterns: string[]): string | undefined => {
    return patterns.find(p => matchesPattern(designator, p));
};

// --- Definitions ---
// All patterns standardized to uppercase "XX" wildcards

const PATTERNS_URL = ['11XX', '13XX', '19XX'];

// RL has specific named subgroups

const DEFINITIONS_RL = [
    '12XX', // HR (Note: this overlaps 123x, 128x. Order matters if we want specific sub-labels, but for Grouping RL, it's fine)
    '123X', // PMP
    '128X', // Recruiter
    '14XX', // ED
    '150X', // AED
    '151X', // AED (Eng)
    '152X', // AED (Maint)
    '154X', // Aviation Duty
    '165X', // PAO
    '166X', // Strat Sealift
    '168X', // Recruiter
    '17XX', // FAO
];

const DEFINITIONS_IWL = [
    '180X', '181X', '182X', '183X', '184X', '187X', '188X'
];

const DEFINITIONS_STAFF = [
    '210X', '220X', '230X', '250X', '270X', '290X', '310X', '410X', '510X'
];

// LDO/CWO Lists
const DEFINITIONS_RESERVE_LDO_CWO = [
    '61XX', '62XX', '63XX', '64XX', // Line
    '65XX', // Staff
    '7XXX' // All CWO
];

const DEFINITIONS_ACTIVE_LDO = [
    '61XX', // Surface
    '62XX', // Sub/Nuc
    '63XX', // Aviation
    '64XX', // Gen Line
    '653X', // CE
    '651X', // Supply
    '68XX'  // IW
];

const DEFINITIONS_ACTIVE_CWO = [
    '71XX', // Surface
    '72XX', // Sub/Nuc
    '740X', // Sub/Nuc specific? Prompt: "72xx / 740X"
    '73XX', // Aviation
    '74XX', // Gen Line / Staff (Overlaps 740X? yes. 740x is more specific)
    '75XX', // Staff?
    '78XX'  // IW
];

const isReserveDesignator = (designator: string): boolean => {
    // 4th digit 5 or 7 usually denotes Reserve (FTS/SELRES).
    // 4th digit 0 is Regular.
    // We assume 4 digit designators.
    if (designator.length < 4) return false;
    const lastChar = designator[3];
    return lastChar === '5' || lastChar === '7';
};

/**
 * Determines the Competitive Category for a given designator.
 */
export const getCompetitiveCategory = (designator: string): CompetitiveCategoryResult => {
    if (!designator) return { code: 'UNKNOWN', name: 'Unknown' };

    const desig = designator.trim();

    // 1. Check LDO/CWO (Starts with 6 or 7)
    if (desig.startsWith('6') || desig.startsWith('7')) {
        const isReserve = isReserveDesignator(desig);

        if (isReserve) {
            // Check against Reserve list
            // Note: 7xxx covers all CWOs in reserve list.
            if (matchesAnyPattern(desig, DEFINITIONS_RESERVE_LDO_CWO)) {
                return { code: 'LDO_CWO_RESERVE', name: 'Reserve Limited Duty Officer / Chief Warrant Officer' };
            }
        } else {
            // Active
            if (desig.startsWith('6')) {
                // Check Active LDO
                if (matchesAnyPattern(desig, DEFINITIONS_ACTIVE_LDO)) {
                    return { code: 'LDO_ACTIVE', name: 'Active Limited Duty Officer' };
                }
            } else {
                // Check Active CWO
                if (matchesAnyPattern(desig, DEFINITIONS_ACTIVE_CWO)) {
                    return { code: 'CWO_ACTIVE', name: 'Active Chief Warrant Officer' };
                }
            }
        }

        // Fallback for 6/7 that didn't match specific lists (shouldn't happen with broad patterns like 7xxx or 6xxx)
        // If it starts with 6/7 but didn't match specific Active patterns (e.g. 69xx?), default to Unknown or broad?
        // Let's assume standard buckets. If 6xxx and Active, map to Active LDO generic?
        if (desig.startsWith('6')) return { code: 'LDO_ACTIVE', name: 'Active Limited Duty Officer' };
        if (desig.startsWith('7')) return { code: 'CWO_ACTIVE', name: 'Active Chief Warrant Officer' };
    }

    // 2. URL
    if (matchesAnyPattern(desig, PATTERNS_URL)) {
        return { code: 'URL', name: 'Unrestricted Line' };
    }

    // 3. RL
    if (matchesAnyPattern(desig, DEFINITIONS_RL)) {
        return { code: 'RL', name: 'Restricted Line' };
    }

    // 4. IWL
    if (matchesAnyPattern(desig, DEFINITIONS_IWL)) {
        return { code: 'IWL', name: 'Information Warfare Line' };
    }

    // 5. Staff
    if (matchesAnyPattern(desig, DEFINITIONS_STAFF)) {
        return { code: 'STAFF', name: 'Staff' };
    }

    return { code: 'UNKNOWN', name: 'Unknown' };
};

/**
 * Returns a short label for the competitive group (e.g. "URL", "RL", "Staff", "LDO", "CWO").
 * Used for constructing the Summary Group display name.
 */
export const getCategoryLabel = (cat: CompetitiveCategoryResult): string => {
    switch (cat.code) {
        case 'URL': return 'URL Active';
        case 'RL': return 'RL Active';
        case 'IWL': return 'IWL Active';
        case 'STAFF': return 'Staff Active';
        case 'LDO_ACTIVE': return 'LDO Active';
        case 'LDO_CWO_RESERVE': return 'LDO/CWO Reserve';
        case 'CWO_ACTIVE': return 'CWO Active';
        default: return '';
    }
};
