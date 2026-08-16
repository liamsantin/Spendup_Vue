import { describe, expect, it } from 'vitest';
import { canArchiveAccount, canDeleteAccount, canEditAccount, canManageShares, canRestoreAccount, canSetPrimaryAccount } from '../rights';
import type { Account } from '../types';

function account(partial: Partial<Account>): Account {
    return {
        publicId: 'a1',
        name: 'Compte',
        type: 'courant',
        currency: 'CHF',
        initialBalance: 0,
        currentBalance: 0,
        iban: null,
        accountNumber: null,
        color: null,
        isPrimary: false,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: null,
        isOwned: true,
        myRole: 'owner',
        ...partial
    };
}

describe('accounts rights', () => {
    it('autorise édition pour owner et editor seulement', () => {
        expect(canEditAccount(account({ myRole: 'owner' }))).toBe(true);
        expect(canEditAccount(account({ myRole: 'editor' }))).toBe(true);
        expect(canEditAccount(account({ myRole: 'viewer' }))).toBe(false);
    });

    it('bloque archive/delete sur le compte primaire', () => {
        const primary = account({ isPrimary: true, myRole: 'owner' });
        expect(canArchiveAccount(primary)).toBe(false);
        expect(canDeleteAccount(primary)).toBe(false);
    });

    it('limite setPrimary et shares au owner owned', () => {
        expect(canSetPrimaryAccount(account({ myRole: 'owner', isOwned: true, isPrimary: false }))).toBe(true);
        expect(canSetPrimaryAccount(account({ myRole: 'editor', isOwned: false }))).toBe(false);
        expect(canManageShares(account({ myRole: 'owner', isOwned: true }))).toBe(true);
        expect(canManageShares(account({ myRole: 'editor', isOwned: true }))).toBe(false);
    });

    it('autorise restore uniquement sur comptes inactifs éditables', () => {
        expect(canRestoreAccount(account({ isActive: false, myRole: 'editor' }))).toBe(true);
        expect(canRestoreAccount(account({ isActive: true, myRole: 'owner' }))).toBe(false);
        expect(canRestoreAccount(account({ isActive: false, myRole: 'viewer' }))).toBe(false);
    });
});
