/**
 * Lecture locale d'un relevé (mode démo) : en-tête, colonnes et lignes.
 * Portage de `Application/Imports/Parsing/ImportInterpreter.cs` de l'API.
 */
import type { ImportMappingField } from '@/features/imports/types';
import { cellAt, cellDisplay, rowIsBlank, type ImportCell, type ImportRow, type ImportTable } from '@/features/demo/imports/csv';
import { isHeaderCandidate, matchHeader, matchHeaderRow } from '@/features/demo/imports/headers';
import { cleanLabel, normalizeText, trimNet } from '@/features/demo/imports/text';
import {
    centsToNumber,
    decAbs,
    decAdd,
    decNegate,
    decToCents,
    parseAmount,
    parseDateText,
    toIsoDate,
    type Dec
} from '@/features/demo/imports/values';

export const LABEL_MAX_LENGTH = 255;
export const ORIGINAL_LABEL_MAX_LENGTH = 500;
export const HEADER_SEARCH_ROWS = 20;
export const SAMPLE_ROWS = 5;

/**
 * Mapping déjà validé. Un champ absent de `columns` = détection ; présent avec `null` = désactivé ;
 * sinon une référence (nom d'en-tête ou `#index` 0-based). `headerRow` : ligne affichée (1-based),
 * `0` = fichier sans en-tête, `null` = recherche automatique.
 */
export interface ImportMappingSpec {
    headerRow: number | null;
    columns: [ImportMappingField, string | null][];
    dateFormat: string | null;
    decimalSeparator: '.' | ',' | null;
    invertSign: boolean;
}

export const AUTO_MAPPING_SPEC: ImportMappingSpec = {
    headerRow: null,
    columns: [],
    dateFormat: null,
    decimalSeparator: null,
    invertSign: false
};

/** Disposition résolue : index des colonnes et options de lecture. */
export interface ImportLayout {
    columns: [ImportMappingField, number][];
    dateFormat: string | null;
    decimalSeparator: '.' | ',' | null;
    invertSign: boolean;
}

export interface ParsedIssue {
    code: string;
    field: string | null;
    message: string;
    grossValue: string | null;
}

export interface DetectedColumn {
    index: number;
    header: string;
    field: ImportMappingField | null;
}

/** Ligne source interprétée, avant les règles métier (compte, catégories, doublons). */
export interface ParsedImportLine {
    rowNumber: number;
    cells: ImportCell[];
    /** `yyyy-MM-dd`. */
    operationDate: string | null;
    valueDate: string | null;
    label: string | null;
    originalLabel: string | null;
    /** Montant signé, arrondi au centime. */
    amount: number | null;
    currency: string | null;
    balance: number | null;
    categoryName: string | null;
    tierName: string | null;
    paymentMethodName: string | null;
    isParasite: boolean;
    issues: ParsedIssue[];
}

export interface ImportInterpretation {
    headerRowNumber: number | null;
    columns: DetectedColumn[];
    sample: string[][];
    layout: ImportLayout | null;
    lines: ParsedImportLine[];
    fatalErrors: ParsedIssue[];
}

/** Libellé de total, solde ou report (français, allemand, anglais), en début de texte. */
const TOTAL_LABEL =
    /^(sous total|total|totaux|solde|decompte|saldo|summe|abrechnung|zwischensumme|report|uebertrag|ubertrag|balance|closing balance|opening balance|solde initial|solde final)(?![\p{L}\p{Mn}\p{Nd}\p{Pc}])/u;

/**
 * Dictionnaire à l'ordre d'énumération de `Dictionary<,>` de .NET : une clé retirée libère une
 * case, que la clé ajoutée ensuite réutilise. Cet ordre décide quel champ l'emporte quand deux
 * champs désignent la même colonne.
 */
class SlotMap<K, V> {
    private slots: ([K, V] | null)[] = [];
    private free: number[] = [];

    constructor(entries: Iterable<[K, V]> = []) {
        for (const [key, value] of entries) this.set(key, value);
    }

    private indexOf(key: K): number {
        return this.slots.findIndex((slot) => slot !== null && slot[0] === key);
    }

    has(key: K): boolean {
        return this.indexOf(key) >= 0;
    }

    get(key: K): V | undefined {
        return this.slots[this.indexOf(key)]?.[1];
    }

    set(key: K, value: V): void {
        const index = this.indexOf(key);
        if (index >= 0) {
            this.slots[index] = [key, value];
            return;
        }
        const reused = this.free.pop();
        if (reused === undefined) this.slots.push([key, value]);
        else this.slots[reused] = [key, value];
    }

    delete(key: K): void {
        const index = this.indexOf(key);
        if (index < 0) return;
        this.slots[index] = null;
        this.free.push(index);
    }

