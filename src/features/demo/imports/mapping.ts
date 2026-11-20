/**
 * Lecture locale d'un relevé (mode démo) : validation du mapping et mapping « retenu ».
 * Portage de `Application/Imports/ImportMappings.cs` de l'API, pour un CSV.
 */
import type { ImportMapping, ImportMappingColumns, ImportMappingField } from '@/features/imports/types';
import { normalizeEncodingName, parseSeparator, refuse, separatorToApi, type ImportTable } from '@/features/demo/imports/csv';
import { IMPORT_FIELDS } from '@/features/demo/imports/headers';
import { AUTO_MAPPING_SPEC, type ImportInterpretation, type ImportMappingSpec } from '@/features/demo/imports/interpreter';
import { isBlank, normalizeText, trimNet } from '@/features/demo/imports/text';
import { isValidDateFormat } from '@/features/demo/imports/values';

export const MAX_COLUMN_REFERENCE_LENGTH = 150;

/** Options de lecture de la source, avant interprétation. */
export interface ImportReadOptions {
    encoding: string | null;
    separator: string | null;
}

/** Valide et convertit le mapping reçu de l'écran ; refuse une valeur invalide avec le message de l'API. */
export function toMappingSpec(mapping: ImportMapping | null | undefined): { read: ImportReadOptions; spec: ImportMappingSpec } {
    if (mapping == null) return { read: { encoding: null, separator: null }, spec: AUTO_MAPPING_SPEC };

    if (!isBlank(mapping.sheetName)) refuse("La feuille ne s'applique qu'à un classeur Excel.");

    const encoding = normalizeEncodingName(mapping.encoding);
    const separator = mapping.separator ? separatorToApi(parseSeparator(mapping.separator)) : null;

    const headerRow = mapping.headerRow ?? null;
    if (headerRow !== null && (headerRow < 0 || headerRow > 1_000_000)) refuse("Ligne d'en-tête invalide.");

    let dateFormat: string | null = null;
    if (!isBlank(mapping.dateFormat)) {
        dateFormat = trimNet(mapping.dateFormat as string);
        if (!isValidDateFormat(dateFormat)) refuse('Format de date invalide (ex. dd.MM.yyyy, yyyy-MM-dd).');
    }

    const rawDecimal = mapping.decimalSeparator == null ? '' : trimNet(mapping.decimalSeparator);
    if (rawDecimal !== '' && rawDecimal !== '.' && rawDecimal !== ',') refuse('Séparateur décimal invalide (. ou ,).');
    const decimalSeparator = rawDecimal === '' ? null : (rawDecimal as '.' | ',');

    const columns: [ImportMappingField, string | null][] = [];
    const source = mapping.columns ?? {};
    for (const field of IMPORT_FIELDS) {
        // Clé absente = détection automatique ; `null` ou vide = colonne désactivée.
        if (!(field in source) || source[field] === undefined) continue;
        const value = source[field];
        if (value === null || trimNet(value).length === 0) {
            columns.push([field, null]);
            continue;
        }
        const reference = trimNet(value);
        if (reference.length > MAX_COLUMN_REFERENCE_LENGTH) refuse('Référence de colonne trop longue.');
        if (reference.startsWith('#') && !/^\s*\+?[0-9]+\s*$/.test(reference.slice(1))) {
            refuse(`Index de colonne invalide : « ${reference} » (ex. #0).`);
        }
        columns.push([field, reference]);
    }

    const amountLike = (['amount', 'debit', 'credit'] as const).filter((field) =>
        columns.some(([key, value]) => key === field && value !== null)
    );
    if (amountLike.includes('amount') && amountLike.length > 1) {
        refuse('Choisissez soit une colonne montant signé, soit débit / crédit.');
    }

    return {
        read: { encoding, separator },
        spec: { headerRow, columns, dateFormat, decimalSeparator, invertSign: mapping.invertSign ?? false }
    };
}

/**
 * Mapping retenu : chaque champ explicitement renseigné (nom d'en-tête, ou `#n` si l'en-tête
 * est vide ou ambigu ; `null` si aucun). Rejoué tel quel, il redonne la même lecture.
 */
export function retainedMapping(table: ImportTable, interpretation: ImportInterpretation, spec: ImportMappingSpec): ImportMapping {
    const resolved = new Map<ImportMappingField, number>();
    if (interpretation.layout) {
        for (const [field, index] of interpretation.layout.columns) resolved.set(field, index);
    } else {
        for (const column of interpretation.columns) {
            if (column.field && !resolved.has(column.field)) resolved.set(column.field, column.index);
        }
    }

    const headerTexts = new Map(interpretation.columns.map((column) => [column.index, column.header]));
    const normalizedCounts = new Map<string, number>();
    for (const column of interpretation.columns) {
        const key = normalizeText(column.header);
        normalizedCounts.set(key, (normalizedCounts.get(key) ?? 0) + 1);
    }

    const reference = (field: ImportMappingField): string | null => {
        const index = resolved.get(field);
        if (index === undefined) return null;
        const text = headerTexts.get(index);
        const hasHeader =
            (interpretation.headerRowNumber ?? 0) > 0 &&
            text !== undefined &&
            !text.startsWith('#') &&
            trimNet(text).length <= MAX_COLUMN_REFERENCE_LENGTH &&
            normalizedCounts.get(normalizeText(text)) === 1;
        return hasHeader ? (text as string) : `#${index}`;
    };

    const columns: ImportMappingColumns = {};
    for (const field of IMPORT_FIELDS) columns[field] = reference(field);

    return {
        sheetName: null,
        encoding: table.encoding,
        separator: table.separator,
        headerRow: interpretation.headerRowNumber,
        columns,
        dateFormat: spec.dateFormat,
        decimalSeparator: spec.decimalSeparator,
        invertSign: spec.invertSign
    };
}
