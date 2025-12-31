import type { BoardSchedule, SummaryGroup, Report } from '@/types';
import type { RosterMember } from '@/types/roster';

// Periodic Cycles (Month index 0-11)
const PERIODIC_CYCLES: Record<string, number> = {
    'CAPT': 6, 'O-6': 6,
    'CDR': 6, 'O-5': 6,
    'LCDR': 9, 'O-4': 9,
    'LT': 0, 'O-3': 0,
    'LTJG': 1, 'O-2': 1,
    'ENS': 4, 'O-1': 4,
    'CWO': 8, 'W-2': 8, 'W-3': 8, 'W-4': 8, 'W-5': 8,
    'E9': 3, 'E-9': 3,
    'E8': 8, 'E-8': 8,
    'E7': 8, 'E-7': 8,
    'E6': 10, 'E-6': 10,
    'E5': 2, 'E-5': 2,
    'E4': 5, 'E-4': 5,
};

const mapRankToKey = (rank: string): string | null => {
    const r = rank.toUpperCase().split(' ')[0];
    if (Object.keys(PERIODIC_CYCLES).includes(r)) return r;
    // Basic mapping for "LT JG" -> "LTJG" if needed
    if (r === 'LT' && rank.toUpperCase().includes('JG')) return 'LTJG';
    return null;
};

export const SummaryGroupGenerator = {
    /**
     * Scans the roster and board schedule to propose summary groups
     */
    generateSuggestions: async (
        roster: RosterMember[],
        _boards: BoardSchedule | null,
        targetDate: Date = new Date()
    ): Promise<SummaryGroup[]> => {
        const groups: SummaryGroup[] = [];
        const currentMonth = targetDate.getMonth();
        // const currentYear = targetDate.getFullYear();

        // 1. Identification of Periodic Reports
        // Group by Rank
        const periodicCandidates = roster.filter(m => {
            // Map common ranks
            const simpleRank = mapRankToKey(m.rank);
            if (!simpleRank) return false;

            // Logic: Is the periodic month "soon"? (e.g., within 3 months) or "now"?
            // For demo, let's just say we look for cycles landing in next 3 months
            // For this specific User Request, let's hardcode a "match" logic to demo data
            // If rank maps to a month close to "Today", suggest it.
            // Let's just create groups for ALL ranks found in roster that match the cycle
            return true;
        });

        // Grouping logic
        // Key format: "RANK|DESIGNATOR|STATUS"
        // Officers grouped by Rank + Designator + Promotion Status
        // Enlisted grouped by Rank + Promotion Status
        const candidatesByGroup = new Map<string, RosterMember[]>();

        periodicCandidates.forEach(m => {
            const isOfficer = m.rank.startsWith('O') || m.rank.startsWith('W');
            const designatorKey = isOfficer ? m.designator : 'Enlisted';

            // Normalize Promotion Status
            // Roster typically has "Frocked", "Selected", "Regular". Convert to strict Upper Case.
            let status = (m.promotionStatus || 'Regular').toUpperCase();
            if (!['REGULAR', 'FROCKED', 'SELECTED', 'SPOT'].includes(status)) {
                status = 'REGULAR';
            }

            const key = `${m.rank}|${designatorKey}|${status}`;

            if (!candidatesByGroup.has(key)) candidatesByGroup.set(key, []);
            candidatesByGroup.get(key)!.push(m);
        });

        Array.from(candidatesByGroup.entries()).forEach(([key, members]) => {
            if (members.length === 0) return;

            const [rank, designatorContext, status] = key.split('|');
            const cycleMonth = PERIODIC_CYCLES[mapRankToKey(rank) || ''];

            if (cycleMonth !== undefined) {
                // Determine date (current year or next)
                const year = currentMonth > cycleMonth ? targetDate.getFullYear() + 1 : targetDate.getFullYear();
                const closeoutDate = new Date(year, cycleMonth + 1, 0); // Last day of month

                // Competitive Group Key (The "Pool")
                // For Officers: "O-3 1110"
                // For Enlisted: "E-6" (or "E-6 Enlisted" depending on preference, sticking to simple rank for display consistency?)
                // User example: "O-3 1110". Let's follow that pattern.
                const competitiveGroupKey = designatorContext === 'Enlisted' ? rank : `${rank} ${designatorContext}`;

                // Summary Group Name (The "Report Bucket")
                // Regular: "O-3 1110 Periodic"
                // Frocked: "O-3 1110 FROCKED Periodic"
                let groupNamePrefix = competitiveGroupKey;
                if (status !== 'REGULAR') {
                    groupNamePrefix += ` ${status}`;
                }
                const groupName = `${groupNamePrefix} Periodic`;

                groups.push({
                    id: `sg-auto-periodic-${rank}-${designatorContext}-${status}-${year}`,
                    name: groupName,
                    periodEndDate: closeoutDate.toISOString().split('T')[0],
                    paygrade: rank,
                    designator: designatorContext === 'Enlisted' ? undefined : designatorContext,
                    competitiveGroupKey: competitiveGroupKey,
                    promotionStatus: status as 'REGULAR' | 'FROCKED' | 'SELECTED' | 'SPOT',
                    reports: members.map(m => createDraftReport(m, 'Periodic', closeoutDate))
                });
            }
        });

        // 2. Identification of Detachment Reports
        // Persons whose PRD matches current month (or next month)
        const detachers = roster.filter(m => {
            const prd = new Date(m.prd);
            return prd.getMonth() === currentMonth || prd.getMonth() === (currentMonth + 1) % 12;
        });

        detachers.forEach(m => {
            groups.push({
                id: `sg-auto-det-${m.id}`,
                name: `Detachment of Individual - ${m.lastName}, ${m.firstName}`,
                periodEndDate: m.prd,
                reports: [createDraftReport(m, 'Detachment of Individual', new Date(m.prd))]
            });
        });

        return groups;
    }
};

function createDraftReport(member: RosterMember, type: 'Periodic' | 'Detachment of Individual', date: Date): Report {
    // Random Trait Average for Demo: 3.0 to 5.0, or occasional NOB
    const isNOB = Math.random() > 0.9;
    const rawTrait = 3.0 + (Math.random() * 2.0);
    const traitAverage = isNOB ? 0 : Number(rawTrait.toFixed(2));

    return {
        id: `r-auto-${member.id}-${type}`,
        memberId: member.id,
        periodEndDate: date.toISOString().split('T')[0],
        type: type === 'Detachment of Individual' ? 'Detachment' : type,
        traitGrades: {},
        traitAverage: traitAverage,
        promotionRecommendation: isNOB ? 'NOB' : (traitAverage > 4.5 ? 'EP' : (traitAverage > 3.8 ? 'MP' : 'P')),
        narrative: "",
        draftStatus: 'Draft' as const,
        grade: member.rank,
        promotionStatus: member.promotionStatus,
        shipStation: 'USS MOCK SHIP'
    };
}

