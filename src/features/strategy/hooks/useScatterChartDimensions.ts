import { useCallback } from 'react';

// --- STABLE CONSTANTS ---
// Visual Constants
const HEADER_HEIGHT = 40; // Sticky header
const ICON_RADIUS = 22;   // Max radius for collision/vis
const TOP_BUFFER = 20;    // Margin below header for NOB line
const BOTTOM_BUFFER = 30; // Margin at bottom for 3.0 line visibility inside container

// Data Constants
const NOB_VALUE = 5.5;
const TARGET_BOTTOM_TRAIT = 3.0;
const MIN_TRAIT = 1.0;
const VISIBLE_TRAIT_RANGE = NOB_VALUE - TARGET_BOTTOM_TRAIT; // 2.5 units

const NUM_MONTHS = 24;
const COL_WIDTH = 96;
const CHART_TOTAL_WIDTH = NUM_MONTHS * COL_WIDTH;

const IDEAL_RSCA_MIN = 3.8;
const IDEAL_RSCA_MAX = 4.0;

// MOCK DATA FOR PROTOTYPING
// This was defined in StrategyScattergram.tsx
const DEFAULT_START_DATE = new Date('2025-01-01');

interface UseScatterChartDimensionsProps {
    height?: number;
    startDate?: Date;
}

export function useScatterChartDimensions({ height, startDate = DEFAULT_START_DATE }: UseScatterChartDimensionsProps = {}) {
    // --- DIMENSIONS & SCALES ---
    const containerHeight = height || 320;

    // Start Y for NOB Line (Visually)
    // Needs to clear sticky header (40) + Top Buffer + Radius/Half-element
    // Actually relative to the Scroll Container content flow.
    const VISIBLE_TOP_Y = HEADER_HEIGHT + TOP_BUFFER + ICON_RADIUS;

    // Target Bottom Y for 3.0 Line (Visually) within container
    const VISIBLE_BOTTOM_Y = containerHeight - BOTTOM_BUFFER;

    // Available Height for Range (NOB to 3.0)
    const VISIBLE_PIXEL_HEIGHT = VISIBLE_BOTTOM_Y - VISIBLE_TOP_Y;

    const pixelsPerTrait = VISIBLE_PIXEL_HEIGHT / VISIBLE_TRAIT_RANGE;

    // Helper: Trait -> Y Coordinate (relative to Scroll Container Top 0)
    const traitToY = useCallback((trait: number) => {
        // NOB (5.5) is at VISIBLE_TOP_Y
        const valFromTop = NOB_VALUE - trait;
        return VISIBLE_TOP_Y + (valFromTop * pixelsPerTrait);
    }, [VISIBLE_TOP_Y, pixelsPerTrait]);

    const yToTrait = useCallback((y: number) => {
        const relativeY = y - VISIBLE_TOP_Y;
        const valFromTop = relativeY / pixelsPerTrait;
        return NOB_VALUE - valFromTop;
    }, [VISIBLE_TOP_Y, pixelsPerTrait]);

    // Total content height required to reach 1.0 (plus buffer)
    const CHART_BOTTOM_Y = traitToY(MIN_TRAIT) + BOTTOM_BUFFER;
    const TOTAL_SCROLL_HEIGHT = Math.max(containerHeight, CHART_BOTTOM_Y);

    // Helper to map date string to X coordinate
    const dateToX = useCallback((dateStr: string | Date) => {
        const d = new Date(dateStr);
        const start = new Date(startDate);
        // Visual timeline starts 3 months before START_DATE
        const diffTime = d.getTime() - start.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);
        const diffMonths = diffDays / 30.44;

        // Add 3 months offset for visual alignment, and center in column
        const visualMonthIndex = diffMonths + 3;

        return (visualMonthIndex * COL_WIDTH) + (COL_WIDTH / 2);
    }, [startDate]);

    const monthToX = useCallback((monthIndex: number) => {
        return (monthIndex * COL_WIDTH) + (COL_WIDTH / 2);
    }, []);

    return {
        // Dimensions
        containerHeight,
        TOTAL_SCROLL_HEIGHT,
        CHART_TOTAL_WIDTH,
        HEADER_HEIGHT,
        COL_WIDTH,
        NUM_MONTHS,

        // Constants
        NOB_VALUE,
        MIN_TRAIT,
        IDEAL_RSCA_MIN,
        IDEAL_RSCA_MAX,
        ICON_RADIUS,

        // Functions
        traitToY,
        yToTrait,
        dateToX,
        monthToX,
    };
}
