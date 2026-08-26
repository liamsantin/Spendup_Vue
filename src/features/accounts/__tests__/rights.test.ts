import { describe, expect, it } from 'vitest';
import {
    canArchiveAccount,
    canCreateAccount,
    canDeleteAccount,
    canEditAccount,
    canEditAccountOwnerFields,
    canLeaveAccountShare,
    canManageShares,
    canRestoreAccount,
    canSetPrimaryAccount,
    canViewAccount,
    canWriteBalanceSnapshots,
    isSharedAccount,
    sanitizeUpdateAccountPayload
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
        hiddenFields: [],
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

    it('autorise édition pour owner et editor actifs seulement', () => {
        expect(canEditAccount(account({ myRole: 'owner' }))).toBe(true);
        expect(canEditAccount(account({ myRole: 'editor' }))).toBe(true);
        expect(canEditAccount(account({ myRole: 'viewer' }))).toBe(false);
        expect(canEditAccount(account({ myRole: 'owner', isActive: false }))).toBe(false);
        expect(canEditAccount(account({ myRole: 'editor', isActive: false }))).toBe(false);
    });

    it('limite les champs structurants du compte au owner', () => {
        expect(canEditAccountOwnerFields(account({ myRole: 'owner' }))).toBe(true);
        expect(canEditAccountOwnerFields(account({ myRole: 'editor' }))).toBe(false);
        expect(canEditAccountOwnerFields(account({ myRole: 'viewer' }))).toBe(false);
    });

    it('sanitizeUpdateAccountPayload omet les champs owner pour un editor', () => {
        const full = {
            name: 'X',
            type: 'epargne' as const,
            currency: 'EUR' as const,
            initialBalance: 999,
            iban: 'CH99',
            accountNumber: '42',
            color: '#111',
            isPrimary: true
        };
        expect(sanitizeUpdateAccountPayload(account({ myRole: 'owner' }), full)).toEqual(full);
        expect(sanitizeUpdateAccountPayload(account({ myRole: 'editor' }), full)).toEqual({
            name: 'X',
            accountNumber: '42',
            color: '#111'
        });
    });

    it('autorise create/delete relevés pour owner et editor actifs seulement', () => {
        expect(canWriteBalanceSnapshots(account({ myRole: 'owner' }))).toBe(true);
        expect(canWriteBalanceSnapshots(account({ myRole: 'editor' }))).toBe(true);
        expect(canWriteBalanceSnapshots(account({ myRole: 'viewer' }))).toBe(false);
        expect(canWriteBalanceSnapshots(account({ myRole: 'owner', isActive: false }))).toBe(false);
        expect(canWriteBalanceSnapshots(account({ myRole: 'editor', isActive: false }))).toBe(false);
    });

    it('bloque archive/delete sur le compte primaire', () => {
        const primary = account({ isPrimary: true, myRole: 'owner' });
        expect(canArchiveAccount(primary)).toBe(false);
        expect(canDeleteAccount(primary)).toBe(false);
    });

    it('autorise archive seulement pour owner owned non-primaire actif', () => {
        expect(canArchiveAccount(account({ myRole: 'owner', isOwned: true, isPrimary: false, isActive: true }))).toBe(true);
        expect(canArchiveAccount(account({ myRole: 'editor', isOwned: false, isPrimary: false, isActive: true }))).toBe(false);
        expect(canArchiveAccount(account({ myRole: 'viewer', isPrimary: false, isActive: true }))).toBe(false);
        expect(canArchiveAccount(account({ myRole: 'owner', isActive: false }))).toBe(false);
    });

    it('refuse delete si non owned', () => {
        expect(canDeleteAccount(account({ isOwned: false, myRole: 'owner', isPrimary: false }))).toBe(false);
        expect(canDeleteAccount(account({ isOwned: true, myRole: 'owner', isPrimary: false }))).toBe(true);
        expect(canDeleteAccount(account({ isOwned: true, myRole: 'editor', isPrimary: false }))).toBe(false);
    });

    it('limite setPrimary et shares au owner owned actif', () => {
        expect(canSetPrimaryAccount(account({ myRole: 'owner', isOwned: true, isPrimary: false }))).toBe(true);
        expect(canSetPrimaryAccount(account({ myRole: 'editor', isOwned: false }))).toBe(false);
        expect(canManageShares(account({ myRole: 'owner', isOwned: true }))).toBe(true);
        expect(canManageShares(account({ myRole: 'editor', isOwned: true }))).toBe(false);
        expect(canManageShares(account({ myRole: 'owner', isOwned: true, isActive: false }))).toBe(false);
    });

    it('autorise restore uniquement pour owner owned inactif', () => {
        expect(canRestoreAccount(account({ isOwned: true, isActive: false, myRole: 'owner' }))).toBe(true);
        expect(canRestoreAccount(account({ isOwned: false, isActive: false, myRole: 'editor' }))).toBe(false);
        expect(canRestoreAccount(account({ isActive: true, myRole: 'owner' }))).toBe(false);
        expect(canRestoreAccount(account({ isActive: false, myRole: 'viewer' }))).toBe(false);
    });

    it('détecte un compte partagé pour l’affichage auteur des relevés', () => {
        expect(isSharedAccount(account({ isOwned: false }))).toBe(true);
        expect(isSharedAccount(account({ isOwned: true }), [])).toBe(false);
        expect(isSharedAccount(account({ isOwned: true }), [{ role: 'pending' }])).toBe(false);
        expect(isSharedAccount(account({ isOwned: true }), [{ role: 'editor' }])).toBe(true);
        expect(isSharedAccount(account({ isOwned: true }), [{ role: 'viewer' }])).toBe(true);
    });

    it('autorise leave uniquement pour destinataire viewer/editor', () => {
        expect(canLeaveAccountShare(account({ isOwned: false, myRole: 'viewer' }))).toBe(true);
        expect(canLeaveAccountShare(account({ isOwned: false, myRole: 'editor' }))).toBe(true);
        expect(canLeaveAccountShare(account({ isOwned: true, myRole: 'owner' }))).toBe(false);
        expect(canLeaveAccountShare(account({ isOwned: false, myRole: 'owner' }))).toBe(false);
    });

    /**
     * Matrice QA §4 — actions UI selon myRole.
     * Voir checklist comptes : owner / editor / viewer.
     */
    it('respecte la matrice QA des rôles (checklist §4)', () => {
        const owner = account({ myRole: 'owner', isOwned: true, isPrimary: false, isActive: true });
        const editor = account({ myRole: 'editor', isOwned: false, isPrimary: false, isActive: true });
        const viewer = account({ myRole: 'viewer', isOwned: false, isPrimary: false, isActive: true });

        expect([owner, editor, viewer].every(canViewAccount)).toBe(true);

        expect(canEditAccount(owner)).toBe(true);
        expect(canEditAccount(editor)).toBe(true);
        expect(canEditAccount(viewer)).toBe(false);

        expect(canEditAccountOwnerFields(owner)).toBe(true);
        expect(canEditAccountOwnerFields(editor)).toBe(false);
        expect(canEditAccountOwnerFields(viewer)).toBe(false);

        expect(canArchiveAccount(owner)).toBe(true);
        expect(canArchiveAccount(editor)).toBe(false);
        expect(canArchiveAccount(viewer)).toBe(false);
        expect(canRestoreAccount({ ...owner, isActive: false })).toBe(true);
        expect(canRestoreAccount({ ...editor, isActive: false })).toBe(false);
        expect(canRestoreAccount({ ...viewer, isActive: false })).toBe(false);

        expect(canDeleteAccount(owner)).toBe(true);
        expect(canDeleteAccount(editor)).toBe(false);
        expect(canDeleteAccount(viewer)).toBe(false);
        expect(canSetPrimaryAccount(owner)).toBe(true);
        expect(canSetPrimaryAccount(editor)).toBe(false);
        expect(canManageShares(owner)).toBe(true);
        expect(canManageShares(editor)).toBe(false);
        expect(canManageShares(viewer)).toBe(false);

        expect(canWriteBalanceSnapshots(owner)).toBe(true);
        expect(canWriteBalanceSnapshots(editor)).toBe(true);
        expect(canWriteBalanceSnapshots(viewer)).toBe(false);

        expect(canLeaveAccountShare(owner)).toBe(false);
        expect(canLeaveAccountShare(editor)).toBe(true);
        expect(canLeaveAccountShare(viewer)).toBe(true);
    });

    it('compte archivé : lecture seule (édition / share / relevés bloqués, restore OK)', () => {
        const archivedOwner = account({ myRole: 'owner', isOwned: true, isPrimary: false, isActive: false });
        const archivedEditor = account({ myRole: 'editor', isOwned: false, isPrimary: false, isActive: false });

        expect(canViewAccount(archivedOwner)).toBe(true);
        expect(canEditAccount(archivedOwner)).toBe(false);
        expect(canEditAccount(archivedEditor)).toBe(false);
        expect(canWriteBalanceSnapshots(archivedOwner)).toBe(false);
        expect(canWriteBalanceSnapshots(archivedEditor)).toBe(false);
        expect(canManageShares(archivedOwner)).toBe(false);
        expect(canArchiveAccount(archivedOwner)).toBe(false);
        expect(canRestoreAccount(archivedOwner)).toBe(true);
        expect(canRestoreAccount(archivedEditor)).toBe(false);
        expect(canDeleteAccount(archivedOwner)).toBe(true);
    });
});