    entries(): [K, V][] {
        return this.slots.filter((slot): slot is [K, V] => slot !== null);
    }
}

function issue(code: string, field: string | null, message: string, grossValue: string | null = null): ParsedIssue {
    return { code, field, message, grossValue };
}

function columnsOf(row: ImportRow): DetectedColumn[] {
    return row.cells.map((cell, index) => ({
        index,
        header: cell === null ? `#${index}` : cellDisplay(cell),
        field: cell === null ? null : matchHeader(cell)
    }));
}

/** Jusqu'à `SAMPLE_ROWS` lignes non vides dont le numéro dépasse `afterRowNumber`. */
function sampleFrom(rows: ImportRow[], afterRowNumber: number): string[][] {
    return rows
        .filter((row) => row.rowNumber > afterRowNumber && !rowIsBlank(row))
        .slice(0, SAMPLE_ROWS)
        .map((row) => row.cells.map(cellDisplay));
}

function fatal(headerRow: number | null, columns: DetectedColumn[], sample: string[][], error: ParsedIssue): ImportInterpretation {
    return { headerRowNumber: headerRow, columns, sample, layout: null, lines: [], fatalErrors: [error] };
}

function parseIndexReference(reference: string): number | null {
    // `int.TryParse` : signe et espaces tolérés, chiffres seulement.
    return /^\s*[+-]?[0-9]+\s*$/.test(reference) ? Number(reference) : null;
}

/** Index `#n` s'il tient dans la largeur, sinon colonne dont l'en-tête normalisé égale la référence. */
function resolveReference(reference: string, header: ImportRow | null, width: number): number | null {
    const trimmed = trimNet(reference);
    if (trimmed.startsWith('#')) {
        const index = parseIndexReference(trimmed.slice(1));
        if (index !== null) return index >= 0 && index < Math.max(width, 1) ? index : null;
    }
    if (header === null) return null;
    const wanted = normalizeText(trimmed);
    const found = header.cells.findIndex((cell) => normalizeText(cellDisplay(cell)) === wanted);
    return found >= 0 ? found : null;
}

/** Vrai si date, libellé et montant (ou débit / crédit) sont tous donnés par un index `#n`. */
function allExplicitByIndex(spec: ImportMappingSpec): boolean {
    const isIndex = (field: ImportMappingField) => {
        const reference = spec.columns.find(([key]) => key === field)?.[1];
        return reference != null && trimNet(reference).startsWith('#');
    };
    return isIndex('operationDate') && isIndex('label') && (isIndex('amount') || isIndex('debit') || isIndex('credit'));
}

/**
 * Repère l'en-tête (imposée, absente, ou cherchée), résout les colonnes du mapping par-dessus la
 * détection, puis lit les lignes de données jusqu'à `maxLines`. Une erreur fatale ne produit aucune ligne.
 */
