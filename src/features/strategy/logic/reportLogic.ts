import type { Member, Report, ReportingSenior } from '@/types';

/**
 * Report Logic Engines
 * "Rules of the Road" best practices and regulatory compliance engines.
 */

// --- Constants ---

const PROHIBITED_TERMS = [
    "Non-punitive letter",
    "NPLOC",
    "Unconcluded",
    "Ongoing investigation",
    "Investigation pending",
    "Court martial",
    "Judicial proceedings",
    "Marital status",
    "Wife",
    "Husband",
    "Spouse",
    "Kids",
    "Children",
    "Family",
    "Pregnancy",
    "Pregnant",
    "Maternity",
    "Paternity",
    "Minority",
    "Gender",
    "Race",
    "Religion",
    "Color",
    "National origin"
];

// --- Engines ---

/**
 * Opening Statement Generator
 * Automatically generates the mandatory opening lines for Block 41/43.
 */
export function generateOpeningStatement(
    member: Member,
    report: Report,
    _reportingSenior: ReportingSenior,
    rankGroupSize: number,
    rankRank: number // e.g., 1 for #1 EP
): string {
    const parts: string[] = [];

    // 1. Soft Breakout
    // "MY #1 OF 12 DIVISION OFFICERS!"
    // If rankRank is 1, use capitalized exclamation.
    if (rankRank === 1) {
        parts.push(`MY #1 OF ${rankGroupSize} ${member.rank}S!`); // Simple pluralization, refine if needed
    } else {
        // Top X% logic could go here, for now just simple statement if not #1
        parts.push(`Ranked #${rankRank} of ${rankGroupSize} highly competitive ${member.rank}s.`);
    }

    // 2. Screening Status
    // Logic to simulate screening based on random or passed props? 
    // For now, hardcode a placeholder or check milestone
    if (member.milestone === 'DIVO' || member.milestone === 'DH') {
        parts.push("*** SCREENED FOR XO AFLOAT ***");
    }

    // 3. Reason for Report (if detachment)
    if (report.type === 'Detachment' || report.detachmentOfIndividual) { // Using detachmentOfIndividual flag or type
        parts.push("Submitted upon member's detachment.");
    }

    return parts.join("\n");
}

/**
 * "White Space" Formatter
 * Enforces the RoR best practice of using white space between soft breakouts and the narrative.
 * Simply adds a clean newline buffer if not present.
 */
export function formatWhiteSpace(text: string): string {
    if (!text) return "";

    // Basic heuristic: ensure double newline after the first paragraph (assumed opening statement)
    // This is a naive implementation; a more robust one would detect the breakout line.

    const lines = text.split('\n');
    if (lines.length > 1) {
        if (lines[1].trim() !== "") {
            // Insert an empty line at index 1
            lines.splice(1, 0, "");
        }
    }
    return lines.join('\n');
}

/**
 * Prohibited Content Filter
 * Scans text for prohibited terms from BUPERSINST.
 */
export function scanForProhibitedContent(text: string): string[] {
    const found: string[] = [];
    const lowerText = text.toLowerCase();

    PROHIBITED_TERMS.forEach(term => {
        if (lowerText.includes(term.toLowerCase())) {
            found.push(term);
        }
    });

    return found;
}

/**
 * Adverse Report Wizard Trigger
 * Checks if a report meets the criteria for being "Adverse".
 */
export function checkAdverseConditions(report: Report): boolean {
    // 1. Check for "Significant Problems" (SP) 
    if (report.promotionRecommendation === 'SP') {
        return true;
    }

    // 2. Check for any 1.0 trait grade
    const grades = Object.values(report.traitGrades);
    if (grades.some(grade => grade === 1.0)) {
        return true;
    }

    // 3. Check for 2.0 or below in Command Climate / Equal Opportunity (Block 35/36 specific logic if we mapped them exactly)
    // For general safety, we mostly flag 1.0s or SP.

    return false;
}
