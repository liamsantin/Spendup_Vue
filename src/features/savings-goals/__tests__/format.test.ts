import { describe, expect, it } from 'vitest';
import {
    canLinkSavingsGoalAccount,
    isLinkedSavingsGoalAccountError,
    isSavingsGoalCurrency,
    isSavingsGoalStatus,
    isValidYmd,
    normalizeSavingsGoal,
    savingsGoalBarWidth,
    savingsGoalProgressTone
} from '@/features/savings-goals/format';
import type { SavingsGoal } from '@/features/savings-goals/types';

function goal(partial: Partial<SavingsGoal> = {}): SavingsGoal {
    return {
        publicId: 'g-1',
        name: 'Vacances',
        targetAmount: 2000,
        openingAmount: 150,
        contributedAmount: 0,
        currentAmount: 150,
        remainingAmount: 1850,
        percentReached: 7.5,
        currency: 'CHF',
        targetDate: '2026-12-01',
        projectedDate: null,
        status: 'active',
        isOverdue: false,
        accountPublicId: null,
        contributions: [],
        createdAt: '2026-09-23T18:00:00Z',
        updatedAt: null,
        ...partial
    };
}

describe('savings-goals format', () => {
    it('valide statut, devise et date', () => {
        expect(isSavingsGoalStatus('active')).toBe(true);
        expect(isSavingsGoalStatus('atteint')).toBe(true);
        expect(isSavingsGoalStatus('paused')).toBe(false);
        expect(isSavingsGoalCurrency('CHF')).toBe(true);
        expect(isSavingsGoalCurrency('JPY')).toBe(false);
        expect(isValidYmd('2026-12-01')).toBe(true);
        expect(isValidYmd('2026-02-30')).toBe(false);
    });

    it('n’autorise que les comptes actifs possédés', () => {
        expect(canLinkSavingsGoalAccount({ isOwned: true, isActive: true, myRole: 'owner' })).toBe(true);
        expect(canLinkSavingsGoalAccount({ isOwned: false, isActive: true, myRole: 'editor' })).toBe(false);
        expect(canLinkSavingsGoalAccount({ isOwned: true, isActive: false, myRole: 'owner' })).toBe(false);
    });

    it('borne la barre à 100 sans plafonner le pourcentage métier', () => {
        expect(savingsGoalBarWidth(goal({ percentReached: 7.5 }))).toBe(7.5);
        expect(savingsGoalBarWidth(goal({ percentReached: 150 }))).toBe(100);
        expect(savingsGoalBarWidth(goal({ percentReached: -10 }))).toBe(0);
    });

    it('calibre le ton : abandonné, atteint, en retard, en cours', () => {
        expect(savingsGoalProgressTone(goal({ status: 'abandonne' }))).toBe('idle');
        expect(savingsGoalProgressTone(goal({ status: 'atteint', percentReached: 100 }))).toBe('done');
        expect(savingsGoalProgressTone(goal({ status: 'active', isOverdue: true }))).toBe('warn');
        expect(savingsGoalProgressTone(goal({ status: 'active', percentReached: 40 }))).toBe('ok');
        expect(savingsGoalProgressTone(goal({ status: 'active', percentReached: 120 }))).toBe('done');
    });

    it('reconnaît le 400 compte lié', () => {
        expect(
            isLinkedSavingsGoalAccountError({
                status: 400,
                message: "Impossible de supprimer ou d'archiver un compte lié à un objectif d'épargne. Déliez-le d'abord."
            })
        ).toBe(true);
        expect(isLinkedSavingsGoalAccountError({ status: 400, message: 'Montant invalide' })).toBe(false);
        expect(isLinkedSavingsGoalAccountError({ status: 404, message: "objectif d'épargne" })).toBe(false);
    });

    it('normalise les contributions absentes et les montants calculés', () => {
        const raw = goal({ contributions: undefined as unknown as [] });
        const normalized = normalizeSavingsGoal(raw);
        expect(normalized.contributions).toEqual([]);
        expect(normalized.projectedDate).toBeNull();
        expect(normalized.openingAmount).toBe(150);
    });
});
