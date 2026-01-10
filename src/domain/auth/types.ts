export interface User {
    id: string;
    name: string;
    rank: string; // e.g. "CDR", "RADM"
    title: string; // e.g. "CO", "CNPC"
    command: string; // e.g. "USS SPRUANCE", "NPC"
    initials: string; // e.g. "MC" for M. Clark
    role: 'USER' | 'ADMIN';
}

export interface AuthState {
    currentUser: User | null;
    isAuthenticated: boolean;
    availableUsers: User[];
}
