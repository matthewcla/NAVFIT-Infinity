export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const PERIODIC_SCHEDULE: Record<string, number> = {
    'O-6': 7, // July
    'O-5': 4, // April
    'O-4': 10, // Oct
    'O-3': 1, // Jan
    'O-2': 2, // Feb
    'O-1': 5, // May
    'W-5': 3, // W-2 to W-5 often grouped or specific. Defaulting generally.
    'W-4': 3,
    'W-3': 3,
    'W-2': 3,
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
