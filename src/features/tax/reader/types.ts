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

export type ReaderPerson = '1' | '2';

/** Colonne d'un montant : revenu / déduction (« amount ») ou fortune (« wealth »). */
export type ReaderColumn = 'amount' | 'wealth';

export type ReaderSection = 'income' | 'deduction' | 'asset' | 'liability' | 'other';

/** Une ligne numérotée du formulaire cantonal, rattachée (ou non) à des lignes du catalogue de l'application. */
export interface ProfileLine {
    code: string;
    label: string;
    section: ReaderSection;
    /** Ligne du catalogue qui reçoit la colonne revenu / déduction, ou `null` si elle n'a pas d'équivalent. */
    target: string | null;
    /** Ligne du catalogue qui reçoit la colonne fortune, quand le formulaire en a une. */
    wealthTarget?: string | null;
    /** Signe quand le formulaire ne l'imprime pas (ex. excédent de dépenses : -1). */
    sign?: 1 | -1;
}

/**
 * Total imprimé sur le formulaire, recalculé à partir des lignes lues pour contrôler la lecture.
 * Les codes de `plus` / `minus` peuvent cibler l'autre colonne avec `:w` (fortune) ou `:a` (revenu).
 */
export interface TotalRule {
    code: string;
    label: string;
    /** `*` : total du ménage (contribuable + conjoint). */
    person: ReaderPerson | '*';
    column?: ReaderColumn;
    plus: string[];
    minus?: string[];
    /** Un total ne peut pas être négatif (ex. fortune imposable). */
    floorZero?: boolean;
}

/** Colonne de montants repérée par la position de son bord droit (les montants sont alignés à droite). */
export interface AmountColumn {
    person?: ReaderPerson;
    kind: ReaderColumn;
    minRight: number;
    maxRight: number;
}

/** Façon de lire un formulaire : forme des codes, et comment distinguer les personnes. */
export interface FormLayout {
    /** Expression régulière du code (groupe 1 : le code ; groupe 2 optionnel : suffixe). */
    codePattern: string;
    /**
     * `suffix` : le conjoint a le même code suivi d'un suffixe (Jura : « 100C »), un seul montant par ligne.
     * `columns` : une colonne par personne et une colonne fortune, repérées par leur bord droit (Fribourg).
     */
    persons:
        | { kind: 'suffix'; suffix: string }
        | {
              kind: 'columns';
              columns: AmountColumn[];
              /**
               * Expression des codes pour lesquels la colonne de droite est la personne 2 et non la fortune :
               * sur certains formulaires, les deux colonnes se superposent selon la section (Fribourg).
               */
              person2InWealthBandFor?: string;
          };
    /** Zone horizontale où se trouvent les vrais codes (ignore les renvois dans les annexes). */
    codeColumn?: { min: number; max: number };
    /** `true` : un « - » devant le montant le rend négatif ; `false` : c'est seulement l'indicateur d'une déduction. */
    minusIsNegative: boolean;
}

/** Description d'un formulaire cantonal pour une année : détection, codes, totaux. Données pures (JSON). */
export interface FormProfile {
    id: string;
    label: string;
    canton: string;
    year: number;
    /** Expressions (insensibles à la casse) qui doivent toutes figurer dans le texte du document. */
    detect: string[];
    /** Pages qui portent des codes de ligne (toutes si absent). */
    pages?: number[];
    layout: FormLayout;
    lines: ProfileLine[];
    totals: TotalRule[];
}

export interface ReadLine {
    code: string;
    person: ReaderPerson;
    column?: ReaderColumn;
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
