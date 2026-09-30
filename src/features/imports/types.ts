/** Statut d’un import. `importe` / `analyse` existent côté API mais ne sont jamais renvoyés. */
export type ImportStatus = 'erreur' | 'aValider' | 'valide' | 'annule';

/** Statut d’une ligne extraite du fichier. */
export type ImportLineStatus = 'validee' | 'aValider' | 'erreur' | 'ignoree';

export type ImportSourceType = 'csv' | 'excel';

export type ImportLineType = 'depense' | 'revenu';

export type ImportBalanceCheck = 'match' | 'mismatch' | 'unavailable';

/** Champs d’une ligne qu’un mapping peut associer à une colonne du fichier. */
export type ImportMappingField =
    | 'operationDate'
    | 'valueDate'
    | 'label'
    | 'amount'
    | 'debit'
    | 'credit'
    | 'currency'
    | 'balance'
    | 'category'
    | 'tier'
    | 'paymentMethod';

/**
 * Colonnes du mapping. Clé **absente** = détection automatique ; `null` = aucune colonne ;
 * sinon nom exact de l’en-tête (casse / accents ignorés) ou `#n` (index 0-based).
 */
export type ImportMappingColumns = Partial<Record<ImportMappingField, string | null>>;

export type ImportMapping = {
    sheetName?: string | null;
    encoding?: string | null;
    separator?: string | null;
    /** Ligne affichée (1-based) de l’en-tête. `0` = pas d’en-tête. Absent = recherche automatique. */
    headerRow?: number | null;
    columns?: ImportMappingColumns | null;
    /** Format .NET (`dd.MM.yyyy`…). S’il est fourni, seul ce format est essayé. */
    dateFormat?: string | null;
    decimalSeparator?: string | null;
    invertSign?: boolean | null;
};

export type ImportCounts = {
    total: number;
    validated: number;
    toReview: number;
    errors: number;
    ignored: number;
};

export type ImportColumn = {
    index: number;
    header: string;
    field: ImportMappingField | null;
};

export type ImportIssue = {
    code: string;
    field: string | null;
    message: string;
};

export type ImportWarning = {
    code: 'FILE_ALREADY_IMPORTED' | 'PERIOD_OVERLAP' | (string & {});
    message: string;
    importPublicId?: string | null;
    date?: string | null;
};

export type ImportTemplateSuggestion = {
    publicId: string;
    name: string;
};

export type ImportAnalysis = {
    encoding: string | null;
    separator: string | null;
    sheetNames: string[];
    sheetName: string | null;
    headerRow: number | null;
    columns: ImportColumn[];
    /** Lignes brutes (5). Vidé 90 jours après la clôture. */
    sample: string[][];
    /** Mapping retenu, à renvoyer modifié au `reparse`. */
    mapping: ImportMapping | null;
    errors: ImportIssue[];
    warnings: ImportWarning[];
    suggestedTemplates: ImportTemplateSuggestion[];
};

export type Import = {
    publicId: string;
    /** `null` si le compte a été supprimé. */
    accountPublicId: string | null;
    accountName: string | null;
    accountCurrency: string | null;
    fileName: string;
    sourceType: ImportSourceType;
    status: ImportStatus;
    templatePublicId: string | null;
    /** Moyen de paiement par défaut choisi à l’upload (posé sur les lignes sans moyen reconnu). */
    defaultPaymentMethodPublicId: string | null;
    counts: ImportCounts;
    periodFrom: string | null;
    periodTo: string | null;
    createdAt: string;
    updatedAt: string | null;
    validatedAt: string | null;
    /** Présent seulement si l’import est ouvert (`erreur` / `aValider`). */
    expiresAt: string | null;
    analysis: ImportAnalysis;
};

export type ImportList = {
    items: Import[];
    page: number;
    pageSize: number;
    totalCount: number;
};

export type ListImportsQuery = {
    status?: ImportStatus;
    accountPublicId?: string;
    page?: number;
    pageSize?: number;
};

