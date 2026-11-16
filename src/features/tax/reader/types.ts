import type { TaxSuggestion } from '@/features/tax/types';

/** Morceau de texte positionné (coordonnées PDF : x vers la droite, y vers le haut). */
export interface Token {
    text: string;
    x: number;
    w: number;
    y: number;
}

export interface PageTokens {
    page: number;
    tokens: Token[];
}

/** Colonne du formulaire : le contribuable (code seul) ou le conjoint (code suivi de « C »). */
export type ReaderPerson = '1' | '2';

export type ReaderSection = 'income' | 'deduction' | 'asset' | 'liability' | 'other';

/** Une ligne numérotée du formulaire cantonal, rattachée (ou non) à une ligne du catalogue de l'application. */
export interface ProfileLine {
    code: string;
    label: string;
    section: ReaderSection;
    /** Code du catalogue de l'application, ou `null` si la ligne n'a pas d'équivalent. */
    target: string | null;
    /** Signe quand le formulaire ne l'imprime pas (ex. excédent de dépenses : -1). */
    sign?: 1 | -1;
}

export type ValueLookup = (code: string, person: ReaderPerson | '*') => number;

/** Total imprimé sur le formulaire, recalculé à partir des lignes lues pour contrôler la lecture. */
export interface TotalRule {
    code: string;
    label: string;
    /** `*` : total du ménage (contribuable + conjoint). */
    person: ReaderPerson | '*';
    compute: (value: ValueLookup) => number;
}

/** Description d'un formulaire cantonal pour une année : détection, codes, totaux. */
export interface FormProfile {
    id: string;
    label: string;
    canton: string;
    year: number;
    /** Reconnaît le formulaire dans le texte de toutes les pages. */
    detect: RegExp;
    /** Pages qui portent des codes de ligne (toutes si absent). */
    pages?: number[];
    lines: ProfileLine[];
    totals: TotalRule[];
}

export interface ReadLine {
    code: string;
    person: ReaderPerson;
    label: string;
    section: ReaderSection;
    /** Montant signé (les excédents de dépenses sont négatifs). */
    amount: number;
    page: number;
    target: string | null;
}

export type TotalStatus = 'ok' | 'mismatch' | 'missing';

export interface TotalCheck {
    code: string;
    label: string;
    read: number | null;
    computed: number;
    status: TotalStatus;
}

export interface ReadReport {
    profileId: string;
    profileLabel: string;
    lines: ReadLine[];
    suggestions: TaxSuggestion[];
    /** Lignes lues qui n'ont pas d'équivalent dans l'application. */
    unmapped: ReadLine[];
    totals: TotalCheck[];
}
