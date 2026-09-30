import { describe, expect, it } from 'vitest';
import {
    buildImportLinePayload,
    importLineToFormFields,
    isCategoryCompatibleWithAmount,
    isImportLineFormDirty,
    sanitizeSignedAmountInput,
    willCreateTier
} from '@/features/imports/payload';
import type { ImportLine } from '@/features/imports/types';

const NOW = new Date(2026, 8, 28, 12);

function line(partial: Partial<ImportLine> = {}): ImportLine {
    return {
        publicId: 'l-1',
        lineNumber: 7,
        status: 'aValider',
        operationDate: '2026-07-01',
        valueDate: null,
        label: 'MIGROS GENEVE',
        amount: -45.3,
        type: 'depense',
        currency: 'CHF',
        balance: 954.7,
        categoryPublicId: null,
        categorySuggested: false,
        unmatchedCategoryName: null,
        tierPublicId: null,
        unmatchedTierName: null,
        paymentMethodPublicId: null,
        unmatchedPaymentMethodName: null,
        recurringDue: null,
        duplicateOfTransactionPublicId: null,
        duplicateOfLineNumber: null,
        isEdited: false,
        transactionPublicId: null,
        issues: [],
        original: null,
        ...partial
    };
}

describe('imports line payload', () => {
    it('rapproche puis détache une échéance récurrente', () => {
        const item = line();
        const linked = { ...importLineToFormFields(item), recurringDueKey: 're-1|2026-07-01' };
        expect(buildImportLinePayload(item, linked, { now: NOW })).toEqual({
            ok: true,
            payload: { recurringDue: { recurringPublicId: 're-1', scheduledAt: '2026-07-01' } }
        });

        const matched = line({
            recurringDue: {
                kind: 'expense',
                recurringPublicId: 're-1',
                duePublicId: null,
                name: 'Loyer',
                scheduledAt: '2026-07-01',
                plannedAmount: 1500
            }
        });
        const detached = { ...importLineToFormFields(matched), recurringDueKey: '' };
        expect(buildImportLinePayload(matched, detached, { now: NOW })).toEqual({ ok: true, payload: { recurringDue: null } });
    });

    it('ne renvoie que les champs modifiés', () => {
        const item = line();
        const fields = { ...importLineToFormFields(item), label: 'Migros Genève' };
        expect(buildImportLinePayload(item, fields, { now: NOW })).toEqual({ ok: true, payload: { label: 'Migros Genève' } });
    });

    it('signale l’absence de modification', () => {
        const item = line();
        expect(buildImportLinePayload(item, importLineToFormFields(item), { now: NOW })).toEqual({ ok: false, code: 'noChanges' });
        expect(isImportLineFormDirty(item, importLineToFormFields(item))).toBe(false);
    });

    it('garde le montant signé et arrondi', () => {
        const item = line();
        const fields = { ...importLineToFormFields(item), amount: '-12,345' };
        expect(buildImportLinePayload(item, fields, { now: NOW })).toEqual({ ok: true, payload: { amount: -12.35 } });
    });

    it('refuse un montant nul, une date future, une date de valeur antérieure', () => {
        const item = line();
        expect(buildImportLinePayload(item, { ...importLineToFormFields(item), amount: '0' }, { now: NOW })).toMatchObject({
            code: 'amountZero'
        });
        expect(buildImportLinePayload(item, { ...importLineToFormFields(item), operationDate: '2026-10-01' }, { now: NOW })).toMatchObject({
            code: 'operationDateFuture'
        });
        expect(buildImportLinePayload(item, { ...importLineToFormFields(item), valueDate: '2026-06-30' }, { now: NOW })).toMatchObject({
            code: 'valueDateBeforeOperation',
            field: 'valueDate'
        });
    });

    it('vide une date de valeur avec null explicite', () => {
        const item = line({ valueDate: '2026-07-02' });
        expect(buildImportLinePayload(item, { ...importLineToFormFields(item), valueDate: null }, { now: NOW })).toEqual({
            ok: true,
            payload: { valueDate: null }
        });
    });

    it('contrôle la catégorie contre le signe', () => {
        const item = line();
        const fields = { ...importLineToFormFields(item), categoryPublicId: 'cat-revenu' };
        expect(buildImportLinePayload(item, fields, { now: NOW, categoryType: () => 'revenu' })).toMatchObject({
            code: 'categoryTypeMismatch'
        });
        expect(buildImportLinePayload(item, fields, { now: NOW, categoryType: () => 'mixte' })).toEqual({
            ok: true,
            payload: { categoryPublicId: 'cat-revenu' }
        });
    });

    it('retire la catégorie et le tier avec null', () => {
        const item = line({ categoryPublicId: 'c-1', tierPublicId: 't-1', paymentMethodPublicId: 'pm-1' });
        const fields = { ...importLineToFormFields(item), categoryPublicId: '', tierPublicId: '', paymentMethodPublicId: '' };
        expect(buildImportLinePayload(item, fields, { now: NOW })).toEqual({
            ok: true,
            payload: { categoryPublicId: null, tierPublicId: null, paymentMethodPublicId: null }
        });
    });

    it('valide seulement les champs touchés (ligne en erreur sur un autre champ)', () => {
        const item = line({
            status: 'erreur',
            operationDate: null,
            issues: [{ code: 'MISSING_DATE', field: 'operationDate', message: '…' }]
        });
        const fields = { ...importLineToFormFields(item), label: 'Coop' };
        expect(buildImportLinePayload(item, fields, { now: NOW })).toEqual({ ok: true, payload: { label: 'Coop' } });
    });

    it('nettoie la saisie signée', () => {
        expect(sanitizeSignedAmountInput('-12a,5-')).toBe('-12,5');
        expect(sanitizeSignedAmountInput('1-2')).toBe('12');
    });

    it('compatibilité catégorie / montant', () => {
        expect(isCategoryCompatibleWithAmount('depense', -1)).toBe(true);
        expect(isCategoryCompatibleWithAmount('depense', 1)).toBe(false);
        expect(isCategoryCompatibleWithAmount('mixte', 1)).toBe(true);
        expect(isCategoryCompatibleWithAmount(null, 1)).toBe(true);
    });
});