export function interpret(table: ImportTable, spec: ImportMappingSpec, maxLines: number): ImportInterpretation {
    const rows = table.rows;
    const nonBlank = rows.filter((row) => !rowIsBlank(row));
    if (nonBlank.length === 0) {
        return fatal(null, [], [], issue('EMPTY_FILE', null, 'Le fichier ne contient aucune donnée.'));
    }

    // 1. Ligne d'en-tête : imposée, absente (0), ou recherchée.
    let header: ImportRow | null;
    if (spec.headerRow === 0) {
        header = null;
    } else if (spec.headerRow !== null) {
        header = rows.find((row) => row.rowNumber === spec.headerRow) ?? null;
        if (header === null || rowIsBlank(header)) {
            return fatal(
                null,
                columnsOf(nonBlank[0]),
                sampleFrom(rows, nonBlank[0].rowNumber),
                issue('HEADER_NOT_FOUND', null, `La ligne d'en-tête ${spec.headerRow} est vide ou absente.`)
            );
        }
    } else {
        // Colonnes nommées par le mapping (modèle) : l'en-tête est la 1re ligne qui les porte toutes.
        const named = [
            ...new Set(
                spec.columns
                    .map(([, reference]) => reference)
                    .filter((reference): reference is string => reference !== null && !trimNet(reference).startsWith('#'))
                    .map((reference) => normalizeText(reference))
            )
        ];
        const candidates = nonBlank.slice(0, HEADER_SEARCH_ROWS);
        header =
            named.length > 0
                ? (candidates.find((row) => {
                      const cells = new Set(row.cells.map((cell) => normalizeText(cellDisplay(cell))));
                      return named.every((name) => cells.has(name));
                  }) ?? null)
                : null;
        header ??= candidates.find((row) => isHeaderCandidate(matchHeaderRow(row))) ?? null;

        if (header === null && !allExplicitByIndex(spec)) {
            // Pas d'en-tête reconnu : on propose la ligne la plus « en-tête » pour l'écran de mapping.
            const best = [...candidates].sort((a, b) => matchHeaderRow(b).size - matchHeaderRow(a).size || a.rowNumber - b.rowNumber)[0];
            return fatal(
                best.rowNumber,
                columnsOf(best),
                sampleFrom(rows, best.rowNumber),
                issue('HEADER_NOT_FOUND', null, 'Colonnes non reconnues : associe les colonnes date, libellé et montant.')
            );
        }
    }

    const width = Math.max(...rows.map((row) => row.cells.length));
    const columns: DetectedColumn[] =
        header === null ? Array.from({ length: width }, (_, index) => ({ index, header: `#${index}`, field: null })) : columnsOf(header);
    const detected = header === null ? new Map<ImportMappingField, number>() : matchHeaderRow(header);

    // 2. Mapping explicite par-dessus la détection.
    const resolved = new SlotMap<ImportMappingField, number>(detected);
    const explicitFields = new Set<ImportMappingField>();
    const errors: ParsedIssue[] = [];
    for (const [field, reference] of spec.columns) {
        explicitFields.add(field);
        if (reference === null) {
            resolved.delete(field);
            continue;
        }
        const index = resolveReference(reference, header, width);
        if (index !== null) {
            resolved.set(field, index);
        } else {
            errors.push(issue('COLUMN_NOT_FOUND', field, `Colonne « ${reference} » introuvable pour « ${field} ».`));
        }
    }

    // Montant signé et débit/crédit s'excluent : l'explicite gagne, à égalité le montant signé.
    const hasSplit = resolved.has('debit') || resolved.has('credit');
    if (resolved.has('amount') && hasSplit) {
        const splitExplicit = explicitFields.has('debit') || explicitFields.has('credit');
        if (splitExplicit && !explicitFields.has('amount')) {
            resolved.delete('amount');
        } else {
            resolved.delete('debit');
            resolved.delete('credit');
        }
    }

    const missing: string[] = [];
    if (!resolved.has('operationDate')) missing.push('date');
    if (!resolved.has('label')) missing.push('libellé');
    if (!resolved.has('amount') && !resolved.has('debit') && !resolved.has('credit')) missing.push('montant (ou débit / crédit)');
    if (missing.length > 0) {
        errors.push(issue('MISSING_COLUMNS', null, `Colonnes obligatoires non associées : ${missing.join(', ')}.`));
    }

    const fieldByIndex = new Map<number, ImportMappingField>();
    for (const [field, index] of resolved.entries()) {
        if (!fieldByIndex.has(index)) fieldByIndex.set(index, field);
    }
    const annotated = columns.map((column) => ({ ...column, field: fieldByIndex.get(column.index) ?? null }));
    const headerRowNumber = header?.rowNumber ?? 0;
    const sample = sampleFrom(rows, headerRowNumber);

    if (errors.length > 0) {
        return { headerRowNumber, columns: annotated, sample, layout: null, lines: [], fatalErrors: errors };
    }

    const layout: ImportLayout = {
        columns: resolved.entries(),
        dateFormat: spec.dateFormat,
        decimalSeparator: spec.decimalSeparator,
        invertSign: spec.invertSign
    };

    // 3. Lignes de données.
    const dataRows = rows.filter((row) => row.rowNumber > headerRowNumber && !rowIsBlank(row));
    const stop = (error: ParsedIssue): ImportInterpretation => ({
        headerRowNumber,
        columns: annotated,
        sample,
        layout,
        lines: [],
        fatalErrors: [error]
    });
    if (dataRows.length === 0) return stop(issue('NO_DATA_ROWS', null, "Aucune ligne de données sous l'en-tête."));
    if (dataRows.length > maxLines) {
        return stop(
            issue(
                'TOO_MANY_LINES',
                null,
                `Le fichier contient ${dataRows.length} lignes (maximum ${maxLines}) : découpez-le en plusieurs imports.`
            )
        );
    }

    return { headerRowNumber, columns: annotated, sample, layout, lines: dataRows.map((row) => parseRow(row, layout)), fatalErrors: [] };
}

function cellOf(row: ImportRow, layout: ImportLayout, field: ImportMappingField): ImportCell {
    const index = layout.columns.find(([key]) => key === field)?.[1];
    return index === undefined ? null : cellAt(row, index);
}

function nullIfEmpty(value: string): string | null {
    return value.length === 0 ? null : value;
}

/**
 * Montant signé de la colonne montant, ou débit (négatif) et crédit (positif) en valeur absolue.
 * Une cellule vide n'est pas présente ; une cellule illisible est un problème.
 */
