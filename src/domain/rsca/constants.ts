// RSCA Control Band
export const DEFAULT_RSCA_CONTROL_LOW = 3.80;
export const DEFAULT_RSCA_CONTROL_HIGH = 4.20;

// Hard Bounds for MTA
export const DEFAULT_MTA_MIN = 2.00;
export const DEFAULT_MTA_MAX = 5.00;

// Algorithm Defaults
export const DEFAULT_TOLERANCE = 0.005;
export const DEFAULT_MAX_ITERATIONS = 30;

export const DEFAULT_CONSTRAINTS = {
    controlBandLower: DEFAULT_RSCA_CONTROL_LOW,
    controlBandUpper: DEFAULT_RSCA_CONTROL_HIGH,
    mtaLowerBound: DEFAULT_MTA_MIN,
    mtaUpperBound: DEFAULT_MTA_MAX,
    tolerance: DEFAULT_TOLERANCE,
    maxIterations: DEFAULT_MAX_ITERATIONS
};
