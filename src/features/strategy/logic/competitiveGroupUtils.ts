
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

// Helper to check if a designator matches a pattern with 'x' wildcards
const matchesPattern = (designator: string, pattern: string): boolean => {
    if (designator.length !== pattern.length) return false;
    const d = designator.toUpperCase();
    const p = pattern.toUpperCase();
    for (let i = 0; i < d.length; i++) {
        if (p[i] !== 'X' && p[i] !== d[i]) {
            return false;
        }
    }
    return true;
};

const matchesAnyPattern = (designator: string, patterns: string[]): string | undefined => {
    return patterns.find(p => matchesPattern(designator, p));
};

// --- Definitions ---

const PATTERNS_URL = ['11xx', '13xx', '19xx'];

// RL has specific named subgroups
const PATTERNS_RL = [
    { pattern: '120x', name: 'Special Duty (Human Resources)' }, // 12xx in prompt, but usually HR is 1200. Prompt says "12xx". Let's use 12xx if it covers all.
    // Wait, prompt says: "Special Duty (Human Resources): 12xx".
    // "Special Duty (Permanent Military Professor): 123X".
    // If I use 12xx for HR, it overlaps 123X.
    // I should check specific patterns first?
    // Or just check if it matches the broad bucket.
    // The prompt groups them all under "Competitive Group: Restricted Line".
    // So for the *Category* bucket, I just need to know it's RL.
    // The specific sub-name might be nice but the Competitive Group Name is "Restricted Line".
    // I will return the Category Name.
    // The prompt asks to "Map member designator codes to competitive category buckets".
    // And "Ensure competitive group context includes competitive category codes".
    // I will define the lists as provided.
];

const DEFINITIONS_RL = [
    '12xx', // HR (Note: this overlaps 123x, 128x. Order matters if we want specific sub-labels, but for Grouping RL, it's fine)
    '123X', // PMP
    '128x', // Recruiter
    '14xx', // ED
    '150x', // AED
    '151x', // AED (Eng)
    '152x', // AED (Maint)
    '154x', // Aviation Duty
    '165x', // PAO
    '166x', // Strat Sealift
    '168x', // Recruiter
    '17xx', // FAO
];

const DEFINITIONS_IWL = [
    '180x', '181x', '182x', '183x', '184x', '187x', '188x'
];

const DEFINITIONS_STAFF = [
    '210x', '220x', '230x', '250x', '270x', '290x', '310x', '410x', '510x'
];

// LDO/CWO Lists
const DEFINITIONS_RESERVE_LDO_CWO = [
    '61xx', '62xx', '63xx', '64xx', // Line
    '65xx', // Staff
    '7xxx' // All CWO
];

const DEFINITIONS_ACTIVE_LDO = [
    '61xx', // Surface
    '62xx', // Sub/Nuc
    '63xx', // Aviation
    '64xx', // Gen Line
    '653X', // CE
    '651x', // Supply
    '68xx'  // IW
];

const DEFINITIONS_ACTIVE_CWO = [
    '71xx', // Surface
    '72xx', // Sub/Nuc
    '740X', // Sub/Nuc specific? Prompt: "72xx / 740X"
    '73xx', // Aviation
    '74xx', // Gen Line / Staff (Overlaps 740X? yes. 740x is more specific)
    '75xx', // Staff?
    '78xx'  // IW
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
        case 'URL': return 'URL';
        case 'RL': return 'RL';
        case 'IWL': return 'IWL';
        case 'STAFF': return 'STAFF';
        case 'LDO_ACTIVE': return 'LDO';
        case 'LDO_CWO_RESERVE': return 'RES LDO/CWO'; // Or just LDO? Maybe distinction helps.
        case 'CWO_ACTIVE': return 'CWO';
        default: return '';
    }
};
