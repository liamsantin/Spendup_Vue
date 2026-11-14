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

export interface TaxReturn {
    publicId: string;
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
}

export interface TaxReturnListItem {
    publicId: string;
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
    person1: TaxIdentity;
    person2: TaxIdentity | null;
}

export interface UpsertTaxAmountPayload {
    person: TaxPerson;
    competence: TaxCompetence | null;
    amount: number | null;
}
