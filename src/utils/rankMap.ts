
export const RANK_MAP: Record<string, string> = {
    'O-1': 'Ensign',
    'O-2': 'Lieutenant Junior Grade',
    'O-3': 'Lieutenant',
    'O-4': 'Lieutenant Commander',
    'O-5': 'Commander',
    'O-6': 'Captain',
    'O-7': 'Rear Admiral (Lower Half)',
    'O-8': 'Rear Admiral',
    'O-9': 'Vice Admiral',
    'O-10': 'Admiral',
    'W-1': 'Warrant Officer 1',
    'W-2': 'Chief Warrant Officer 2',
    'W-3': 'Chief Warrant Officer 3',
    'W-4': 'Chief Warrant Officer 4',
    'W-5': 'Chief Warrant Officer 5',
    'E-1': 'Seaman Recruit',
    'E-2': 'Seaman Apprentice',
    'E-3': 'Seaman',
    'E-4': 'Petty Officer Third Class',
    'E-5': 'Petty Officer Second Class',
    'E-6': 'Petty Officer First Class',
    'E-7': 'Chief Petty Officer',
    'E-8': 'Senior Chief Petty Officer',
    'E-9': 'Master Chief Petty Officer',
};

export const getRankTitle = (payGrade: string): string => {
    return RANK_MAP[payGrade] || payGrade;
};
