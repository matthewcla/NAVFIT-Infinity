import type { SummaryGroup } from '@/types';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';

/**
 * Determines if a Summary Group cycle is considered "Active" for the dashboard.
 * 
 * Definition of Active:
 * 1. Status is inherently active/in-progress: 'Draft', 'Review', 'Submitted'.
 * 2. OR Status is 'Planned'/'Pending' AND the periodEndDate is within the next 90 days (or past).
 * 3. cycles with 'Final' or 'Rejected' status are considered inactive/archived.
 * 
 * This ensures that upcoming planned cycles effectively "activate" on the dashboard
 * when they enter the 90-day window.
 */
export function isActiveCycle(group: SummaryGroup): boolean {
    const status = group.status || 'Draft'; // Default to Draft if undefined, identifying as active

    // 1. Explicitly Archival Statuses - NEVER Active
    if (['Final', 'Rejected', 'Accepted'].includes(status)) {
        return false;
    }

    // 2. Explicitly In-Progress Statuses - ALWAYS Active
    // Note: Including 'Drafting', 'Planning' for legacy data safety, though strictly 'Draft'/'Planned' in types.
    if (['Draft', 'Drafting', 'Review', 'Submitted', 'Planning'].includes(status)) {
        return true;
    }

    // 3. Conditional Statuses ('Planned', 'Pending') - Active if within Horizon
    // "Due within 90 days" implies: End Date <= Today + 90
    // We also include past dates (overdue planned/pending) as they certainly need attention.
    const now = startOfDay(new Date());
    const endDate = parseISO(group.periodEndDate);
    const daysUntilDue = differenceInDays(endDate, now);

    if (daysUntilDue <= 90) {
        return true;
    }

    return false;
}
