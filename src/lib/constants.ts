export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const CURRENT_YEAR = 2025;
export const CO_DETACH_DATE = '2025-09-15'; // Change of Reporting Senior Date

export const PERIODIC_SCHEDULE: Record<string, number> = {
    'O-6': 7, // July
    'O-5': 4, // April
    'O-4': 10, // Oct
    'O-3': 1, // Jan
    'O-2': 2, // Feb
    'O-1': 5, // May
    'W-5': 9, // Sep
    'W-4': 9, // Sep
    'W-3': 9, // Sep
    'W-2': 9, // Sep
    'E-9': 4, // Apr
    'E-8': 9, // Sep
    'E-7': 9, // Sep
    'E-6': 11, // Nov
    'E-5': 3, // Mar
    'E-4': 6, // June
    'E-3': 7,
    'E-2': 7,
    'E-1': 7,
};

// Day of month for periodic reports. 0 = Last Day of Month.
export const PERIODIC_DAYS: Record<string, number> = {
    'O-6': 0,
    'O-5': 0,
    'O-4': 0,
    'O-3': 0,
    'O-2': 0,
    'O-1': 0,
    'W-5': 0,
    'W-4': 0,
    'W-3': 0,
    'W-2': 0,
    'E-9': 15,
    'E-8': 15,
    'E-7': 15,
    'E-6': 15,
    'E-5': 15,
    'E-4': 15,
    'E-3': 15,
    'E-2': 15,
    'E-1': 15,
};
