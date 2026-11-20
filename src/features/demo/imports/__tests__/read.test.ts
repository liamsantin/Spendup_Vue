import { describe, expect, it } from 'vitest';
import { ensureCsvSource, MAX_CSV_BYTES, readStatement, readStatementFile } from '@/features/demo/imports/read';
import { toMappingSpec } from '@/features/demo/imports/mapping';
import { isValidDateFormat, parseAmount, decToCents } from '@/features/demo/imports/values';
import { IMPORT_DATE_FORMATS } from '@/features/imports/types';

const encode = (text: string) => new TextEncoder().encode(text);

/** Lecture locale des relevés (chantier D2) : ce que le fichier commun avec l'API ne couvre pas. */
describe('lecture locale des relevés : point d’entrée', () => {
    it('lit un relevé choisi par le visiteur sans autre source que le fichier', async () => {
        const file = new File(['Date;Libellé;Montant\r\n20.11.2026;Café;-4.50\r\n'], 'releve.csv', { type: 'text/csv' });
        const reading = await readStatementFile(file, null);

        expect(reading.interpretation.fatalErrors).toEqual([]);
        expect(reading.interpretation.lines).toHaveLength(1);
        expect(reading.interpretation.lines[0]).toMatchObject({ operationDate: '2026-11-20', label: 'Café', amount: -4.5 });
        expect(reading.retained.columns).toMatchObject({ operationDate: 'Date', label: 'Libellé', amount: 'Montant' });
    });

    it('rejoue le mapping retenu et retrouve la même lecture', () => {
        const bytes = encode('Relevé\r\nQuand;Quoi;Combien\r\n20/11/2026;Café;4,50\r\n');
        const first = readStatement(bytes, {
            columns: { operationDate: 'Quand', label: 'Quoi', amount: 'Combien' },
            decimalSeparator: ',',
            invertSign: true
        });
        const second = readStatement(bytes, first.retained);

        expect(first.interpretation.lines[0].amount).toBe(-4.5);
        expect(second.interpretation.lines).toEqual(first.interpretation.lines);
        expect(second.retained).toEqual(first.retained);
    });

    it('refuse les formats que la démo ne lit pas, avant toute lecture', () => {
        const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0]);
        const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

        expect(() => ensureCsvSource(zip, 'releve.xlsx')).toThrow(/format CSV/);
        expect(() => ensureCsvSource(zip, 'releve.csv')).toThrow(/format CSV/);
        expect(() => ensureCsvSource(encode('a;b'), 'releve.xlsx')).toThrow(/format CSV/);
        expect(() => ensureCsvSource(ole, 'releve.csv')).toThrow(/\.xls/);
        expect(() => ensureCsvSource(encode('a;b'), 'releve.XLS')).toThrow(/\.xls/);
        expect(() => ensureCsvSource(encode('a;b'), 'macro.xlsm')).toThrow(/macros/);
        expect(() => ensureCsvSource(encode('a;b'), 'releve.pdf')).toThrow(/Format non supporté/);
        expect(() => ensureCsvSource(new Uint8Array(), 'releve.csv')).toThrow('Le fichier est vide.');
        expect(() => ensureCsvSource(new Uint8Array(MAX_CSV_BYTES + 1).fill(0x41), 'releve.csv')).toThrow(/2 Mo pour un CSV/);
    });

    it('accepte les extensions de texte et un nom sans extension', () => {
        for (const name of [
            'releve.csv',
            'RELEVE.CSV',
            'export.txt',
            'export.tsv',
            'export.tab',
            'export',
            'C:\\dossier.v2\\export',
            null
        ]) {
            expect(() => ensureCsvSource(encode('a;b'), name)).not.toThrow();
        }
    });

    it('accepte tous les formats de date proposés par l’écran de mapping', () => {
        for (const format of IMPORT_DATE_FORMATS) expect(isValidDateFormat(format)).toBe(true);
    });

    /**
     * Écart connu avec l'API : elle accepte aussi les formats .NET à heure sur 12 h (`hh`, `tt`), à
     * fuseau (`zzz`, `K`) et les formats standard d'un caractère (`d`, `g`). La démo les refuse :
     * l'écran ne propose que les formats de `IMPORT_DATE_FORMATS`.
     */
    it('refuse les formats de date que la démo ne lit pas', () => {
        for (const dateFormat of ['dd.MM.yyyy hh:mm tt', 'd', 'g', 'yyyy-MM-ddTHH:mm:ssK', 'dddd dd MMMM yyyy']) {
            expect(() => toMappingSpec({ dateFormat })).toThrow('Format de date invalide (ex. dd.MM.yyyy, yyyy-MM-dd).');
        }
    });

    it('garde des centimes exacts, là où un nombre flottant se tromperait', () => {
        // Point décimal imposé : sans lui, « 1.005 » est lu comme mille cinq (séparateur de milliers).
        const cents = (text: string) => decToCents(parseAmount(text, '.')!);
        expect(cents('1.005')).toBe(101n);
        expect(cents('2.675')).toBe(268n);
        expect(cents('-0.005')).toBe(-1n);
        expect(cents('0.1') + cents('0.2')).toBe(30n);
        expect(cents('99999999999999999999.99')).toBe(9999999999999999999999n);
    });
});
