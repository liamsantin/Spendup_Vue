import { formatAccountBalance } from '@/features/accounts/format';
import type { Currency } from '@/features/accounts/types';
import {
    IMPORT_CSV_MAX_BYTES,
    IMPORT_LINE_SORT_DEFAULT,
    IMPORT_LINE_SORT_KEYS,
    IMPORT_LINE_STATUSES,
    IMPORT_STATUSES,
    IMPORT_XLSX_MAX_BYTES,
    type Import,
    type ImportCounts,
    type ImportLine,
    type ImportLineSort,
    type ImportLineSortKey,
    type ImportLineStatus,
    type ImportSourceType,
    type ImportStatus
} from '@/features/imports/types';

export function isImportStatus(value: unknown): value is ImportStatus {
    return typeof value === 'string' && IMPORT_STATUSES.includes(value as ImportStatus);
}

export function isImportLineStatus(value: unknown): value is ImportLineStatus {
    return typeof value === 'string' && IMPORT_LINE_STATUSES.includes(value as ImportLineStatus);
}

export function isImportLineSort(value: unknown): value is ImportLineSort {
    if (typeof value !== 'string') return false;
    const key = value.startsWith('-') ? value.slice(1) : value;
    return IMPORT_LINE_SORT_KEYS.includes(key as ImportLineSortKey);
}

export function parseImportLineSort(value: unknown): ImportLineSort {
    return isImportLineSort(value) ? value : IMPORT_LINE_SORT_DEFAULT;
}

export function importLineSortParts(sort: ImportLineSort): { key: ImportLineSortKey; direction: 'asc' | 'desc' } {
    if (sort.startsWith('-')) return { key: sort.slice(1) as ImportLineSortKey, direction: 'desc' };
    return { key: sort as ImportLineSortKey, direction: 'asc' };
}

export function buildImportLineSort(key: ImportLineSortKey, direction: 'asc' | 'desc'): ImportLineSort {
    return direction === 'desc' ? `-${key}` : key;
}

/** Import encore modifiable (mapping ou revue). */
export function isImportOpen(item: Pick<Import, 'status'>): boolean {
    return item.status === 'erreur' || item.status === 'aValider';
}

export function canReparseImport(item: Pick<Import, 'status'>): boolean {
    return isImportOpen(item);
}

export function canReviewImport(item: Pick<Import, 'status'>): boolean {
    return item.status === 'aValider';
}

export function canCancelImport(item: Pick<Import, 'status'>): boolean {
    return isImportOpen(item);
}

export function canRevertImport(item: Pick<Import, 'status'>): boolean {
    return item.status === 'valide';
}

/** `DELETE` refusé sur un import validé : revert d’abord. */
export function canDeleteImport(item: Pick<Import, 'status'>): boolean {
    return item.status !== 'valide';
}

export function canSaveImportAsTemplate(item: Pick<Import, 'status'>): boolean {
    return item.status === 'aValider' || item.status === 'valide';
}

/** Lignes `aValider` + `erreur` : le commit exige `ignoreUnresolved` si > 0. */
export function unresolvedLineCount(counts: Pick<ImportCounts, 'toReview' | 'errors'>): number {
    return Math.max(0, counts.toReview) + Math.max(0, counts.errors);
}

/**
 * Reparse remplace toutes les lignes : confirmer dès qu’une revue a des lignes à perdre.
 * Un import en `erreur` n’a pas encore de lignes exploitables.
 */
export function reparseLosesReviewWork(item: Pick<Import, 'status' | 'counts'>): boolean {
    return item.status === 'aValider' && item.counts.total > 0;
}

export type ImportFileCheckCode = 'required' | 'empty' | 'legacyXls' | 'macroXlsm' | 'unsupported' | 'tooLarge';

export type ImportFileCheck =
    | { ok: true; sourceType: ImportSourceType; maxBytes: number }
    | { ok: false; code: ImportFileCheckCode; maxBytes?: number };

function extensionOf(fileName: string): string {
    const name = fileName.trim().toLowerCase();
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.slice(dot + 1) : '';
}

export function importSourceTypeFromFileName(fileName: string): ImportSourceType | null {
    const ext = extensionOf(fileName);
    if (ext === 'csv') return 'csv';
    if (ext === 'xlsx') return 'excel';
    return null;
}

/** Contrôle client avant upload (le serveur revalide) : extension, taille par format. */
export function validateImportFile(file: Pick<File, 'name' | 'size'> | null | undefined): ImportFileCheck {
    if (!file) return { ok: false, code: 'required' };
    const ext = extensionOf(file.name);
    if (ext === 'xls') return { ok: false, code: 'legacyXls' };
    if (ext === 'xlsm') return { ok: false, code: 'macroXlsm' };
    const sourceType = importSourceTypeFromFileName(file.name);
    if (!sourceType) return { ok: false, code: 'unsupported' };
    const maxBytes = sourceType === 'csv' ? IMPORT_CSV_MAX_BYTES : IMPORT_XLSX_MAX_BYTES;
    if (file.size === 0) return { ok: false, code: 'empty' };
    if (file.size > maxBytes) return { ok: false, code: 'tooLarge', maxBytes };
    return { ok: true, sourceType, maxBytes };
}