function readAmount(row: ImportRow, layout: ImportLayout): { amount: Dec | null; error: ParsedIssue | null; present: boolean } {
    const unreadable = (cell: ImportCell) => ({
        amount: null,
        error: issue('INVALID_AMOUNT', 'amount', 'Montant illisible.', cellDisplay(cell)),
        present: true
    });

    if (layout.columns.some(([key]) => key === 'amount')) {
        const cell = cellOf(row, layout, 'amount');
        if (cell === null) return { amount: null, error: null, present: false };
        const value = parseAmount(cell, layout.decimalSeparator);
        return value ? { amount: value, error: null, present: true } : unreadable(cell);
    }

    // Débit / crédit : la valeur absolue fait foi, le sens vient de la colonne.
    const debitCell = cellOf(row, layout, 'debit');
    const creditCell = cellOf(row, layout, 'credit');
    if (debitCell === null && creditCell === null) return { amount: null, error: null, present: false };

    let total: Dec = { units: 0n, scale: 0 };
    for (const [cell, negative] of [
        [debitCell, true],
        [creditCell, false]
    ] as const) {
        if (cell === null) continue;
        const value = parseAmount(cell, layout.decimalSeparator);
        if (!value) return unreadable(cell);
        total = decAdd(total, negative ? decNegate(decAbs(value)) : decAbs(value));
    }
    return { amount: total, error: null, present: true };
}

/** Interprète une ligne selon une disposition résolue (lecture initiale, ou remise à zéro d'une ligne). */
export function parseRow(row: ImportRow, layout: ImportLayout): ParsedImportLine {
    let issues: ParsedIssue[] = [];

    let operationDate: string | null = null;
    const dateCell = cellOf(row, layout, 'operationDate');
    if (dateCell !== null) {
        const date = parseDateText(dateCell, layout.dateFormat);
        if (date) operationDate = toIsoDate(date);
        else issues.push(issue('INVALID_DATE', 'operationDate', "Date d'opération illisible.", cellDisplay(dateCell)));
    }

    // Date de valeur illisible : information secondaire, jamais bloquante.
    const valueCell = cellOf(row, layout, 'valueDate');
    const parsedValueDate = valueCell === null ? null : parseDateText(valueCell, layout.dateFormat);
    const valueDate = parsedValueDate ? toIsoDate(parsedValueDate) : null;

    const rawLabel = cellDisplay(cellOf(row, layout, 'label'));
    const label = cleanLabel(rawLabel, LABEL_MAX_LENGTH);
    const originalLabel = cleanLabel(rawLabel, ORIGINAL_LABEL_MAX_LENGTH);

    const read = readAmount(row, layout);
    if (read.error) issues.push(read.error);
    const signed = read.amount && layout.invertSign ? decNegate(read.amount) : read.amount;
    const cents = signed ? decToCents(signed) : null;

    const balanceCell = cellOf(row, layout, 'balance');
    const balanceValue = balanceCell === null ? null : parseAmount(balanceCell, layout.decimalSeparator);
    const balance = balanceValue ? centsToNumber(decToCents(balanceValue)) : null;

    const currencyText = cellDisplay(cellOf(row, layout, 'currency'));
    const currency = currencyText.length === 0 ? null : currencyText.toUpperCase();

    // Lignes parasites : sans date, soit sans montant (titre, pied de page), soit un total / solde
    // reporté. Un montant nul sur un libellé de solde ou de décompte est aussi ignoré.
    let isParasite = false;
    const zeroSettlement = cents === 0n && read.present && label !== null && TOTAL_LABEL.test(normalizeText(label));
    if (zeroSettlement) {
        isParasite = true;
        issues = [issue('AUTO_IGNORED', null, 'Montant nul sur un solde ou un décompte : ignorée automatiquement.')];
    } else if (operationDate === null) {
        const looksLikeTotal =
            (label !== null && TOTAL_LABEL.test(normalizeText(label))) || TOTAL_LABEL.test(normalizeText(cellDisplay(dateCell)));
        if (!read.present || looksLikeTotal) {
            isParasite = true;
            issues = [];
        } else if (dateCell === null) {
            issues.push(issue('MISSING_DATE', 'operationDate', "Date d'opération manquante."));
        }
    }

    if (!isParasite) {
        if (label === null) issues.push(issue('MISSING_LABEL', 'label', 'Libellé manquant.'));
        if (!read.present) issues.push(issue('MISSING_AMOUNT', 'amount', 'Montant manquant.'));
    }

    return {
        rowNumber: row.rowNumber,
        cells: row.cells,
        operationDate,
        valueDate,
        label,
        originalLabel,
        amount: cents === null ? null : centsToNumber(cents),
        currency,
        balance,
        categoryName: nullIfEmpty(cellDisplay(cellOf(row, layout, 'category'))),
        tierName: nullIfEmpty(cellDisplay(cellOf(row, layout, 'tier'))),
        paymentMethodName: nullIfEmpty(cellDisplay(cellOf(row, layout, 'paymentMethod'))),
        isParasite,
        issues
    };
}
