import { describe, expect, it } from 'vitest';
import {
    canArchiveAccount,
    canCreateAccount,
    canDeleteAccount,
    canEditAccount,
    canEditAccountOwnerFields,
    canManageShares,
    canRestoreAccount,
    canSetPrimaryAccount,
    canViewAccount,
    canWriteBalanceSnapshots
} from '@/features/accounts/rights';
import type { Account } from '@/features/accounts/types';

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
    it('autorise view pour owner, editor et viewer', () => {
        expect(canViewAccount(account({ myRole: 'owner' }))).toBe(true);
        expect(canViewAccount(account({ myRole: 'editor' }))).toBe(true);
        expect(canViewAccount(account({ myRole: 'viewer' }))).toBe(true);
    });

    it('autorise createAccount (toujours true côté UI)', () => {
        expect(canCreateAccount()).toBe(true);
    });

    it('autorise édition pour owner et editor seulement', () => {
        expect(canEditAccount(account({ myRole: 'owner' }))).toBe(true);
        expect(canEditAccount(account({ myRole: 'editor' }))).toBe(true);
        expect(canEditAccount(account({ myRole: 'viewer' }))).toBe(false);
    });

    it('limite les champs structurants du compte au owner', () => {
        expect(canEditAccountOwnerFields(account({ myRole: 'owner' }))).toBe(true);
        expect(canEditAccountOwnerFields(account({ myRole: 'editor' }))).toBe(false);
        expect(canEditAccountOwnerFields(account({ myRole: 'viewer' }))).toBe(false);
    });

    it('autorise create/delete relevés pour owner et editor seulement', () => {
        expect(canWriteBalanceSnapshots(account({ myRole: 'owner' }))).toBe(true);
        expect(canWriteBalanceSnapshots(account({ myRole: 'editor' }))).toBe(true);
        expect(canWriteBalanceSnapshots(account({ myRole: 'viewer' }))).toBe(false);
    });

    it('bloque archive/delete sur le compte primaire', () => {
        const primary = account({ isPrimary: true, myRole: 'owner' });
        expect(canArchiveAccount(primary)).toBe(false);
        expect(canDeleteAccount(primary)).toBe(false);
    });

    it('autorise archive pour editor non-primaire actif', () => {
        expect(canArchiveAccount(account({ myRole: 'editor', isPrimary: false, isActive: true }))).toBe(true);
        expect(canArchiveAccount(account({ myRole: 'viewer', isPrimary: false, isActive: true }))).toBe(false);
        expect(canArchiveAccount(account({ myRole: 'owner', isActive: false }))).toBe(false);
    });

    it('refuse delete si non owned', () => {
        expect(canDeleteAccount(account({ isOwned: false, myRole: 'owner', isPrimary: false }))).toBe(false);
        expect(canDeleteAccount(account({ isOwned: true, myRole: 'owner', isPrimary: false }))).toBe(true);
        expect(canDeleteAccount(account({ isOwned: true, myRole: 'editor', isPrimary: false }))).toBe(false);
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
