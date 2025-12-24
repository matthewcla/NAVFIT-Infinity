import type { RosterEntry, BoardSchedule, SummaryGroup, Report } from '../../types';

// Periodic Cycles (Month index 0-11)
const PERIODIC_CYCLES: Record<string, number> = {
    'CAPT': 6, // July
    'CDR': 6,  // July
    'LCDR': 9, // Oct
    'LT': 0,   // Jan
    'LTJG': 1, // Feb
    'ENS': 4,  // May
    'CWO': 8,  // Sept
    'E9': 3,   // Apr
    'E8': 8,   // Sept
    'E7': 8,   // Sept
    'E6': 10,  // Nov
    'E5': 2,   // Mar
    'E4': 5,   // June
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
        roster: RosterEntry[],
        _boards: BoardSchedule | null,
        targetDate: Date = new Date()
    ): Promise<SummaryGroup[]> => {
        const groups: SummaryGroup[] = [];
        const currentMonth = targetDate.getMonth();
        // const currentYear = targetDate.getFullYear();

        // 1. Identification of Periodic Reports
        // Group by Rank
        const periodicCandidates = roster.filter(m => {
            // const rankBase = m.rank.split(' ')[0]; // Handle "LT JG" etc if needed, simplified here
            // Map common ranks
            const simpleRank = mapRankToKey(m.rank);
            if (!simpleRank) return false;

            // const pMonth = PERIODIC_CYCLES[simpleRank];
            // Logic: Is the periodic month "soon"? (e.g., within 3 months) or "now"?
            // For demo, let's just say we look for cycles landing in next 3 months
            // For this specific User Request, let's hardcode a "match" logic to demo data
            // If rank maps to a month close to "Today", suggest it.
            // Let's just create groups for ALL ranks found in roster that match the cycle
            return true;
        });

        // Grouping logic (simplified)
        const ranks = Array.from(new Set(periodicCandidates.map(c => c.rank)));
        ranks.forEach(rank => {
            const cycleMonth = PERIODIC_CYCLES[mapRankToKey(rank) || ''];
            // Only create if we know the cycle
            if (cycleMonth !== undefined) {
                const members = periodicCandidates.filter(m => m.rank === rank);
                // Determine date (current year or next)
                const year = currentMonth > cycleMonth ? targetDate.getFullYear() + 1 : targetDate.getFullYear();
                const closeoutDate = new Date(year, cycleMonth + 1, 0); // Last day of month

                groups.push({
                    id: `sg-auto-periodic-${rank}-${year}`,
                    name: `${rank} Periodic`,
                    periodEndDate: closeoutDate.toISOString().split('T')[0],
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
                id: `sg-auto-det-${m.memberId}`,
                name: `Detachment of Individual - ${m.fullName}`,
                periodEndDate: m.prd,
                reports: [createDraftReport(m, 'Detachment of Individual', new Date(m.prd))]
            });
        });

        return groups;
    }
};

function createDraftReport(member: RosterEntry, type: 'Periodic' | 'Detachment of Individual', date: Date): Report {
    return {
        id: `r-auto-${member.memberId}-${type}`,
        memberId: member.memberId,
        periodEndDate: date.toISOString().split('T')[0],
        type: type === 'Detachment of Individual' ? 'Detachment' : type,
        traitGrades: {},
        traitAverage: 0,
        promotionRecommendation: 'NOB' as 'NOB',
        narrative: "",
        draftStatus: 'Draft' as const,
        grade: member.rank,
        shipStation: 'USS MOCK SHIP'
    };
}