/** Montant signé d’une ligne (négatif = dépense), `—` si absent. */
export function formatImportAmount(amount: number | null | undefined, currency: string | null | undefined, locale?: string): string {
    if (amount == null || !Number.isFinite(amount)) return '—';
    return formatAccountBalance(amount, (currency || 'CHF') as Currency, locale);
}

export function importAmountTone(amount: number | null | undefined): 'is-debit' | 'is-credit' | null {
    if (amount == null || amount === 0) return null;
    return amount < 0 ? 'is-debit' : 'is-credit';
}

/** Horodatage API → date courte localisée. */
export function formatImportTimestamp(value: string | null | undefined, locale?: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'medium' }).format(date);
}

/** Problème bloquant sur la devise : non éditable, seule issue « Ignorer ». */
export function hasUncorrectableIssue(line: Pick<ImportLine, 'issues'>): boolean {
    return line.issues.some((issue) => issue.code === 'CURRENCY_MISMATCH' || issue.code === 'INVALID_CURRENCY');
}

export function isAutoIgnored(line: Pick<ImportLine, 'issues'>): boolean {
    return line.issues.some((issue) => issue.code === 'AUTO_IGNORED');
}

/**
 * Normalisation de l’API pour les valeurs du fichier : casse, accents et ponctuation ignorés
 * (« COOP-4521 » = « coop 4521 », « Café » = « cafe »).
 */
export function normalizeMatchValue(value: string): string {
    return value
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

export type ImportEntitiesToCreate = { tiers: number; paymentMethods: number };

/** Tiers et moyens créés au commit : valeurs distinctes non reconnues des lignes `validee`. */
export function countEntitiesToCreate(
    lines: readonly Pick<
        ImportLine,
        'status' | 'tierPublicId' | 'unmatchedTierName' | 'paymentMethodPublicId' | 'unmatchedPaymentMethodName'
    >[]
): ImportEntitiesToCreate {
    const tiers = new Set<string>();
    const paymentMethods = new Set<string>();
    for (const line of lines) {
        if (line.status !== 'validee') continue;
        if (!line.tierPublicId && line.unmatchedTierName) {
            const key = normalizeMatchValue(line.unmatchedTierName);
            if (key) tiers.add(key);
        }
        if (!line.paymentMethodPublicId && line.unmatchedPaymentMethodName) {
            const key = normalizeMatchValue(line.unmatchedPaymentMethodName);
            if (key) paymentMethods.add(key);
        }
    }
    return { tiers: tiers.size, paymentMethods: paymentMethods.size };
}

/** Champ UI fautif d’après `issues[].field` (surlignage du formulaire). */
export function issueFields(line: Pick<ImportLine, 'issues'>): Set<string> {
    const fields = new Set<string>();
    for (const issue of line.issues) {
        if (issue.field && issue.code !== 'AUTO_IGNORED') fields.add(issue.field);
    }
    return fields;
}

export type ImportLineDoubt = 'duplicate' | 'duplicateInFile' | 'unknownCategory' | null;

/** Raison principale d’une ligne `aValider`. */
export function importLineDoubt(
    line: Pick<ImportLine, 'duplicateOfTransactionPublicId' | 'duplicateOfLineNumber' | 'unmatchedCategoryName'>
): ImportLineDoubt {
    if (line.duplicateOfTransactionPublicId) return 'duplicate';
    if (line.duplicateOfLineNumber != null) return 'duplicateInFile';
    if (line.unmatchedCategoryName) return 'unknownCategory';
    return null;
}

/** Nom d’affichage d’un modèle système ou perso, à partir de la liste connue. */
export function importTemplateLabel(
    templatePublicId: string | null,
    templates: readonly { publicId: string; name: string }[]
): string | null {
    if (!templatePublicId) return null;
    return templates.find((item) => item.publicId === templatePublicId)?.name ?? null;
}

/** Tolère une analyse partielle ou purgée (listes absentes, `sample` vidé après 90 jours). */
export function normalizeImport(item: Import): Import {
    const analysis = item.analysis ?? ({} as Import['analysis']);
    return {
        ...item,
        counts: item.counts ?? { total: 0, validated: 0, toReview: 0, errors: 0, ignored: 0 },
        analysis: {
            encoding: analysis.encoding ?? null,
            separator: analysis.separator ?? null,
            sheetNames: Array.isArray(analysis.sheetNames) ? analysis.sheetNames : [],
            sheetName: analysis.sheetName ?? null,
            headerRow: analysis.headerRow ?? null,
            columns: Array.isArray(analysis.columns) ? analysis.columns : [],
            sample: Array.isArray(analysis.sample) ? analysis.sample : [],
            mapping: analysis.mapping ?? null,
            errors: Array.isArray(analysis.errors) ? analysis.errors : [],
            warnings: Array.isArray(analysis.warnings) ? analysis.warnings : [],
            suggestedTemplates: Array.isArray(analysis.suggestedTemplates) ? analysis.suggestedTemplates : []
        }
    };
}

export function normalizeImportLine(line: ImportLine): ImportLine {
    return {
        ...line,
        issues: Array.isArray(line.issues) ? line.issues : [],
        original: line.original ?? null
    };
}
