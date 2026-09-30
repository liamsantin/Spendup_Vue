import { describe, expect, it } from 'vitest';
import {
    buildImportLineSort,
    canDeleteImport,
    canRevertImport,
    countEntitiesToCreate,
    importLineDoubt,
    importLineSortParts,
    normalizeImport,
    normalizeMatchValue,
    parseImportLineSort,
    reparseLosesReviewWork,
    unresolvedLineCount,
    validateImportFile
} from '@/features/imports/format';
import { IMPORT_CSV_MAX_BYTES, IMPORT_XLSX_MAX_BYTES, type Import } from '@/features/imports/types';

describe('imports format', () => {
    it('contrôle extension et taille par format', () => {
        expect(validateImportFile(null)).toEqual({ ok: false, code: 'required' });
        expect(validateImportFile({ name: 'releve.xls', size: 10 })).toEqual({ ok: false, code: 'legacyXls' });
        expect(validateImportFile({ name: 'releve.XLSM', size: 10 })).toEqual({ ok: false, code: 'macroXlsm' });
        expect(validateImportFile({ name: 'releve.ofx', size: 10 })).toEqual({ ok: false, code: 'unsupported' });
        expect(validateImportFile({ name: 'releve.csv', size: 0 })).toEqual({ ok: false, code: 'empty' });
        expect(validateImportFile({ name: 'releve.csv', size: IMPORT_CSV_MAX_BYTES + 1 })).toMatchObject({ ok: false, code: 'tooLarge' });
        expect(validateImportFile({ name: 'releve.xlsx', size: IMPORT_CSV_MAX_BYTES + 1 })).toMatchObject({
            ok: true,
            sourceType: 'excel'
        });
        expect(validateImportFile({ name: 'releve.xlsx', size: IMPORT_XLSX_MAX_BYTES + 1 })).toMatchObject({ ok: false, code: 'tooLarge' });
    });

    it('lit et construit le tri API', () => {
        expect(parseImportLineSort('-date')).toBe('-date');
        expect(parseImportLineSort('label')).toBe('lineNumber');
        expect(importLineSortParts('-amount')).toEqual({ key: 'amount', direction: 'desc' });
        expect(buildImportLineSort('status', 'asc')).toBe('status');
    });

    it('règles de statut', () => {
        expect(canDeleteImport({ status: 'valide' })).toBe(false);
        expect(canDeleteImport({ status: 'annule' })).toBe(true);
        expect(canRevertImport({ status: 'valide' })).toBe(true);
        expect(unresolvedLineCount({ toReview: 2, errors: 1 })).toBe(3);
        const counts = { total: 3, validated: 3, toReview: 0, errors: 0, ignored: 0 };
        expect(reparseLosesReviewWork({ status: 'aValider', counts })).toBe(true);
        expect(reparseLosesReviewWork({ status: 'erreur', counts })).toBe(false);
    });

    it('raison du doute', () => {
        expect(importLineDoubt({ duplicateOfTransactionPublicId: 'tx', duplicateOfLineNumber: null, unmatchedCategoryName: 'Food' })).toBe(
            'duplicate'
        );
        expect(importLineDoubt({ duplicateOfTransactionPublicId: null, duplicateOfLineNumber: 3, unmatchedCategoryName: null })).toBe(
            'duplicateInFile'
        );
        expect(importLineDoubt({ duplicateOfTransactionPublicId: null, duplicateOfLineNumber: null, unmatchedCategoryName: 'Food' })).toBe(
            'unknownCategory'
        );
    });

    it('tolère une analyse purgée', () => {
        const raw = {
            publicId: 'i-1',
            status: 'annule',
            analysis: { sample: null, columns: undefined }
        } as unknown as Import;
        const normalized = normalizeImport(raw);
        expect(normalized.analysis.sample).toEqual([]);
        expect(normalized.analysis.columns).toEqual([]);
        expect(normalized.counts.total).toBe(0);
    });
});

describe('imports entities to create', () => {
    it('normalise comme l’API : casse, accents, ponctuation', () => {
        expect(normalizeMatchValue('COOP-4521')).toBe(normalizeMatchValue('coop 4521'));
        expect(normalizeMatchValue(' Café ')).toBe('cafe');
    });

    it('compte les valeurs distinctes des lignes validées sans rattachement', () => {
        const base = { status: 'validee' as const, tierPublicId: null, paymentMethodPublicId: null, unmatchedPaymentMethodName: null };
        expect(
            countEntitiesToCreate([
                { ...base, unmatchedTierName: 'COOP-4521' },
                { ...base, unmatchedTierName: 'coop 4521', unmatchedPaymentMethodName: 'Visa 1234' },
                { ...base, unmatchedTierName: 'Migros', status: 'aValider' },
                { ...base, unmatchedTierName: 'Denner', tierPublicId: 't-1' },
                { ...base, unmatchedTierName: null }
            ])
        ).toEqual({ tiers: 1, paymentMethods: 1 });
    });
});
