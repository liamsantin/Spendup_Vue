export type AccountType = 'courant' | 'epargne' | 'credit' | 'cash' | 'investissement' | 'crypto' | 'other';

export type Currency = 'CHF' | 'EUR' | 'USD' | 'GBP';

export type AccountRole = 'owner' | 'viewer' | 'editor';
export type ShareRole = 'viewer' | 'editor';
export type ShareStatusRole = 'pending' | 'viewer' | 'editor';

/** Champs masquables pour un viewer (`balance` couvre initial + current). */
export type HiddenAccountField = 'iban' | 'accountNumber' | 'balance';

export type Account = {
    publicId: string;
    name: string;
    type: AccountType;
    currency: Currency;
    /** Nullable pour un viewer si `balance` est dans `hiddenFields`. */
    initialBalance: number | null;
    /** Nullable pour un viewer si `balance` est dans `hiddenFields`. */
    currentBalance: number | null;
    iban: string | null;
    accountNumber: string | null;
    color: string | null;
    isPrimary: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string | null;
    isOwned: boolean;
    myRole: AccountRole;
    /**
     * Champs masqués pour le destinataire courant.
     * Listé ici → afficher « caché » (même si une valeur non-null est renvoyée par erreur).
     * Owner / editor : toujours `[]`.
     */
    hiddenFields: HiddenAccountField[];
};

export type AccountShare = {
    publicId: string;
    userPublicId: string;
    displayName: string;
    photoUrl: string | null;
    role: ShareStatusRole;
    invitedRole: ShareRole | null;
    /** Champs masqués pour ce destinataire (pertinent si viewer / pending viewer). */
    hiddenFields: HiddenAccountField[];
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
    /** Aperçu des champs qui seront masqués après acceptation. */
    hiddenFields: HiddenAccountField[];
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

/**
 * PUT compte.
 * - Owner : champs complets ; `iban: null` vide l’IBAN.
 * - Editor : uniquement `name`, `accountNumber`, `color` (les champs owner sont omis côté store).
 */
export type UpdateAccountPayload = {
    name: string;
    accountNumber: string | null;
    color: string | null;
    type?: AccountType;
    currency?: Currency;
    initialBalance?: number;
    iban?: string | null;
    isPrimary?: boolean;
};

export type InviteAccountSharePayload = {
    userPublicId: string;
    role: ShareRole;
    /**
     * Uniquement pour `viewer`. Omis → défaut `["iban","accountNumber"]`.
     * `[]` explicite = tout visible. Ignoré pour `editor`.
     */
    hiddenFields?: HiddenAccountField[];
};

export type UpdateAccountShareRolePayload = {
    role: ShareRole;
    /**
     * Uniquement pour `viewer`. Omis → conserve l’existant (sauf bascule editor→viewer → défaut).
     * `[]` explicite = tout visible. Ignoré pour `editor`.
     */
    hiddenFields?: HiddenAccountField[];
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
    page: number;
    pageSize: number;
    totalCount: number;
};

export type ListBalanceSnapshotsQuery = {
    page?: number;
    pageSize?: number;
};

export type CreateBalanceSnapshotPayload = {
    balance: number;
    /** ISO UTC (`…Z`). Date calendaire convertie via `ymdToSnapshotIso` (aujourd’hui = maintenant, passé = midi UTC). */
    snapshotAt: string;
    note?: string | null;
};

export const ACCOUNT_TYPES: AccountType[] = ['courant', 'epargne', 'credit', 'cash', 'investissement', 'crypto', 'other'];

export const CURRENCIES: Currency[] = ['CHF', 'EUR', 'USD', 'GBP'];

export const ACCOUNT_COLOR_PRESETS = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B'] as const;

export const HIDDEN_ACCOUNT_FIELDS: HiddenAccountField[] = ['iban', 'accountNumber', 'balance'];

/** Défaut serveur à l’invitation viewer si `hiddenFields` est omis. */
export const DEFAULT_VIEWER_HIDDEN_FIELDS: HiddenAccountField[] = ['iban', 'accountNumber'];
