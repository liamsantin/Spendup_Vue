import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ImportMapping, ImportMappingField } from '@/features/imports/types';
import { readCsv } from '@/features/demo/imports/csv';
import { IMPORT_FIELDS } from '@/features/demo/imports/headers';
import { interpret, type ParsedIssue } from '@/features/demo/imports/interpreter';
import { retainedMapping, toMappingSpec } from '@/features/demo/imports/mapping';
import golden from './fixtures/parsing-cases.golden.json';

/**
 * Cas de lecture partagés avec l'API (roadmap « import dans la démo », chantier D2).
 *
 * `fixtures/parsing-cases.golden.json` est la copie exacte du fichier de l'API
 * (`Tests/Application.Tests/Imports/Golden`), dont les résultats attendus sont écrits par le
 * lecteur de l'API. Le lecteur local de la démo doit donner les mêmes : une dérive fait échouer ce test.
 */
interface GoldenCase {
    name: string;
    text?: string;
    hex?: string;
    encoding?: string;
    bom?: boolean;
    mapping?: ImportMapping;
    limits?: { maxLines?: number; maxRows?: number; maxColumns?: number };
    expected: unknown;
}

const cases = (golden as unknown as { cases: GoldenCase[] }).cases;

function utf16(text: string, bigEndian: boolean): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < text.length; i++) {
        const unit = text.charCodeAt(i);
        bytes.push(...(bigEndian ? [unit >> 8, unit & 0xff] : [unit & 0xff, unit >> 8]));
    }
    return bytes;
}

/** Caractères Windows-1252 de la plage 0x80–0x9F utilisés par les cas. */
const CP1252: Record<string, number> = { '€': 0x80, '«': 0xab, '»': 0xbb };

function bytesOf(item: GoldenCase): Uint8Array {
    if (item.hex !== undefined) return new Uint8Array(item.hex.split(' ').map((byte) => parseInt(byte, 16)));
    const text = item.text ?? '';
    const bom = item.bom ?? false;
    switch (item.encoding ?? 'utf-8') {
        case 'utf-8':
            return new Uint8Array([...(bom ? [0xef, 0xbb, 0xbf] : []), ...new TextEncoder().encode(text)]);
        case 'utf-16le':
            return new Uint8Array([...(bom ? [0xff, 0xfe] : []), ...utf16(text, false)]);
        case 'utf-16be':
            return new Uint8Array([...(bom ? [0xfe, 0xff] : []), ...utf16(text, true)]);
        case 'windows-1252':
        case 'iso-8859-1':
            return new Uint8Array(
                [...text].map((char) => {
                    const code = CP1252[char] ?? char.charCodeAt(0);
                    if (code > 0xff) throw new Error(`Caractère hors de l'encodage du cas : ${char}`);
                    return code;
                })
            );
        default:
            throw new Error(`Encodage de cas inconnu : ${item.encoding}`);
    }
}

function money(value: number | null): string | null {
    return value === null ? null : value.toFixed(2);
}

function issues(list: ParsedIssue[]) {
    return list.map(({ code, field, message, grossValue }) => ({ code, field, message, grossValue }));
}

/** Même forme que `ImportParsingGoldenTests.Run` côté API. */
function run(item: GoldenCase): unknown {
    const maxLines = item.limits?.maxLines ?? 2000;
    const maxRows = item.limits?.maxRows ?? maxLines + 200;
    const maxColumns = item.limits?.maxColumns ?? 100;

    try {
        const { read, spec } = toMappingSpec(item.mapping ?? null);
        const table = readCsv(bytesOf(item), read.encoding, read.separator, maxRows, maxColumns);
        const interpretation = interpret(table, spec, maxLines);
        const layoutColumns: Partial<Record<ImportMappingField, number>> = {};
        for (const field of IMPORT_FIELDS) {
            const entry = interpretation.layout?.columns.find(([key]) => key === field);
            if (entry) layoutColumns[field] = entry[1];
        }
        return {
            encoding: table.encoding,
            separator: table.separator,
            headerRowNumber: interpretation.headerRowNumber,
            columns: interpretation.columns,
            sample: interpretation.sample,
            layout: interpretation.layout
                ? {
                      columns: layoutColumns,
                      dateFormat: interpretation.layout.dateFormat,
                      decimalSeparator: interpretation.layout.decimalSeparator,
                      invertSign: interpretation.layout.invertSign
                  }
                : null,
            fatalErrors: issues(interpretation.fatalErrors),
            lines: interpretation.lines.map((line) => ({
                rowNumber: line.rowNumber,
                operationDate: line.operationDate,
                valueDate: line.valueDate,
                label: line.label,
                originalLabel: line.originalLabel,
                amount: money(line.amount),
                currency: line.currency,
                balance: money(line.balance),
                categoryName: line.categoryName,
                tierName: line.tierName,
                paymentMethodName: line.paymentMethodName,
                isParasite: line.isParasite,
                issues: issues(line.issues)
            })),
            retained: retainedMapping(table, interpretation, spec)
        };
    } catch (error) {
        if (error instanceof Error && error.name === 'AppError') return { error: error.message };
        throw error;
    }
}

describe('lecture locale des relevés : mêmes résultats que l’API', () => {
    it('couvre un jeu de cas conséquent', () => {
        expect(cases.length).toBeGreaterThanOrEqual(60);
        expect(cases.every((item) => item.expected != null)).toBe(true);
    });

    it.each(cases.map((item) => [item.name, item] as const))('%s', (_name, item) => {
        expect(run(item)).toEqual(item.expected);
    });

    it('utilise la même copie du fichier que l’API, quand son dépôt est à côté', () => {
        const apiCopy = join(
            process.cwd(),
            '..',
            'Spendup_Api',
            'Tests',
            'Application.Tests',
            'Imports',
            'Golden',
            'parsing-cases.golden.json'
        );
        if (!existsSync(apiCopy)) return;
        // Comparaison du contenu, pas du texte : la mise en forme automatique des deux dépôts diffère.
        expect(golden).toEqual(JSON.parse(readFileSync(apiCopy, 'utf8')));
    });
});
