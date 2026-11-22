/**
 * Catalogue des aides suisses (M7) : de l’information pour s’orienter, jamais une décision de droit. Le contenu est versionné
 * par année et par langue (`data/`) ; les montants légaux ne sont pas écrits ici, ils viennent de `GET /api/legal-parameters` (M0).
 */
export const AIDS_PATH = '/app/planning/aides';

export const AID_THEMES = ['health', 'family', 'housing', 'education', 'unemployment', 'retirementDisability', 'social', 'energy'] as const;
export type AidTheme = (typeof AID_THEMES)[number];

/** Cantons dont les aides sont au catalogue (romands d’abord). Les autres cantons ne voient que les aides fédérales. */
export const AID_CANTONS = ['JU', 'VD', 'NE', 'FR', 'GE'] as const;
export type AidCanton = (typeof AID_CANTONS)[number];

export const AID_FEDERAL = 'federal';
export type AidScope = typeof AID_FEDERAL | AidCanton;

export const AID_LANGUAGES = ['fr', 'en'] as const;
export type AidLanguage = (typeof AID_LANGUAGES)[number];

/** Clés des paramètres légaux (M0) qu’une aide peut afficher. */
export const AID_AMOUNT_KEYS = [
    'avsPensionMin',
    'avsPensionMax',
    'avsCoupleCap',
    'familyAllowanceChildMin',
    'familyAllowanceTrainingMin',
    'lamalOrdinaryFranchise',
    'lamalOptionalFranchises',
    'lamalQuotePartRate',
    'lamalQuotePartMaxAdult'
] as const;
export type AidAmountKey = (typeof AID_AMOUNT_KEYS)[number];

export interface AidText {
    title: string;
    summary: string;
    /** Conditions indicatives, jamais exhaustives. */
    conditions: string[];
    organization: string;
    note?: string;
}

export interface AidEntry {
    /** Identifiant stable (sert aussi aux futurs rappels). */
    id: string;
    theme: AidTheme;
    scope: AidScope;
    /** Page officielle (administration ou organisme), jamais un site tiers. */
    url: string;
    /** Date `yyyy-MM-dd` où le lien et le contenu ont été relus. */
    verifiedAt: string;
    amountKeys?: AidAmountKey[];
    texts: Record<AidLanguage, AidText>;
}

export interface AidYear {
    year: number;
    entries: AidEntry[];
}

export interface LegalParameter {
    key: string;
    label: string;
    value: number | null;
    values: number[] | null;
    unit: string;
    source: string;
    verifiedAt: string;
    note: string | null;
}

export interface LegalParameters {
    requestedYear: number;
    year: number;
    isFallback: boolean;
    notice: string | null;
    items: LegalParameter[];
}
