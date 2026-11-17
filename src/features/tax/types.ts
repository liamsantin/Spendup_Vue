export const TAX_CANTONS = [
    'AG',
    'AI',
    'AR',
    'BE',
    'BL',
    'BS',
    'FR',
    'GE',
    'GL',
    'GR',
    'JU',
    'LU',
    'NE',
    'NW',
    'OW',
    'SG',
    'SH',
    'SO',
    'SZ',
    'TG',
    'TI',
    'UR',
    'VD',
    'VS',
    'ZG',
    'ZH'
] as const;

export type TaxCanton = (typeof TAX_CANTONS)[number];

export type TaxPerson = '1' | '2' | '1+2';
export type TaxCompetence = 'cantonal' | 'federal' | 'both';
export type TaxStatus = 'enCours' | 'preteARecopier' | 'archivee';

export interface TaxIdentity {
    officialName: string | null;
    firstName: string | null;
    vn: string | null;
    municipality: string | null;
    job: string | null;
}

export interface TaxLineValue {
    person: TaxPerson;
    competence: TaxCompetence;
    amount: number;
    currency: string;
    origin: 'saisie' | 'propositionAcceptee';
}

export interface TaxLine {
    code: string;
    label: string;
    splitsCompetence: boolean;
    values: TaxLineValue[];
}

export interface TaxSection {
    code: string;
    label: string;
    lines: TaxLine[];
}

export interface TaxSubtotal {
    person: TaxPerson;
    competence: 'cantonal' | 'federal';
    income: number | null;
    deductions: number | null;
    netIncome: number | null;
    assets: number | null;
    liabilities: number | null;
    netAssets: number | null;
}

export type TaxEntryKind = 'employment' | 'child' | 'property' | 'debt' | 'institution';

export interface TaxEntry {
    publicId: string;
    kind: TaxEntryKind;
    person: TaxPerson;
    title: string;
    detail: string | null;
    amount: number | null;
    secondaryAmount: number | null;
}

export interface UpsertTaxEntryPayload {
    kind: TaxEntryKind;
    person: TaxPerson | null;
    title: string;
    detail: string | null;
    amount: number | null;
    secondaryAmount: number | null;
}

export interface TaxReturn {
    publicId: string;
    name: string | null;
    year: number;
    canton: string;
    status: TaxStatus;
    couple: boolean;
    taxpayerNumber: string | null;
    notes: string | null;
    person1: TaxIdentity;
    person2: TaxIdentity | null;
    sections: TaxSection[];
    subtotals: TaxSubtotal[];
    gaps: string[];
    entries: TaxEntry[];
    documents: TaxDocumentLink[];
}

export interface TaxDocumentLink {
    publicId: string;
    filePublicId: string;
    fileName: string;
    lineCode: string | null;
    label: string;
}

export interface TaxReturnListItem {
    publicId: string;
    name: string | null;
    year: number;
    canton: string;
    status: TaxStatus;
    couple: boolean;
    filledCount: number;
    lineCount: number;
}

export interface TaxReturnListResult {
    items: TaxReturnListItem[];
    totalCount: number;
}

/** D'où vient une proposition : revenu récurrent, dette, actif, ou relevé importé (sans page à rouvrir). */
export type TaxSuggestionSource = 'recurringIncome' | 'liability' | 'asset' | 'statement';

/** Un élément de l'application qui compose une proposition (revenu récurrent, dette, actif). */
export interface TaxSuggestionSourceItem {
    publicId: string;
    name: string;
}

/** Contrôle d'une valeur lue dans un PDF : recoupée par un total imprimé, ou à vérifier par la personne. */
export type TaxCheck = 'verified' | 'toCheck';

export interface TaxSuggestion {
    code: string;
    label: string;
    person: TaxPerson;
    competence: TaxCompetence;
    amount: number;
    currency: string;
    originLabel: string;
    /** Présent seulement pour un montant lu dans un PDF. Absent : à vérifier. */
    check?: TaxCheck;
    source?: TaxSuggestionSource;
    sources?: TaxSuggestionSourceItem[];
}

export interface TaxSuggestionList {
    items: TaxSuggestion[];
}

export interface TaxReturnCreated {
    declaration: TaxReturn;
    suggestions: unknown[];
}

export interface UpdateTaxReturnPayload {
    canton: string;
    couple: boolean;
    status: TaxStatus;
    taxpayerNumber: string | null;
    notes: string | null;
    name: string | null;
    person1: TaxIdentity;
    person2: TaxIdentity | null;
}

export interface UpsertTaxAmountPayload {
    person: TaxPerson;
    competence: TaxCompetence | null;
    amount: number | null;
}
