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
export type TaxStatus = 'enCours' | 'preteARecopier' | 'deposee' | 'archivee';

/** État civil au 31.12 de l'année fiscale (jetons de l'API). */
export const TAX_CIVIL_STATUSES = ['celibataire', 'marie', 'partenariatEnregistre', 'separe', 'divorce', 'veuf'] as const;
export type TaxCivilStatus = (typeof TAX_CIVIL_STATUSES)[number];

/** Taxation ordinaire, ou imposition à la source (signalée seulement, hors périmètre du module). */
export type TaxationMode = 'ordinaire' | 'source';

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
    origin: 'saisie' | 'propositionAcceptee' | 'importee';
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

/** Pièce attendue : cochée par la personne, ou reçue d'office quand un fichier est rangé sur sa ligne. */
export interface TaxChecklistItem {
    code: string;
    label: string;
    category: string | null;
    required: boolean;
    received: boolean;
    comment: string | null;
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
    checklist: TaxChecklistItem[];
    /** Déclaration de l'année précédente d'où celle-ci est reprise, si elle l'est. */
    previousPublicId: string | null;
    /** Date de dépôt indiquée par la personne (ISO), ou `null`. */
    submissionDate: string | null;
    /** Déposée : les montants ne changent plus que par une correction. */
    locked: boolean;
    /** Corrections journalisées, la plus récente en premier. */
    corrections: TaxCorrection[];
    /** `null` tant qu'il n'est pas indiqué. */
    civilStatus: TaxCivilStatus | null;
    taxationMode: TaxationMode;
    /** Profil cantonal retenu (libellés, codes officiels, plafonds) ; `null` : aucun profil pour ce canton. */
    profile: TaxProfileInfo | null;
    /** Profil de l'impôt fédéral direct (`CH`). */
    federalProfile: TaxProfileInfo | null;
}

/** Profil cantonal (ou fédéral) retenu pour une déclaration. */
export interface TaxProfileInfo {
    canton: string;
    /** Année du profil : différente de celle de la déclaration quand `otherYear`. */
    year: number;
    version: number;
    /** `draft` : brouillon, aucun plafond utilisé ; `reviewed` : relu par un référent. */
    status: 'draft' | 'reviewed';
    /** Profil d'une année antérieure : paramètres pas encore mis à jour. */
    otherYear: boolean;
    officialSoftware: string | null;
    /** Profil figé au dépôt : il ne suit plus les mises à jour du profil. */
    frozen: boolean;
}

/** Correction d'un montant d'une déclaration déposée. `null` = case vide. */
export interface TaxCorrection {
    code: string;
    person: TaxPerson;
    competence: TaxCompetence;
    previous: number | null;
    amount: number | null;
    reason: string;
    at: string;
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
    checklistReceived: number;
    checklistTotal: number;
    /** Déposée (même archivée ensuite) : montants verrouillés. */
    locked: boolean;
}

export interface TaxReturnListResult {
    items: TaxReturnListItem[];
    totalCount: number;
}

/** D'où vient une proposition : revenu récurrent, dette, actif, compte (solde au 31.12), ou relevé importé (sans page à rouvrir). */
export type TaxSuggestionSource = 'recurringIncome' | 'recurringExpense' | 'transaction' | 'liability' | 'asset' | 'account' | 'statement';

/** Un élément de l'application qui compose une proposition (revenu récurrent, dette, actif). */
export interface TaxSuggestionSourceItem {
    publicId: string;
    name: string;
}

/**
 * Zone d'une valeur lue sur une page du PDF (coordonnées PDF en points : x vers la droite, y vers le haut, depuis le bas
 * de la page). Couvre le code de la ligne et le montant, pour la surbrillance dans la revue.
 */
