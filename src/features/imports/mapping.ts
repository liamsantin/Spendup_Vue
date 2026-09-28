import {
    IMPORT_MAPPING_FIELDS,
    type ImportAnalysis,
    type ImportColumn,
    type ImportMapping,
    type ImportMappingColumns,
    type ImportMappingField,
    type ImportSourceType,
    type ImportTemplate
} from '@/features/imports/types';

/** Mode montant : une colonne signée, ou des colonnes débit / crédit (valeur absolue, sens = colonne). */
export type ImportAmountMode = 'signed' | 'debitCredit';

/**
 * État de l’écran « Associe tes colonnes ». Chaînes pour les sélecteurs :
 * `''` = détection automatique (lecture) ou aucune colonne (champs), `#n` = colonne d’index n.
 */
export type ImportMappingForm = {
    sheetName: string;
    encoding: string;
    separator: string;
    /** `''` = recherche automatique, `'0'` = fichier sans en-tête. */
    headerRow: string;
    amountMode: ImportAmountMode;
    columns: Record<ImportMappingField, string>;
    dateFormat: string;
    decimalSeparator: string;
    invertSign: boolean;
};

export type ImportMappingErrorCode =
    | 'operationDateRequired'
    | 'labelRequired'
    | 'amountRequired'
    | 'debitCreditRequired'
    | 'headerRowInvalid';

export type BuildImportMappingResult =
    | { ok: true; mapping: ImportMapping }
    | { ok: false; code: ImportMappingErrorCode; field?: ImportMappingField | 'headerRow' };

/** Champs affichés dans l’écran de mapping, dans l’ordre. Montant selon `amountMode`. */
export const IMPORT_MAPPING_REQUIRED: readonly ImportMappingField[] = ['operationDate', 'label'];
export const IMPORT_MAPPING_OPTIONAL: readonly ImportMappingField[] = ['valueDate', 'currency', 'balance', 'category', 'tier'];

const AMOUNT_FIELDS: readonly ImportMappingField[] = ['amount', 'debit', 'credit'];

