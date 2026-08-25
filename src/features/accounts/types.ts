export type AccountType = 'courant' | 'epargne' | 'credit' | 'cash' | 'investissement' | 'crypto' | 'other';

export type Currency = 'CHF' | 'EUR' | 'USD' | 'GBP';

export type AccountRole = 'owner' | 'viewer' | 'editor';
export type ShareRole = 'viewer' | 'editor';
export type ShareStatusRole = 'pending' | 'viewer' | 'editor';

export type Account = {
    publicId: string;
    name: string;
    type: AccountType;
    currency: Currency;
    initialBalance: number;
    currentBalance: number;
    iban: string | null;
    accountNumber: string | null;
    color: string | null;
    isPrimary: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string | null;
    isOwned: boolean;
    myRole: AccountRole;
};

export type AccountShare = {
    publicId: string;
    userPublicId: string;
    displayName: string;
    photoUrl: string | null;
    role: ShareStatusRole;
    invitedRole: ShareRole | null;
    createdAt: string;
    updatedAt: string;
};

export type IncomingAccountShare = {
    publicId: string;
    accountPublicId: string;
    accountName: string;
    accountType: AccountType;
    currency: Currency;
    ownerPublicId: string;
    ownerDisplayName: string;
    ownerPhotoUrl: string | null;
    role: 'pending';
    invitedRole: ShareRole;
    createdAt: string;
};

export type AccountsListResult = {
    items: Account[];
};

export type AccountSharesListResult = {
    items: AccountShare[];
};

export type IncomingAccountSharesResult = {
    items: IncomingAccountShare[];
};

export type CreateAccountPayload = {
    name: string;
    type: AccountType;
    currency?: Currency;
    initialBalance: number;
    iban?: string | null;
    accountNumber?: string | null;
    color?: string | null;
    isPrimary?: boolean;
};

/** PUT = état complet — envoyer tous les champs. */
export type UpdateAccountPayload = {
    name: string;
    type: AccountType;
    currency: Currency;
    initialBalance: number;
    iban: string | null;
    accountNumber: string | null;
    color: string | null;
    isPrimary: boolean;
};

export type InviteAccountSharePayload = {
    userPublicId: string;
    role: ShareRole;
};

export type UpdateAccountShareRolePayload = {
    role: ShareRole;
};

export type BalanceSnapshotSource = 'manual' | 'bank_import' | 'statement' | 'system';

export type AccountBalanceSnapshot = {
    publicId: string;
    accountPublicId: string;
    balance: number;
    snapshotAt: string;
    source: BalanceSnapshotSource;
    note: string | null;
    createdAt: string;
    updatedAt: string | null;
    /** Auteur du relevé — peut être null si inconnu / soft-deleted. */
    createdByUserPublicId: string | null;
    createdByDisplayName: string | null;
    createdByPhotoUrl: string | null;
};

export type AccountBalanceSnapshotsListResult = {
    items: AccountBalanceSnapshot[];
};

export type CreateBalanceSnapshotPayload = {
    balance: number;
    /** ISO UTC (`…Z`). Le client convertit une date calendaire via `ymdToSnapshotIso`. */
    snapshotAt: string;
    note?: string | null;
};

export const ACCOUNT_TYPES: AccountType[] = ['courant', 'epargne', 'credit', 'cash', 'investissement', 'crypto', 'other'];

export const CURRENCIES: Currency[] = ['CHF', 'EUR', 'USD', 'GBP'];

export const ACCOUNT_COLOR_PRESETS = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B'] as const;