export interface TaxReadBox {
    page: number;
    x: number;
    y: number;
    w: number;
    h: number;
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
    /** Montant de l'an dernier sur la même ligne, quand l'écart est anormal (probable erreur de lecture). */
    previousAmount?: number;
    /** Zones du PDF d'où vient un montant lu (une par ligne du formulaire regroupée dans la proposition). */
    boxes?: TaxReadBox[];
    source?: TaxSuggestionSource;
    sources?: TaxSuggestionSourceItem[];
}

export interface TaxSuggestionList {
    items: TaxSuggestion[];
}

/** Un versement au 3e pilier a de l'année : `account` (virement vers un compte 3a) ou `nature` (nature confirmée). */
export interface TaxPillar3aContribution {
    transactionPublicId: string;
    label: string;
    date: string;
    amount: number;
    accountPublicId: string | null;
    accountName: string | null;
    basis: 'account' | 'nature';
}

/** Plafond issu d'un profil cantonal relu ; `remaining` est le reste avant ce plafond (information, pas une déduction). */
export interface TaxPillar3aLimit {
    appliesTo: string;
    maxAmount: number | null;
    percentOfIncome: number | null;
    remaining: number | null;
    sourceUrl: string | null;
}

/** Un rappel du dossier : `unconfirmedNatures` (count, amount), `missingDocument` (line, label, amount), `pillar3aYearEnd` (amount). */
export interface TaxReminder {
    code: 'unconfirmedNatures' | 'missingDocument' | 'pillar3aYearEnd';
    count: number;
    amount: number;
    line: string | null;
    label: string | null;
}

/** Pièce déjà jointe à une opération de l'année et utile au dossier (ligne et catégorie suggérées). */
export interface TaxDocumentCandidate {
    filePublicId: string;
    fileName: string;
    sourceKind: 'transaction' | 'recurringExpense' | 'account';
    sourcePublicId: string;
    sourceLabel: string;
    line: string;
    category: string;
    nature: string;
}

/** Une dépense d'un thème fiscal (nature confirmée). */
export interface TaxThemeTransaction {
    transactionPublicId: string;
    label: string;
    date: string;
    amount: number;
}

/** Un thème : sa nature, la ligne qu'il alimente, le total de l'année et la pièce attendue. */
export interface TaxTheme {
    nature: string;
    line: string;
    total: number;
    transactions: TaxThemeTransaction[];
    documentExpected: string | null;
}

/** Dons, garde, pensions, formation, transports et frais professionnels de l'année. */
export interface TaxThemes {
    year: number;
    currency: string;
    items: TaxTheme[];
}

/** Une facture médicale de l'année et ce qui en a été remboursé. */
export interface TaxMedicalInvoice {
    transactionPublicId: string;
    label: string;
    date: string;
    amount: number;
    reimbursed: number;
}

/** « Frais médicaux de l'année » : brut, remboursé, à charge (natures confirmées seulement). */
export interface TaxMedical {
    year: number;
    currency: string;
    gross: number;
    reimbursed: number;
    net: number;
    invoices: TaxMedicalInvoice[];
    unlinkedReimbursements: { transactionPublicId: string; label: string; date: string; amount: number }[];
}

/** « 3a de l'année » : versé, plafonds du canton (vides tant que le profil n'est pas relu) et versements. */
export interface TaxPillar3a {
    year: number;
    canton: string;
    currency: string;
    paid: number;
    limitsAvailable: boolean;
    limits: TaxPillar3aLimit[];
    contributions: TaxPillar3aContribution[];
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
    /** Date de dépôt (`yyyy-mm-dd`), lue seulement quand le statut passe à `deposee`. */
    submissionDate?: string | null;
    /** À renvoyer à chaque mise à jour : absent, l'API l'efface. */
    civilStatus: TaxCivilStatus | null;
    /** À renvoyer à chaque mise à jour : absent, l'API revient à `ordinaire`. */
    taxationMode: TaxationMode;
}

export interface UpsertTaxAmountPayload {
    person: TaxPerson;
    competence: TaxCompetence | null;
    amount: number | null;
}
