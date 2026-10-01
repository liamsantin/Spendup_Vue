/** Établissement du référentiel SIX (`bank-{IID sur 5 chiffres}`, ex. `bank-00230`). */
export type Bank = {
    publicId: string;
    name: string;
    bic: string | null;
    iid: string;
    town: string | null;
    countryCode: string;
    isActive: boolean;
};

export type BankList = {
    items: Bank[];
    page: number;
    pageSize: number;
    totalCount: number;
};

export type ListBanksQuery = {
    /** Nom « contient », début de BIC ou numéro de clearing (1 à 5 chiffres). */
    q?: string;
    /** Code ISO à 2 lettres (`CH`, `LI`…). */
    country?: string;
    page?: number;
    pageSize?: number;
};

/** `legacy` = ancien IID fusionné, toujours reconnu. */
export type BankIidType = 'headquarters' | 'branch' | 'qrIid' | 'legacy';

export type BankResolveResult = {
    iban: string;
    iid: string;
    iidType: BankIidType;
    branchTown: string | null;
    bank: Bank;
};

/**
 * Choix d’un sélecteur « Banque » :
 * - `tier` = un de mes tiers banque (`institutionTierPublicId`) ;
 * - `registry` = un établissement du référentiel (`bankPublicId`), tier créé ou réutilisé par le serveur.
 */
export type BankChoice =
    | { kind: 'tier'; tierPublicId: string; name: string; bankPublicId: string | null; bankName: string | null }
    | { kind: 'registry'; bankPublicId: string; name: string };

export const BANK_SEARCH_MAX = 100;
export const BANK_PAGE_SIZE_DEFAULT = 20;
export const BANK_PAGE_SIZE_MAX = 100;
/** Pays proposés dans le sélecteur (référentiel essentiellement suisse et liechtensteinois). */
export const BANK_COUNTRIES = ['CH', 'LI'] as const;
export type BankCountry = (typeof BANK_COUNTRIES)[number];
export const BANK_COUNTRY_DEFAULT: BankCountry = 'CH';
/** Pays dont l’IBAN permet de déduire la banque (`/api/banks/resolve`). */
export const BANK_RESOLVABLE_IBAN_COUNTRIES = ['CH', 'LI'] as const;
/** IBAN CH / LI : 21 caractères. */
export const BANK_RESOLVABLE_IBAN_LENGTH = 21;
