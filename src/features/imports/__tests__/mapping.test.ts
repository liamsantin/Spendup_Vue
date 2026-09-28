import { describe, expect, it } from 'vitest';
import {
    buildImportMapping,
    columnReference,
    fieldForColumn,
    isMappingLayoutChanged,
    mappingFormFromAnalysis,
    normalizeHeader,
    resolveColumnReference,
    selectableTemplates
} from '@/features/imports/mapping';
import type { ImportAnalysis, ImportColumn, ImportTemplate } from '@/features/imports/types';

const columns: ImportColumn[] = [
    { index: 0, header: 'Buchungsdatum', field: 'operationDate' },
    { index: 1, header: 'Text', field: 'label' },
    { index: 2, header: 'Belastung', field: 'debit' },
    { index: 3, header: 'Gutschrift', field: 'credit' },
    { index: 4, header: 'Saldo', field: 'balance' },
    { index: 5, header: 'Montant', field: null },
    { index: 6, header: 'montant', field: null }
];

function analysis(partial: Partial<ImportAnalysis> = {}): ImportAnalysis {
    return {
        encoding: 'windows-1252',
        separator: ';',
        sheetNames: [],
        sheetName: null,
        headerRow: 3,
        columns,
        sample: [['05.03.2024', 'Achat TWINT', '45.30', '', '954.70', '', '']],
        mapping: {
            encoding: 'windows-1252',
            separator: ';',
            headerRow: 3,
            columns: {
                operationDate: 'Buchungsdatum',
                valueDate: null,
                label: 'Text',
                amount: null,
                debit: 'Belastung',
                credit: 'Gutschrift',
                currency: null,
                balance: 'Saldo',
                category: null,
                tier: null
            },
            dateFormat: null,
            decimalSeparator: null,
            invertSign: false
        },
        errors: [],
        warnings: [],
        suggestedTemplates: [],
        ...partial
    };
}

describe('imports mapping', () => {
    it('normalise les en-têtes (casse, accents, espaces)', () => {
        expect(normalizeHeader('  Date   Opération ')).toBe('date operation');
    });

    it('résout une référence par nom ou par index', () => {
        expect(resolveColumnReference('buchungsdatum', columns)).toBe('#0');
        expect(resolveColumnReference('#4', columns)).toBe('#4');
        expect(resolveColumnReference('#42', columns)).toBe('');
        expect(resolveColumnReference('Inconnu', columns)).toBe('');
        expect(resolveColumnReference(null, columns)).toBe('');
    });

    it('préfère le nom unique, sinon #n (doublon ou fichier sans en-tête)', () => {
        expect(columnReference(1, columns, 3)).toBe('Text');
        expect(columnReference(5, columns, 3)).toBe('#5');
        expect(columnReference(1, columns, 0)).toBe('#1');
    });

    it('pré-remplit depuis le mapping retenu, mode débit / crédit', () => {
        const form = mappingFormFromAnalysis(analysis());
        expect(form.amountMode).toBe('debitCredit');
        expect(form.columns.operationDate).toBe('#0');
        expect(form.columns.debit).toBe('#2');
        expect(form.columns.valueDate).toBe('');
        expect(form.headerRow).toBe('3');
        expect(form.encoding).toBe('windows-1252');
        expect(fieldForColumn(form, 2)).toBe('debit');
        expect(fieldForColumn(form, 5)).toBeNull();
    });

    it('retombe sur les champs détectés sans mapping', () => {
        const form = mappingFormFromAnalysis(analysis({ mapping: null }));
        expect(form.columns.label).toBe('#1');
        expect(form.columns.balance).toBe('#4');
    });

    it('construit un mapping complet avec null explicite pour les champs non associés', () => {
        const form = mappingFormFromAnalysis(analysis());
        const built = buildImportMapping(form, { columns, sourceType: 'csv', layoutChanged: false });
        expect(built.ok).toBe(true);
        if (!built.ok) return;
        expect(built.mapping.columns).toEqual({
            operationDate: 'Buchungsdatum',
            valueDate: null,
            label: 'Text',
            amount: null,
            debit: 'Belastung',
            credit: 'Gutschrift',
            currency: null,
            balance: 'Saldo',
            category: null,
            tier: null
        });
        expect(built.mapping.encoding).toBe('windows-1252');
        expect(built.mapping.sheetName).toBeUndefined();
        expect(built.mapping.invertSign).toBe(false);
    });

    it('en mode signé, n’envoie jamais débit / crédit avec le montant', () => {
        const form = mappingFormFromAnalysis(analysis());
        form.amountMode = 'signed';
        form.columns.amount = '#5';
        const built = buildImportMapping(form, { columns, sourceType: 'csv', layoutChanged: false });
        expect(built.ok && built.mapping.columns).toMatchObject({ amount: '#5', debit: null, credit: null });
    });

    it('refuse un mapping sans colonne obligatoire', () => {
        const form = mappingFormFromAnalysis(analysis());
        form.columns.label = '';
        expect(buildImportMapping(form, { columns, sourceType: 'csv', layoutChanged: false })).toEqual({
            ok: false,
            code: 'labelRequired',
            field: 'label'
        });
        form.columns.label = '#1';
        form.columns.debit = '';
        form.columns.credit = '';
        expect(buildImportMapping(form, { columns, sourceType: 'csv', layoutChanged: false })).toMatchObject({
            code: 'debitCreditRequired'
        });
        form.amountMode = 'signed';
        expect(buildImportMapping(form, { columns, sourceType: 'csv', layoutChanged: false })).toMatchObject({ code: 'amountRequired' });
    });

    it('omet les colonnes quand la lecture change (redétection serveur)', () => {
        const form = mappingFormFromAnalysis(analysis());
        form.headerRow = '5';
        expect(isMappingLayoutChanged(form, analysis())).toBe(true);
        const built = buildImportMapping(form, { columns, sourceType: 'csv', layoutChanged: true });
        expect(built.ok && built.mapping).toEqual({ encoding: 'windows-1252', separator: ';', headerRow: 5, invertSign: false });
        expect(built.ok && 'columns' in built.mapping).toBe(false);
    });

    it('ne signale pas de changement sur le pré-remplissage', () => {
        expect(isMappingLayoutChanged(mappingFormFromAnalysis(analysis()), analysis())).toBe(false);
    });

    it('rejette une ligne d’en-tête non numérique', () => {
        const form = mappingFormFromAnalysis(analysis());
        form.headerRow = 'abc';
        expect(buildImportMapping(form, { columns, sourceType: 'csv', layoutChanged: true })).toMatchObject({ code: 'headerRowInvalid' });
    });

    it('filtre les modèles actifs du type du fichier', () => {
        const base = { isSystem: false, bankTierPublicId: null, description: null, mapping: {}, createdAt: null, updatedAt: null };
        const templates: ImportTemplate[] = [
            { ...base, publicId: 'a', name: 'UBS', sourceType: 'csv', isActive: true },
            { ...base, publicId: 'b', name: 'Off', sourceType: 'csv', isActive: false },
            { ...base, publicId: 'c', name: 'Carte', sourceType: 'excel', isActive: true }
        ];
        expect(selectableTemplates(templates, 'csv').map((item) => item.publicId)).toEqual(['a']);
        expect(selectableTemplates(templates, null)).toEqual([]);
    });
});