export type ImportLineOriginal = {
    operationDate: string | null;
    valueDate: string | null;
    label: string | null;
    amount: number | null;
    currency: string | null;
    categoryName: string | null;
    tierName: string | null;
    paymentMethodName?: string | null;
};

/**
 * Échéance récurrente (modèle + date prévue) réglée au commit par la ligne.
 * `duePublicId` est `null` si l’échéance n’est pas (ou plus) matérialisée : elle l’est au commit.
 */
export type ImportLineRecurringDue = {
    kind: 'expense' | 'income';
    recurringPublicId: string;
    duePublicId: string | null;
    name: string;
    scheduledAt: string;
    plannedAmount: number;
};

export type ImportLine = {
    publicId: string;
    lineNumber: number;
    status: ImportLineStatus;
    operationDate: string | null;
    valueDate: string | null;
    label: string | null;
    /** Signé : négatif = dépense. */
    amount: number | null;
    type: ImportLineType | null;
    currency: string | null;
    balance: number | null;
    categoryPublicId: string | null;
    categorySuggested: boolean;
    unmatchedCategoryName: string | null;
    tierPublicId: string | null;
    unmatchedTierName: string | null;
    /** Moyen actif du compte cible (colonne du fichier, défaut de l’import ou historique). */
    paymentMethodPublicId: string | null;
    unmatchedPaymentMethodName: string | null;
    recurringDue: ImportLineRecurringDue | null;
    duplicateOfTransactionPublicId: string | null;
    duplicateOfLineNumber: number | null;
    isEdited: boolean;
    transactionPublicId: string | null;
    issues: ImportIssue[];
    /** `null` après la purge des 90 jours. */
    original: ImportLineOriginal | null;
};

export type ImportLineList = {
    items: ImportLine[];
    page: number;
    pageSize: number;
    totalCount: number;
};

export type ImportLineSortKey = 'lineNumber' | 'date' | 'amount' | 'status';
/** Tri API : clé, préfixe `-` pour l’ordre décroissant. */
export type ImportLineSort = ImportLineSortKey | `-${ImportLineSortKey}`;

export type ListImportLinesQuery = {
    status?: ImportLineStatus;
    q?: string;
    sort?: ImportLineSort;
    page?: number;
    pageSize?: number;
};

/** PATCH ligne : champ absent = inchangé ; présent (y compris `null`) = appliqué. */
export type UpdateImportLinePayload = {
    operationDate?: string | null;
    valueDate?: string | null;
    label?: string;
    amount?: number | null;
    categoryPublicId?: string | null;
    tierPublicId?: string | null;
    paymentMethodPublicId?: string | null;
    /** `null` = détacher l’échéance rapprochée. */
    recurringDue?: { recurringPublicId: string; scheduledAt: string } | null;
    status?: 'validee' | 'ignoree';
    reset?: boolean;
};

export type ImportBulkAction = 'validate' | 'ignore' | 'setCategory' | 'setTier' | 'setPaymentMethod';

/** Sélection : exactement un de `linePublicIds`, `sameLabelAs`, `status`. */
export type BulkUpdateImportLinesPayload = {
    action: ImportBulkAction;
    linePublicIds?: string[];
    sameLabelAs?: string;
    status?: ImportLineStatus;
    categoryPublicId?: string | null;
    tierPublicId?: string | null;
    paymentMethodPublicId?: string | null;
};

export type BulkUpdateImportLinesResult = {
    updated: number;
    skipped: number;
    import: Import;
};

/** `paymentMethodPublicId` absent = moyen par défaut conservé, `null` = retiré. */
export type ReparseImportPayload = (
    | { mapping: ImportMapping; importTemplatePublicId?: never }
    | { importTemplatePublicId: string; mapping?: never }
    | { mapping?: never; importTemplatePublicId?: never }
) & {
    paymentMethodPublicId?: string | null;
};

export type ImportPreview = {
    toCreate: number;
    unresolved: number;
    totalDebit: number;
    totalCredit: number;
    periodFrom: string | null;
    periodTo: string | null;
    /** `null` sur un compte partagé dont le solde est masqué. */
    balanceBefore: number | null;
    balanceAfter: number | null;
    bankClosingBalance: number | null;
    balanceCheck: ImportBalanceCheck;
    /** Solde banque − solde calculé. */
    balanceDifference: number | null;
};