describe('imports line payload : valeurs à créer', () => {
    it('garde la valeur du fichier par défaut, sans rien envoyer', () => {
        const item = line({ unmatchedTierName: 'COOP-4521', unmatchedPaymentMethodName: 'Visa 1234' });
        expect(willCreateTier(item)).toBe(true);
        const fields = importLineToFormFields(item);
        expect(isImportLineFormDirty(item, fields)).toBe(false);
        expect(buildImportLinePayload(item, fields, { now: NOW })).toMatchObject({ ok: false, code: 'noChanges' });
    });

    it('« Ne pas créer » envoie null explicitement', () => {
        const item = line({ unmatchedTierName: 'COOP-4521', unmatchedPaymentMethodName: 'Visa 1234' });
        const fields = { ...importLineToFormFields(item), dropUnmatchedTier: true, dropUnmatchedPaymentMethod: true };
        expect(isImportLineFormDirty(item, fields)).toBe(true);
        expect(buildImportLinePayload(item, fields, { now: NOW })).toEqual({
            ok: true,
            payload: { tierPublicId: null, paymentMethodPublicId: null }
        });
    });

    it('un choix existant l’emporte sur la case « Ne pas créer »', () => {
        const item = line({ unmatchedTierName: 'COOP-4521' });
        const fields = { ...importLineToFormFields(item), tierPublicId: 't-1', dropUnmatchedTier: true };
        expect(buildImportLinePayload(item, fields, { now: NOW })).toEqual({ ok: true, payload: { tierPublicId: 't-1' } });
    });
});
