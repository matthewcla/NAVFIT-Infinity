import { useState, useEffect } from 'react';
import type { Report } from '@/types';
import type { RosterMember, ReportingSeniorConfig } from '@/types/roster';

export const GHOST_BASELINE_TEXT = "MEMBER TRAIT AVERAGE DECREASED DUE ONLY TO CHANGE IN REPORTING SENIOR. PERFORMANCE REMAINS SUPERIOR AND ON PAR WITH [SOFT BREAKOUT].";

interface UseGhostBaselineProps {
    report: Report;
    roster: RosterMember[];
    rsConfig: ReportingSeniorConfig;
    readOnly?: boolean;
    // Callbacks to update the form data in the parent component
    onApplyGhostText: (text: string) => void;
    currentOpeningStatement?: string;
    currentComments?: string;
    currentTraitAverage?: number;
}

interface UseGhostBaselineResult {
    showGhostToast: boolean;
    dismissGhostToast: () => void;
}

export function useGhostBaseline({
    report,
    roster,
    rsConfig,
    readOnly = false,
    onApplyGhostText,
    currentOpeningStatement,
    currentComments,
    currentTraitAverage
}: UseGhostBaselineProps): UseGhostBaselineResult {
    const [showGhostToast, setShowGhostToast] = useState(false);

    useEffect(() => {
        if (readOnly) return;

        // 1. Check New RS (Total Reports == 0)
        // If undefined, default to 0 just in case, but requirement says "rsConfig.totalReports == 0"
        if ((rsConfig.totalReports || 0) > 0) return;

        // 2. Find Member and Check Rank (Top 2)
        const member = roster.find(m => m.id === report.memberId);
        if (!member) return;

        // Rank 1 or 2 (Top Performer)
        const rankOrder = member.rankOrder || 99;
        if (rankOrder > 2) return;

        // 3. Check Grade Decrease
        // Get previous report from history (assuming history[0] is most recent previous)
        const previousReport = member.history?.[0];
        const previousGrade = previousReport?.traitAverage || 0;
        const currentGrade = currentTraitAverage || 0;

        // Logic: Current < Previous
        if (currentGrade > 0 && previousGrade > 0 && currentGrade < previousGrade) {
            // Check if we already have the text to avoid overwriting user edits or looping
            if (!currentOpeningStatement && !currentComments) {
                setTimeout(() => {
                    onApplyGhostText(GHOST_BASELINE_TEXT);
                    setShowGhostToast(true);
                }, 0);
            }
        }
    }, [
        currentTraitAverage,
        rsConfig.totalReports,
        roster,
        report.memberId,
        readOnly,
        currentOpeningStatement,
        currentComments,
        onApplyGhostText
    ]);

    const dismissGhostToast = () => setShowGhostToast(false);

    return {
        showGhostToast,
        dismissGhostToast
    };
}
