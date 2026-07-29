export interface Rank {
  id: number;
  title: string;
}

export interface AssignedRank extends Rank {
  assignmentId: number;
  comment: string;
  count: number;
  assignedAt: string;
}

export interface FixedUser {
  id: number;
  username: string;
  displayName: string;
  initials: string;
}

export interface AssignedUser extends FixedUser {
  ranks: AssignedRank[];
}

export interface AppState {
  availableRanks: Rank[];
  users: FixedUser[];
  assignedByUser: AssignedUser[];
}

export const FIXED_USERS: FixedUser[] = [
  {
    id: 546166718,
    username: 'Noeter',
    displayName: 'Noeter',
    initials: 'NO',
  },
  {
    id: 142166671,
    username: 'hobo_with_a_hookah',
    displayName: 'Hobo',
    initials: 'HB',
  },
  {
    id: 383288860,
    username: 'ConeConundrum',
    displayName: 'Cone',
    initials: 'CC',
  },
];
