import { describe, expect, it } from 'vitest';
import {
    canCancelSharedDebt,
    canDeleteSharedDebt,
    canEditSharedDebt,
    canSettleSharedDebt,
    counterpartLabel,
    formatSignedSharedDebtAmount,
    isSharedDebtOverdue,
    isValidYmd,
    matchesSharedDebtSearch,
    normalizeListQuery,
    normalizeSharedDebt,
    queryMatchesSharedDebt
} from '@/features/shared-debts/format';
import type { SharedDebt } from '@/features/shared-debts/types';

const debt: SharedDebt = {
    publicId: 'd-1',
    role: 'creditor',
    counterpart: { publicId: 'u-2', username: 'marc', firstName: 'Marc', name: 'Dupont', profilePicture: null },
    label: 'Coop',
    amount: 45,
    repaidAmount: 0,
    remainingAmount: 45,
    currency: 'CHF',
    status: 'aRembourser',
    dueDate: '2026-10-20',
    settledAt: null,
    transactionPublicId: null,
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: null
};

describe('droits', () => {
    it('créancier : tout tant que rien n’est remboursé', () => {
        expect(canEditSharedDebt(debt)).toBe(true);
        expect(canSettleSharedDebt(debt)).toBe(true);
        expect(canCancelSharedDebt(debt)).toBe(true);
        expect(canDeleteSharedDebt(debt)).toBe(true);
    });

    it('remboursement partiel : plus d’édition', () => {
        const partial = { ...debt, status: 'partiellementRemboursee' as const, repaidAmount: 10, remainingAmount: 35 };
        expect(canEditSharedDebt(partial)).toBe(false);
        expect(canSettleSharedDebt(partial)).toBe(true);
    });

    it('dette close : seule la suppression reste', () => {
        const closed = { ...debt, status: 'remboursee' as const, repaidAmount: 45, remainingAmount: 0 };
        expect(canSettleSharedDebt(closed)).toBe(false);
        expect(canCancelSharedDebt(closed)).toBe(false);
        expect(canDeleteSharedDebt(closed)).toBe(true);
    });

    it('débiteur : aucune action', () => {
        const mine = { ...debt, role: 'debtor' as const };
        expect(canEditSharedDebt(mine) || canSettleSharedDebt(mine) || canCancelSharedDebt(mine) || canDeleteSharedDebt(mine)).toBe(false);
    });
});

describe('isSharedDebtOverdue', () => {
    it('échéance passée sur dette ouverte seulement', () => {
        expect(isSharedDebtOverdue(debt, '2026-10-27')).toBe(true);
        expect(isSharedDebtOverdue(debt, '2026-10-20')).toBe(false);
        expect(isSharedDebtOverdue({ ...debt, status: 'canceled' }, '2026-10-27')).toBe(false);
        expect(isSharedDebtOverdue({ ...debt, dueDate: null }, '2026-10-27')).toBe(false);
    });
});

describe('libellés et recherche', () => {
    it('surnom > username > prénom nom', () => {
        expect(counterpartLabel(debt, new Map([['u-2', 'Marco']]))).toBe('Marco');
        expect(counterpartLabel(debt)).toBe('marc');
        expect(counterpartLabel({ counterpart: { ...debt.counterpart, username: null } })).toBe('Marc Dupont');
    });

    it('recherche sur libellé et contrepartie', () => {
        expect(matchesSharedDebtSearch(debt, 'coop')).toBe(true);
        expect(matchesSharedDebtSearch(debt, 'dupont')).toBe(true);
        expect(matchesSharedDebtSearch(debt, 'migros')).toBe(false);
    });
});

describe('montants signés', () => {
    it('+ côté créancier, vrai signe moins côté débiteur', () => {
        expect(formatSignedSharedDebtAmount(45, 'creditor', 'CHF', 'fr-CH').startsWith('+')).toBe(true);
        expect(formatSignedSharedDebtAmount(45, 'debtor', 'CHF', 'fr-CH').startsWith('−')).toBe(true);
        expect(formatSignedSharedDebtAmount(0, 'debtor', 'CHF', 'fr-CH')).not.toMatch(/^[+−]/);
    });
});

describe('queries et normalisation', () => {
    it('rôle par défaut créancier, statut inconnu ignoré', () => {
        expect(normalizeListQuery({})).toEqual({ role: 'creditor', status: null });
        expect(normalizeListQuery({ role: 'debtor', status: 'remboursee' })).toEqual({ role: 'debtor', status: 'remboursee' });
        expect(normalizeListQuery({ status: 'bogus' as never })).toEqual({ role: 'creditor', status: null });
    });

    it('filtre local par rôle et statut', () => {
        expect(queryMatchesSharedDebt({ role: 'creditor' }, debt)).toBe(true);
        expect(queryMatchesSharedDebt({ role: 'debtor' }, debt)).toBe(false);
        expect(queryMatchesSharedDebt({ status: 'remboursee' }, debt)).toBe(false);
    });

    it('sécurise montants et nullables', () => {
        const raw = {
            ...debt,
            amount: '45' as unknown as number,
            remainingAmount: undefined as unknown as number,
            dueDate: undefined as unknown as null
        };
        const normalized = normalizeSharedDebt(raw);
        expect(normalized.amount).toBe(45);
        expect(normalized.remainingAmount).toBe(45);
        expect(normalized.dueDate).toBeNull();
    });

    it('valide les dates civiles', () => {
        expect(isValidYmd('2026-02-28')).toBe(true);
        expect(isValidYmd('2026-02-30')).toBe(false);
        expect(isValidYmd('28.02.2026')).toBe(false);
    });
});
