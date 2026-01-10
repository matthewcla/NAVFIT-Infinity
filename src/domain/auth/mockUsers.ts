import type { User } from './types';

export const MOCK_USERS: User[] = [
    {
        id: 'user_1',
        name: 'M. Clark',
        rank: 'CDR',
        title: 'Commanding Officer',
        command: 'USS SPRUANCE (DDG 111)',
        initials: 'MC',
        role: 'USER'
    },
    {
        id: 'user_2',
        name: 'K. Kennedy',
        rank: 'RADM',
        title: 'Commander',
        command: 'Navy Personnel Command',
        initials: 'KK',
        role: 'ADMIN'
    }
];
