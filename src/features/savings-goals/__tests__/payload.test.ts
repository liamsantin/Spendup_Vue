import { describe, expect, it } from 'vitest';
import {
    emptySavingsGoalFormFields,
    buildCreateSavingsGoalPayload,
    buildUpdateSavingsGoalPayload,
    buildDepositUpdatePayload,
    buildUnlinkAccountPayload,
    isSavingsGoalFormDirty
} from '@/features/savings-goals/payload';
import type { SavingsGoal } from '@/features/savings-goals/types';

function fields(partial: Partial<ReturnType<typeof emptySavingsGoalFormFields>> = {}) {
    return {
        ...emptySavingsGoalFormFields({ currency: 'CHF' }),
        name: 'Vacances',
        targetAmount: '2000',
        currentAmount: '150',
        targetDate: '2026-12-01',
        ...partial
    };
}

const existing: SavingsGoal = {
    publicId: 'g-1',
    name: 'Vacances',
    targetAmount: 2000,
    currentAmount: 150,
    remainingAmount: 1850,
    percentReached: 7.5,
    currency: 'CHF',
    targetDate: '2026-12-01',
    status: 'active',
    isOverdue: false,
    accountPublicId: null,
    createdAt: '2026-09-23T18:00:00Z',
    updatedAt: null
};

describe('savings-goals payload', () => {
    it('construit un POST avec montant courant et échéance', () => {
        const result = buildCreateSavingsGoalPayload(fields());
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.payload).toMatchObject({
                name: 'Vacances',
                targetAmount: 2000,
                currentAmount: 150,
                targetDate: '2026-12-01',
                accountPublicId: null,
                currency: 'CHF'
            });
        }
    });

    it('envoie currency null si omise et currentAmount 0 par défaut', () => {
        const result = buildCreateSavingsGoalPayload(fields({ currency: '', currentAmount: '' }));
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.payload.currency).toBeNull();
            expect(result.payload.currentAmount).toBe(0);
        }
    });

    it('refuse une cible ≤ 0 et un courant négatif', () => {
        expect(buildCreateSavingsGoalPayload(fields({ targetAmount: '0' })).ok).toBe(false);
        expect(buildCreateSavingsGoalPayload(fields({ currentAmount: '-1' })).ok).toBe(false);
    });

    it('accepte une date passée et un nom identique', () => {
        const result = buildCreateSavingsGoalPayload(fields({ targetDate: '2020-01-01' }));
        expect(result.ok).toBe(true);
    });

    it('refuse un compte hors liste autorisée', () => {
        const result = buildCreateSavingsGoalPayload(fields({ accountPublicId: 'acc-shared' }), {
            allowedAccountIds: new Set(['acc-owned'])
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.code).toBe('accountInvalid');
    });

    it('refuse de changer la devise en PUT', () => {
        const result = buildUpdateSavingsGoalPayload(fields({ currency: 'EUR' }), { lockedCurrency: 'CHF' });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.code).toBe('currencyLocked');
    });

    it('envoie status null sauf abandon', () => {
        const auto = buildUpdateSavingsGoalPayload(fields(), { lockedCurrency: 'CHF' });
        expect(auto.ok).toBe(true);
        if (auto.ok) expect(auto.payload.status).toBeNull();

        const abandoned = buildUpdateSavingsGoalPayload(fields({ abandon: true }), { lockedCurrency: 'CHF' });
        expect(abandoned.ok).toBe(true);
        if (abandoned.ok) expect(abandoned.payload.status).toBe('abandonne');
    });

    it('détache le compte et construit un versement', () => {
        expect(buildUnlinkAccountPayload(existing).accountPublicId).toBeNull();
        const deposit = buildDepositUpdatePayload(existing, 200);
        expect(deposit.ok).toBe(true);
        if (deposit.ok) {
            expect(deposit.payload.currentAmount).toBe(200);
            expect(deposit.payload.status).toBeNull();
            expect(deposit.payload.name).toBe('Vacances');
        }
    });

    it('détecte un formulaire dirty', () => {
        expect(isSavingsGoalFormDirty(existing, fields())).toBe(false);
        expect(isSavingsGoalFormDirty(existing, fields({ currentAmount: '200' }))).toBe(true);
        expect(isSavingsGoalFormDirty(existing, fields({ targetDate: null }))).toBe(true);
    });
});