/** Casse, accents et espaces ignorés — même tolérance que le serveur sur les noms d’en-tête. */
export function normalizeHeader(value: string): string {
    return value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function columnKey(index: number): string {
    return `#${index}`;
}

export function columnIndexFromKey(key: string): number | null {
    const match = /^#(\d{1,4})$/.exec(key.trim());
    return match ? Number(match[1]) : null;
}

/**
 * Référence envoyée à l’API : nom d’en-tête s’il est présent et unique (robuste à un ordre de colonnes
 * différent dans un prochain relevé), sinon `#n`.
 */
export function columnReference(index: number, columns: readonly ImportColumn[], headerRow: number | null): string {
    const column = columns.find((item) => item.index === index);
    const header = column?.header?.trim() ?? '';
    if (!column || !header || header.startsWith('#') || headerRow === 0) return columnKey(index);
    const normalized = normalizeHeader(header);
    const duplicates = columns.filter((item) => normalizeHeader(item.header ?? '') === normalized).length;
    return duplicates === 1 ? header : columnKey(index);
}

/** Relit une référence du mapping (`#n` ou nom d’en-tête) en clé de sélecteur `#n`. */
export function resolveColumnReference(reference: string | null | undefined, columns: readonly ImportColumn[]): string {
    if (!reference) return '';
    const byIndex = columnIndexFromKey(reference);
    if (byIndex != null) return columns.some((item) => item.index === byIndex) ? columnKey(byIndex) : '';
    const normalized = normalizeHeader(reference);
    const match = columns.find((item) => normalizeHeader(item.header ?? '') === normalized);
    return match ? columnKey(match.index) : '';
}

function emptyColumns(): Record<ImportMappingField, string> {
    return Object.fromEntries(IMPORT_MAPPING_FIELDS.map((field) => [field, ''])) as Record<ImportMappingField, string>;
}

/** Paramètres de lecture effectivement utilisés par le serveur (référence pour détecter un changement). */
function layoutBaseline(analysis: ImportAnalysis) {
    const mapping = analysis.mapping ?? {};
    return {
        sheetName: analysis.sheetName ?? mapping.sheetName ?? null,
        encoding: analysis.encoding ?? mapping.encoding ?? null,
        separator: analysis.separator ?? mapping.separator ?? null,
        headerRow: analysis.headerRow ?? mapping.headerRow ?? null
    };
}

/**
 * Pré-remplit l’écran : mapping retenu par le serveur, sinon champs détectés par colonne.
 * Les paramètres de lecture reprennent ce que le serveur a réellement lu.
 */
export function mappingFormFromAnalysis(analysis: ImportAnalysis): ImportMappingForm {
    const mapping = analysis.mapping ?? {};
    const columns = emptyColumns();
    const retained = mapping.columns ?? null;
    for (const field of IMPORT_MAPPING_FIELDS) {
        const fromMapping = retained ? resolveColumnReference(retained[field], analysis.columns) : '';
        if (fromMapping) {
            columns[field] = fromMapping;
            continue;
        }
        if (retained && field in retained) continue;
        const detected = analysis.columns.find((item) => item.field === field);
        if (detected) columns[field] = columnKey(detected.index);
    }

    const layout = layoutBaseline(analysis);
    return {
        sheetName: layout.sheetName ?? '',
        encoding: layout.encoding ?? '',
        separator: layout.separator ?? '',
        headerRow: layout.headerRow == null ? '' : String(layout.headerRow),
        amountMode: !columns.amount && (columns.debit || columns.credit) ? 'debitCredit' : 'signed',
        columns,
        dateFormat: mapping.dateFormat ?? '',
        decimalSeparator: mapping.decimalSeparator ?? '',
        invertSign: mapping.invertSign === true
    };
}

function parseHeaderRow(raw: string): number | null | 'invalid' {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (!/^\d{1,4}$/.test(trimmed)) return 'invalid';
    return Number(trimmed);
}

/**
 * Les paramètres de lecture ont changé (feuille, encodage, séparateur, ligne d’en-tête) :
 * les colonnes connues ne correspondent plus, le serveur doit les redétecter.
 */
export function isMappingLayoutChanged(form: ImportMappingForm, analysis: ImportAnalysis): boolean {
    const headerRow = parseHeaderRow(form.headerRow);
    if (headerRow === 'invalid') return true;
    const layout = layoutBaseline(analysis);
    if ((form.sheetName || null) !== (layout.sheetName || null)) return true;
    if ((form.encoding || null) !== (layout.encoding || null)) return true;
    if ((form.separator || null) !== (layout.separator || null)) return true;
    return headerRow !== layout.headerRow;
}

function readOptions(form: ImportMappingForm, sourceType: ImportSourceType, headerRow: number | null): ImportMapping {
    const mapping: ImportMapping = {};
    if (sourceType === 'excel' && form.sheetName) mapping.sheetName = form.sheetName;
    if (sourceType === 'csv' && form.encoding) mapping.encoding = form.encoding;
    if (sourceType === 'csv' && form.separator) mapping.separator = form.separator;
    if (headerRow != null) mapping.headerRow = headerRow;
    if (form.dateFormat.trim()) mapping.dateFormat = form.dateFormat.trim();
    if (form.decimalSeparator) mapping.decimalSeparator = form.decimalSeparator;
    mapping.invertSign = form.invertSign;
    return mapping;
}

/**
 * Construit le mapping à envoyer au `reparse`.
 * `layoutChanged` : colonnes omises (clé absente = détection automatique après relecture).
 */
export function buildImportMapping(
    form: ImportMappingForm,
    context: { columns: readonly ImportColumn[]; sourceType: ImportSourceType; layoutChanged: boolean }
): BuildImportMappingResult {
    const headerRow = parseHeaderRow(form.headerRow);
    if (headerRow === 'invalid') return { ok: false, code: 'headerRowInvalid', field: 'headerRow' };

    const mapping = readOptions(form, context.sourceType, headerRow);
    if (context.layoutChanged) return { ok: true, mapping };

    const selected = form.columns;
    if (!selected.operationDate) return { ok: false, code: 'operationDateRequired', field: 'operationDate' };
    if (!selected.label) return { ok: false, code: 'labelRequired', field: 'label' };
    if (form.amountMode === 'signed' && !selected.amount) return { ok: false, code: 'amountRequired', field: 'amount' };
    if (form.amountMode === 'debitCredit' && !selected.debit && !selected.credit) {
        return { ok: false, code: 'debitCreditRequired', field: 'debit' };
    }

    const columns: ImportMappingColumns = {};
    for (const field of IMPORT_MAPPING_FIELDS) {
        const excluded = form.amountMode === 'signed' ? field === 'debit' || field === 'credit' : field === 'amount';
        const index = columnIndexFromKey(selected[field]);
        // `null` explicite : « aucune colonne », sinon le serveur redétecterait ce champ.
        columns[field] = excluded || index == null ? null : columnReference(index, context.columns, headerRow);
    }
    mapping.columns = columns;
    return { ok: true, mapping };
}

/** Champ déjà associé à cette colonne (affichage de l’aperçu). */
export function fieldForColumn(form: ImportMappingForm, index: number): ImportMappingField | null {
    const key = columnKey(index);
    for (const field of IMPORT_MAPPING_FIELDS) {
        if (form.amountMode === 'signed' && (field === 'debit' || field === 'credit')) continue;
        if (form.amountMode === 'debitCredit' && field === 'amount') continue;
        if (form.columns[field] === key) return field;
    }
    return null;
}

export function isAmountField(field: ImportMappingField): boolean {
    return AMOUNT_FIELDS.includes(field);
}

/** Sélecteur d’upload : modèles actifs du type du fichier (perso puis système, ordre API). */
export function selectableTemplates(templates: readonly ImportTemplate[], sourceType: ImportSourceType | null): ImportTemplate[] {
    if (!sourceType) return [];
    return templates.filter((item) => item.isActive && item.sourceType === sourceType);
}
