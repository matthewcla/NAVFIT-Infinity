import { useMemo } from 'react';
import type { Member } from '@/types';

interface GroupMetricsOptions {
    groupList: Member[];
    projections?: Record<string, number>;
    startDate: Date;
}

export function useGroupMetrics({ groupList, projections, startDate }: GroupMetricsOptions) {
    return useMemo(() => {
        // Calculate Trend Points (RSCA - Running Cumulative Average)
        // 1. Flatten and Apply Projections
        const allReports = groupList.flatMap(m => {
            return (m.history || []).map(r => ({
                ...r,
                // Use projection if available, else original
                effectiveAverage: (projections && projections[r.id] !== undefined)
                    ? projections[r.id]
                    : r.traitAverage
            }));
        });

        // 2. Filter Valid & Sort by Date
        const validReports = allReports.filter(r =>
            r.effectiveAverage !== null &&
            r.effectiveAverage !== undefined &&
            (typeof r.effectiveAverage === 'number' ? r.effectiveAverage > 0 : false)
        ).sort((a, b) => new Date(a.periodEndDate).getTime() - new Date(b.periodEndDate).getTime());

        // 3. Calculate Cumulative Average over Time with 90-Day Delay & Batching
        // We need to map this to "Month Indices" relative to Start Date
        const timelineStart = new Date(startDate);
        timelineStart.setMonth(timelineStart.getMonth() - 3); // Timeline starts -3 months

        // Group reports by Date (Batch Logic)
        const reportsByDate = new Map<string, typeof validReports>();
        validReports.forEach(r => {
            const dKey = r.periodEndDate;
            if (!reportsByDate.has(dKey)) reportsByDate.set(dKey, []);
            reportsByDate.get(dKey)!.push(r);
        });

        // Sort batches by date
        const sortedDates = Array.from(reportsByDate.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        const trendPoints: { monthIndex: number, value: number, isProjected?: boolean }[] = [];

        // Initialize running stats
        let runningSum = 0;
        let runningCount = 0;

        // Helper to get month index relative to timeline start
        const getMonthIndex = (d: Date) => (d.getFullYear() - timelineStart.getFullYear()) * 12 + (d.getMonth() - timelineStart.getMonth());

        sortedDates.forEach(dateStr => {
            const batch = reportsByDate.get(dateStr)!;

            // 1. Calculate new RSCA for this batch
            batch.forEach(r => {
                const val = typeof r.effectiveAverage === 'number' ? r.effectiveAverage : 0;
                runningSum += val;
                runningCount++;
            });
            const newRSCA = runningCount > 0 ? runningSum / runningCount : 0;

            // 2. Determine WHEN this update applies (90 day delay)
            const reportDate = new Date(dateStr);
            const updateDate = new Date(reportDate);
            updateDate.setDate(updateDate.getDate() + 90); // +90 Days

            // 3. Plot this point
            const mIndex = getMonthIndex(updateDate);

            trendPoints.push({
                monthIndex: mIndex,
                value: newRSCA
            });
        });

        // Ensure points are sorted by month index (just in case)
        trendPoints.sort((a, b) => a.monthIndex - b.monthIndex);

        // Prepend start point if needed
        if (trendPoints.length > 0) {
            const firstPt = trendPoints[0];
            if (firstPt.monthIndex > -3) {
                trendPoints.unshift({
                    monthIndex: -3,
                    value: firstPt.value
                });
            }
        }

        // 4. "Covers the full timeline": Extend last known value to the end
        if (trendPoints.length > 0) {
            const lastPt = trendPoints[trendPoints.length - 1];
            if (lastPt.monthIndex < 23) {
                trendPoints.push({
                    monthIndex: 23,
                    value: lastPt.value,
                    isProjected: true
                });
            }
        }

        // Calculate Current RSCA (Last Real Point)
        const currentRSCA = trendPoints.length > 0 ? trendPoints[trendPoints.length - 1].value : 0;

        // --- KPI Calculation Logic ---
        const valueGap = 5.00 - currentRSCA;

        // Logic for Status
        let status: 'Safe' | 'Risk' | 'Developing' | 'Stabilized' = 'Safe';
        if (currentRSCA > 4.10) status = 'Risk';
        else if (currentRSCA < 3.60) status = 'Developing';
        else status = 'Stabilized';

        // Description logic
        let description = 'Stable performance';
        if (status === 'Risk') description = 'Average too high; limits EP value';
        if (status === 'Developing') description = 'Room for growth';

        // Sequencing Logic
        let sequencing: 'Optimal' | 'Concern' | 'Inverted' = 'Optimal';
        if (status === 'Risk') sequencing = 'Inverted';

        return {
            trendPoints,
            currentRSCA,
            status,
            valueGap,
            sequencing,
            description
        };
    }, [groupList, projections, startDate]);
}