export type CommitImportResult = {
    import: Import;
    createdTransactions: number;
    /** Tiers / moyens créés depuis les valeurs du fichier non reconnues (`unmatched…Name`). */
    createdTiers: number;
    createdPaymentMethods: number;
};

/** Ce que le commit vient de créer (panneau de résultat). */
export type ImportCommitSummary = Omit<CommitImportResult, 'import'>;

export type RevertImportResult = {
    import: Import;
    revertedTransactions: number;
};

export type CreateImportPayload = {
    file: File;
    accountPublicId: string;
    mapping?: ImportMapping | null;
    importTemplatePublicId?: string | null;
    /** Moyen par défaut, du compte cible. */
    paymentMethodPublicId?: string | null;
};

export type SaveImportAsTemplatePayload = {
    name: string;
    bankTierPublicId?: string | null;
};

export type ImportTemplate = {
    publicId: string;
    name: string;
    sourceType: ImportSourceType;
    /** Modèle fourni par Spend.Up : lecture seule. */
    isSystem: boolean;
    isActive: boolean;
    bankTierPublicId: string | null;
    description: string | null;
    mapping: ImportMapping;
    createdAt: string | null;
    updatedAt: string | null;
};

export type ImportTemplateList = {
    items: ImportTemplate[];
    totalCount: number;
};

export type CreateImportTemplatePayload = {
    name: string;
    sourceType: ImportSourceType;
    mapping: ImportMapping;
    bankTierPublicId?: string | null;
    isActive?: boolean;
};

/** PUT = état complet (`sourceType` non modifiable). */
export type UpdateImportTemplatePayload = {
    name: string;
    mapping: ImportMapping;
    bankTierPublicId: string | null;
    isActive: boolean;
};

export const IMPORT_STATUSES: readonly ImportStatus[] = ['erreur', 'aValider', 'valide', 'annule'];
export const IMPORT_LINE_STATUSES: readonly ImportLineStatus[] = ['validee', 'aValider', 'erreur', 'ignoree'];
export const IMPORT_LINE_SORT_KEYS: readonly ImportLineSortKey[] = ['lineNumber', 'date', 'amount', 'status'];
export const IMPORT_LINE_SORT_DEFAULT: ImportLineSort = 'lineNumber';

export const IMPORT_MAPPING_FIELDS: readonly ImportMappingField[] = [
    'operationDate',
    'valueDate',
    'label',
    'amount',
    'debit',
    'credit',
    'currency',
    'balance',
    'category',
    'tier',
    'paymentMethod'
];

export const IMPORT_ENCODINGS = ['utf-8', 'utf-16', 'windows-1252', 'iso-8859-1'] as const;
export const IMPORT_SEPARATORS = [';', ',', '|', 'tab'] as const;
export const IMPORT_DECIMAL_SEPARATORS = ['.', ','] as const;
export const IMPORT_DATE_FORMATS = ['dd.MM.yyyy', 'dd/MM/yyyy', 'dd-MM-yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy', 'dd.MM.yy'] as const;

export const IMPORT_CSV_MAX_BYTES = 2 * 1024 * 1024;
export const IMPORT_XLSX_MAX_BYTES = 5 * 1024 * 1024;
export const IMPORT_ACCEPT = '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const IMPORT_PAGE_SIZE_DEFAULT = 20;
export const IMPORT_PAGE_SIZE_MAX = 100;
export const IMPORT_LINES_PAGE_SIZE_DEFAULT = 50;
export const IMPORT_LINES_PAGE_SIZE_MAX = 200;
export const IMPORT_LINE_SEARCH_MAX = 100;
export const IMPORT_LINE_LABEL_MAX = 255;
export const IMPORT_TEMPLATE_NAME_MAX = 150;
export const IMPORT_HEADER_SCAN_ROWS = 20;
