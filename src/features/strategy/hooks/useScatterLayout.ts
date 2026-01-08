import { useMemo } from 'react';
import { THEME_COLORS } from '@/styles/theme';

// Shared interfaces
export interface RSCAReport {
    id: string;
    memberId: string;
    memberName: string;
    rawName: string;
    rank: string;
    summaryGroup: string;
    date: string;
    monthIndex: number;
    type: 'Periodic' | 'Promotion' | 'Transfer' | 'Special' | 'Gain' | 'Detachment';
    traitAverage: number;
    isNOB: boolean;
    initialTraitAverage: number;
    draftStatus?: 'Draft' | 'Review' | 'Submitted' | 'Final' | 'Planned';
}

export interface ScatterPoint {
    id: string;
    x: number;
    y: number;
    report: RSCAReport;
}

interface UseScatterLayoutProps {
    displayReports: RSCAReport[];
    startDate: Date;
    traitToY: (trait: number) => number;
    monthToX: (monthIndex: number) => number;
    chartTotalWidth: number;
}

export function useScatterLayout({
    displayReports,
    traitToY,
    monthToX,
    chartTotalWidth
}: UseScatterLayoutProps) {
    const NOB_VALUE = 5.5;

    // --- Points & Collision ---
    const points: ScatterPoint[] = useMemo(() => {
        const rawPoints = displayReports.map(r => ({
            id: r.id,
            // Shift +3 months to align with display timeline start
            x: monthToX(r.monthIndex + 3),
            y: traitToY((r.isNOB || r.type === 'Gain') ? NOB_VALUE : r.traitAverage),
            report: r
        }));

        // Collision Handling
        const COLLISION_RADIUS = 22;

        const sortedPointsRaw = [...rawPoints].sort((a, b) => a.x - b.x);

        for (let iter = 0; iter < 3; iter++) {
            for (let i = 0; i < sortedPointsRaw.length; i++) {
                const p1 = sortedPointsRaw[i];
                for (let j = i + 1; j < sortedPointsRaw.length; j++) {
                    const p2 = sortedPointsRaw[j];
                    if (p2.x - p1.x > COLLISION_RADIUS) break;
                    if (Math.abs(p1.y - p2.y) < COLLISION_RADIUS) {
                        const overlap = COLLISION_RADIUS - (p2.x - p1.x);
                        const shift = Math.max(0.5, overlap / 2);
                        p1.x -= shift;
                        p2.x += shift;
                    }
                }
            }
        }
        return sortedPointsRaw;
    }, [displayReports, traitToY, monthToX]);

    // --- Trends ---
    const { trendLines, impactConnections } = useMemo(() => {
        const lines: { x1: number, x2: number, y: number, value: number }[] = [];
        const INITIAL_RSCA = 3.85; // Should this be a prop?
        let currentRSCA = INITIAL_RSCA;
        const RSCA_LAG_MONTHS = 3;
        const NUM_MONTHS = 24; // Should match component constant

        const impacts = new Map<number, number[]>();
        displayReports.forEach(r => {
            if (r.isNOB) return;
            const impactMonth = r.monthIndex + RSCA_LAG_MONTHS;
            if (!impacts.has(impactMonth)) impacts.set(impactMonth, []);
            impacts.get(impactMonth)?.push(r.traitAverage);
        });

        let lastX = 0;

        for (let m = 0; m < NUM_MONTHS + RSCA_LAG_MONTHS; m++) {
            const chartMonthIndex = m;
            const realMonthIndex = chartMonthIndex - 3;

            if (impacts.has(realMonthIndex)) {
                const thisX = monthToX(chartMonthIndex);

                lines.push({
                    x1: lastX,
                    x2: thisX,
                    y: traitToY(currentRSCA),
                    value: currentRSCA
                });

                const newItas = impacts.get(realMonthIndex) || [];
                const avgNew = newItas.reduce((a, b) => a + b, 0) / newItas.length;
                const diff = (avgNew - currentRSCA) * 0.1;
                const nextRSCA = currentRSCA + diff;

                currentRSCA = nextRSCA;
                lastX = thisX;
            }
        }

        lines.push({
            x1: lastX,
            x2: chartTotalWidth,
            y: traitToY(currentRSCA),
            value: currentRSCA
        });

        const finalConnections = displayReports.map(r => {
            if (r.isNOB) return null;
            const impactChartMonth = (r.monthIndex + 3) + RSCA_LAG_MONTHS;
            const impactX = monthToX(impactChartMonth);

            const lineAtImpact = lines.find(l => l.x1 <= impactX && l.x2 >= impactX);
            const impactY = lineAtImpact ? lineAtImpact.y : traitToY(currentRSCA);

            const reportX = monthToX(r.monthIndex + 3);
            const reportY = traitToY(r.traitAverage);

            return {
                id: r.id,
                x1: reportX,
                y1: reportY,
                x2: impactX,
                y2: impactY,
                color: r.traitAverage >= impactY ? THEME_COLORS.promotion : THEME_COLORS.transfer
            };
        }).filter(Boolean) as { id: string, x1: number, y1: number, x2: number, y2: number, color: string }[];

        return { trendLines: lines, impactConnections: finalConnections };
    }, [displayReports, traitToY, monthToX, chartTotalWidth]);

    return { points, trendLines, impactConnections };
}
