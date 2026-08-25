/**
 * Suite unitaire alignée sur la checklist QA frontend — Comptes.
 * Couvre le comportement front (store, droits, payloads, realtime) avec API mockée.
 * Les validations métier serveur (IBAN, doublons, 401 réel) sont simulées via ApiError.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { ApiError } from '@/features/auth/api';
import { ACCOUNT_TYPES } from '@/features/accounts/types';
import type { Account, AccountBalanceSnapshot, IncomingAccountShare } from '@/features/accounts/types';

const api = vi.hoisted(() => ({
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setPrimary: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
    remove: vi.fn(),
    listShares: vi.fn(),
    inviteShare: vi.fn(),
    updateShareRole: vi.fn(),
    revokeShare: vi.fn(),
    listIncomingShares: vi.fn(),
    acceptShare: vi.fn(),
    refuseShare: vi.fn(),
    listBalanceSnapshots: vi.fn(),
    createBalanceSnapshot: vi.fn(),
    deleteBalanceSnapshot: vi.fn()
}));

const subscribeToAccountShareNotifications = vi.fn();
const subscribeToFriendshipChanged = vi.fn();

vi.mock('../api', () => ({
    accountsApi: {
        list: (...args: unknown[]) => api.list(...args),
        get: (...args: unknown[]) => api.get(...args),
        create: (...args: unknown[]) => api.create(...args),
        update: (...args: unknown[]) => api.update(...args),
        setPrimary: (...args: unknown[]) => api.setPrimary(...args),
        archive: (...args: unknown[]) => api.archive(...args),
        restore: (...args: unknown[]) => api.restore(...args),
        remove: (...args: unknown[]) => api.remove(...args),
        listShares: (...args: unknown[]) => api.listShares(...args),
        inviteShare: (...args: unknown[]) => api.inviteShare(...args),
        updateShareRole: (...args: unknown[]) => api.updateShareRole(...args),
        revokeShare: (...args: unknown[]) => api.revokeShare(...args),
        listIncomingShares: (...args: unknown[]) => api.listIncomingShares(...args),
        acceptShare: (...args: unknown[]) => api.acceptShare(...args),
        refuseShare: (...args: unknown[]) => api.refuseShare(...args),
        listBalanceSnapshots: (...args: unknown[]) => api.listBalanceSnapshots(...args),
        createBalanceSnapshot: (...args: unknown[]) => api.createBalanceSnapshot(...args),
        deleteBalanceSnapshot: (...args: unknown[]) => api.deleteBalanceSnapshot(...args)
    }
}));

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => ({
        subscribeToAccountShareNotifications,
        subscribeToFriendshipChanged
    })
}));

import { useAccountsStore } from '@/features/accounts/stores/accounts-store';

function account(partial: Partial<Account> = {}): Account {
    return {
        publicId: 'acc-1',
        name: 'Courant',
        type: 'courant',
        currency: 'CHF',
        initialBalance: 100,
        currentBalance: 100,
        iban: null,
        accountNumber: null,
        color: null,
        isPrimary: true,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: null,
        isOwned: true,
        myRole: 'owner',
        ...partial
    };
}

function incoming(partial: Partial<IncomingAccountShare> = {}): IncomingAccountShare {
    return {
        publicId: 'share-1',
        accountPublicId: 'acc-epargne',
        accountName: 'Épargne',
        accountType: 'epargne',
        currency: 'CHF',
        ownerPublicId: 'user-a',
        ownerDisplayName: 'Alice',
        ownerPhotoUrl: null,
        role: 'pending',
        invitedRole: 'editor',
        createdAt: '2026-01-02T00:00:00Z',
        ...partial
    };
}

function snapshot(partial: Partial<AccountBalanceSnapshot> = {}): AccountBalanceSnapshot {
    return {
        publicId: 'snap-1',
        accountPublicId: 'acc-1',
        balance: 250,
        snapshotAt: '2026-08-23T12:00:00.000Z',
        source: 'manual',
        note: null,
        createdAt: '2026-08-23T12:00:00.000Z',
        updatedAt: null,
        createdByUserPublicId: null,
        createdByDisplayName: null,
        createdByPhotoUrl: null,
        ...partial
    };
}

describe('QA checklist — Comptes (frontend unitaire)', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        subscribeToAccountShareNotifications.mockReset().mockReturnValue(() => undefined);
        subscribeToFriendshipChanged.mockReset().mockReturnValue(() => undefined);
    });

    describe('§1 Liste & détail', () => {
        it('401 sur GET /api/accounts → message d’erreur store (non authentifié)', async () => {
            api.list.mockRejectedValue(new ApiError('Non authentifié', 401));

            const store = useAccountsStore();
            await expect(store.loadAccounts()).rejects.toMatchObject({ status: 401 });
            expect(store.error).toBe('Non authentifié');
            expect(store.accounts).toHaveLength(0);
        });

        it('après création : compte en liste avec isOwned/myRole/isPrimary et currentBalance = initial', async () => {
            const created = account({
                publicId: 'acc-new',
                name: 'Premier',
                isOwned: true,
                myRole: 'owner',
                isPrimary: true,
                initialBalance: 42,
                currentBalance: 42
            });
            api.create.mockResolvedValue(created);

            const store = useAccountsStore();
            const result = await store.createAccount({
                name: 'Premier',
                type: 'courant',
                initialBalance: 42
            });

            expect(result.isOwned).toBe(true);
            expect(result.myRole).toBe('owner');
            expect(result.isPrimary).toBe(true);
            expect(result.currentBalance).toBe(result.initialBalance);
            expect(store.ownedAccounts).toHaveLength(1);
            expect(store.ownedAccounts[0]?.publicId).toBe('acc-new');
        });

        it('publicId inconnu → 404 : sélection vidée, compte retiré, pas de crash', async () => {
            api.list.mockResolvedValue({ items: [account()] });
            api.get.mockRejectedValue(new ApiError('Compte introuvable', 404));

            const store = useAccountsStore();
            await store.loadAccounts();
            await expect(store.loadAccountDetail('acc-unknown')).rejects.toMatchObject({ status: 404 });

            expect(store.error).toBe('Compte introuvable');
            expect(store.selectedAccount).toBeNull();
            expect(store.accounts.some((a) => a.publicId === 'acc-unknown')).toBe(false);
        });

        it('compte soft-deleted : 404 détail + retiré au prochain fetch liste', async () => {
            const secondary = account({ publicId: 'acc-2', name: 'Épargne', isPrimary: false });
            api.list.mockResolvedValueOnce({ items: [account(), secondary] });
            api.get.mockRejectedValue(new ApiError('Compte introuvable', 404));

            const store = useAccountsStore();
            await store.loadAccounts();
            await expect(store.loadAccountDetail('acc-2')).rejects.toMatchObject({ status: 404 });
            expect(store.accounts.some((a) => a.publicId === 'acc-2')).toBe(false);

            api.list.mockResolvedValueOnce({ items: [account()] });
            await store.loadAccounts(true);
            expect(store.accounts.map((a) => a.publicId)).toEqual(['acc-1']);
        });
    });

    describe('§2 Création & édition (owner)', () => {
        it('expose tous les types de compte acceptés', () => {
            expect(ACCOUNT_TYPES).toEqual([
                'courant',
                'epargne',
                'credit',
                'cash',
                'investissement',
                'crypto',
                'other'
            ]);
        });

        it('création sans currency dans le payload (défaut settings / CHF côté form)', async () => {
            api.create.mockResolvedValue(account({ publicId: 'acc-chf', currency: 'CHF' }));

            const store = useAccountsStore();
            await store.createAccount({
                name: 'Cash',
                type: 'cash',
                initialBalance: 0
                // currency omise volontairement
            });

            expect(api.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Cash',
                    type: 'cash',
                    initialBalance: 0
                })
            );
            expect(api.create.mock.calls[0]?.[0]).not.toHaveProperty('currency');
        });

        it('IBAN invalide → message métier exposé dans store.error', async () => {
            api.create.mockRejectedValue(new ApiError('IBAN invalide', 400, 'INVALID_IBAN'));

            const store = useAccountsStore();
            await expect(
                store.createAccount({ name: 'X', type: 'courant', initialBalance: 0, iban: 'XX' })
            ).rejects.toMatchObject({ message: 'IBAN invalide' });
            expect(store.error).toBe('IBAN invalide');
        });

        it('IBAN déjà utilisé / doublon nom+type → refus métier affiché', async () => {
            api.create.mockRejectedValue(new ApiError('Un compte avec ce nom et ce type existe déjà', 400));

            const store = useAccountsStore();
            await expect(
                store.createAccount({ name: 'Courant', type: 'courant', initialBalance: 0 })
            ).rejects.toBeTruthy();
            expect(store.error).toContain('nom');
        });

        it('PUT owner envoie null pour vider iban / accountNumber / color', async () => {
            api.list.mockResolvedValue({ items: [account({ iban: 'CH00', accountNumber: '1', color: '#fff' })] });
            api.update.mockResolvedValue(
                account({ iban: null, accountNumber: null, color: null, isPrimary: true })
            );

            const store = useAccountsStore();
            await store.loadAccounts();
            await store.updateAccount('acc-1', {
                name: 'Courant',
                type: 'courant',
                currency: 'CHF',
                initialBalance: 100,
                iban: null,
                accountNumber: null,
                color: null,
                isPrimary: true
            });

            expect(api.update).toHaveBeenCalledWith(
                'acc-1',
                expect.objectContaining({ iban: null, accountNumber: null, color: null })
            );
            expect(store.accounts[0]?.iban).toBeNull();
            expect(store.accounts[0]?.accountNumber).toBeNull();
            expect(store.accounts[0]?.color).toBeNull();
        });

        it('impossible de retirer le primaire sans en promouvoir un autre → erreur métier', async () => {
            api.list.mockResolvedValue({ items: [account()] });
            api.update.mockRejectedValue(
                new ApiError('Impossible de retirer le statut primaire sans en promouvoir un autre', 400)
            );

            const store = useAccountsStore();
            await store.loadAccounts();
            await expect(
                store.updateAccount('acc-1', {
                    name: 'Courant',
                    type: 'courant',
                    currency: 'CHF',
                    initialBalance: 100,
                    iban: null,
                    accountNumber: null,
                    color: null,
                    isPrimary: false
                })
            ).rejects.toMatchObject({ status: 400 });
            expect(store.error).toMatch(/primaire/i);
        });

        it('un seul primaire après setPrimary ou PUT isPrimary: true', async () => {
            const secondary = account({ publicId: 'acc-2', name: 'Épargne', isPrimary: false });
            api.list.mockResolvedValue({ items: [account(), secondary] });
            api.setPrimary.mockResolvedValue({ ...secondary, isPrimary: true });

            const store = useAccountsStore();
            await store.loadAccounts();
            await store.setPrimary('acc-2');

            expect(store.accounts.filter((a) => a.isOwned && a.isPrimary)).toHaveLength(1);
            expect(store.accounts.find((a) => a.publicId === 'acc-2')?.isPrimary).toBe(true);
            expect(store.accounts.find((a) => a.publicId === 'acc-1')?.isPrimary).toBe(false);
        });
    });

    describe('§3 Archive / restore / delete', () => {
        it('archive d’un non-primaire → isActive false, toujours en liste', async () => {
            const secondary = account({ publicId: 'acc-2', name: 'Épargne', isPrimary: false });
            api.list.mockResolvedValue({ items: [account(), secondary] });
            api.archive.mockResolvedValue({ ...secondary, isActive: false });

            const store = useAccountsStore();
            await store.loadAccounts();
            await store.archiveAccount('acc-2');

            expect(store.accounts.some((a) => a.publicId === 'acc-2')).toBe(true);
            expect(store.accounts.find((a) => a.publicId === 'acc-2')?.isActive).toBe(false);
            expect(store.archivedOwnedAccounts).toHaveLength(1);
        });

        it('soft-delete sans mouvements → disparaît de la liste', async () => {
            const secondary = account({ publicId: 'acc-2', name: 'Épargne', isPrimary: false });
            api.list.mockResolvedValue({ items: [account(), secondary] });
            api.remove.mockResolvedValue(undefined);

            const store = useAccountsStore();
            await store.loadAccounts();
            await store.deleteAccount('acc-2');

            expect(store.accounts.some((a) => a.publicId === 'acc-2')).toBe(false);
        });

        it('soft-delete bloqué s’il reste des mouvements → message métier', async () => {
            const secondary = account({ publicId: 'acc-2', name: 'Épargne', isPrimary: false });
            api.list.mockResolvedValue({ items: [account(), secondary] });
            api.remove.mockRejectedValue(
                new ApiError('Impossible de supprimer : des mouvements existent. Archivez le compte.', 400)
            );

            const store = useAccountsStore();
            await store.loadAccounts();
            await expect(store.deleteAccount('acc-2')).rejects.toBeTruthy();
            expect(store.error).toMatch(/mouvements|Archivez/i);
            expect(store.accounts.some((a) => a.publicId === 'acc-2')).toBe(true);
        });
    });

    describe('§4 Rôles — erreurs métier editor / viewer', () => {
        it('editor qui tente de changer solde initial → erreur métier affichée', async () => {
            const shared = account({
                publicId: 'acc-shared',
                isOwned: false,
                myRole: 'editor',
                isPrimary: false
            });
            api.list.mockResolvedValue({ items: [shared] });
            api.update.mockRejectedValue(
                new ApiError('Seuls les champs name, color et accountNumber sont modifiables', 400)
            );

            const store = useAccountsStore();
            await store.loadAccounts();
            await expect(
                store.updateAccount('acc-shared', {
                    name: 'Renommé',
                    type: 'epargne',
                    currency: 'EUR',
                    initialBalance: 999,
                    iban: 'CH99',
                    accountNumber: null,
                    color: null,
                    isPrimary: false
                })
            ).rejects.toBeTruthy();
            expect(store.error).toMatch(/name|color|accountNumber|modifiables/i);
        });

        it('viewer qui tente PUT / archive → refus exposé, liste inchangée', async () => {
            const shared = account({
                publicId: 'acc-shared',
                isOwned: false,
                myRole: 'viewer',
                isPrimary: false
            });
            api.list.mockResolvedValue({ items: [shared] });
            api.update.mockRejectedValue(new ApiError('Compte introuvable', 404));
            api.archive.mockRejectedValue(new ApiError('Compte introuvable', 404));

            const store = useAccountsStore();
            await store.loadAccounts();

            await expect(
                store.updateAccount('acc-shared', {
                    name: 'X',
                    type: 'courant',
                    currency: 'CHF',
                    initialBalance: 0,
                    iban: null,
                    accountNumber: null,
                    color: null,
                    isPrimary: false
                })
            ).rejects.toMatchObject({ status: 404 });

            await expect(store.archiveAccount('acc-shared')).rejects.toMatchObject({ status: 404 });
            expect(store.accounts).toHaveLength(1);
        });
    });

    describe('§5 Relevés de solde', () => {
        it('créer un relevé UTC → en tête de liste, source manual', async () => {
            api.list.mockResolvedValue({ items: [account()] });
            api.get.mockResolvedValue(account());
            api.listBalanceSnapshots.mockResolvedValue({
                items: [snapshot({ publicId: 'snap-old', snapshotAt: '2026-01-01T12:00:00.000Z' })]
            });
            api.createBalanceSnapshot.mockResolvedValue(
                snapshot({
                    publicId: 'snap-new',
                    snapshotAt: '2026-08-23T12:00:00.000Z',
                    source: 'manual'
                })
            );

            const store = useAccountsStore();
            await store.loadAccounts();
            await store.loadAccountDetail('acc-1');
            await store.loadBalanceSnapshots('acc-1');

            await store.createBalanceSnapshot('acc-1', {
                balance: 250,
                snapshotAt: '2026-08-23T12:00:00.000Z'
            });

            expect(api.createBalanceSnapshot).toHaveBeenCalledWith(
                'acc-1',
                expect.objectContaining({ snapshotAt: '2026-08-23T12:00:00.000Z' })
            );
            expect(store.balanceSnapshots[0]?.publicId).toBe('snap-new');
            expect(store.balanceSnapshots[0]?.source).toBe('manual');
            expect(store.balanceSnapshots).toHaveLength(2);
        });

        it('date non-UTC refusée → message métier clair', async () => {
            api.createBalanceSnapshot.mockRejectedValue(
                new ApiError('snapshotAt doit être une date UTC (suffixe Z)', 400)
            );

            const store = useAccountsStore();
            await expect(
                store.createBalanceSnapshot('acc-1', {
                    balance: 10,
                    snapshotAt: '2026-08-23T12:00:00'
                })
            ).rejects.toBeTruthy();
            expect(store.error).toMatch(/UTC|Z/i);
        });

        it('soft-delete d’un relevé → disparaît de la liste', async () => {
            api.list.mockResolvedValue({ items: [account()] });
            api.get.mockResolvedValue(account());
            api.listBalanceSnapshots.mockResolvedValue({ items: [snapshot()] });
            api.deleteBalanceSnapshot.mockResolvedValue(undefined);

            const store = useAccountsStore();
            await store.loadAccounts();
            await store.loadAccountDetail('acc-1');
            await store.loadBalanceSnapshots('acc-1');
            await store.deleteBalanceSnapshot('acc-1', 'snap-1');

            expect(store.balanceSnapshots).toHaveLength(0);
        });

        it('viewer : create relevé refusé', async () => {
            api.createBalanceSnapshot.mockRejectedValue(new ApiError('Compte introuvable', 404));

            const store = useAccountsStore();
            await expect(
                store.createBalanceSnapshot('acc-shared', {
                    balance: 1,
                    snapshotAt: '2026-08-23T12:00:00.000Z'
                })
            ).rejects.toMatchObject({ status: 404 });
        });
    });

    describe('§6 Partage — invite / accept / refuse', () => {
        it('compte pending n’apparaît pas dans la liste du destinataire', async () => {
            api.list.mockResolvedValue({ items: [account()] });
            api.listIncomingShares.mockResolvedValue({ items: [incoming()] });

            const store = useAccountsStore();
            await store.loadAccounts();
            await store.loadIncoming();

            expect(store.incomingCount).toBe(1);
            expect(store.accounts.some((a) => a.publicId === 'acc-epargne')).toBe(false);
            expect(store.sharedAccounts).toHaveLength(0);
        });

        it('invite non-ami / soi-même / double pending → message métier', async () => {
            api.inviteShare.mockRejectedValue(new ApiError('Le destinataire doit être un ami accepté', 400));

            const store = useAccountsStore();
            await expect(store.inviteShare('acc-1', 'stranger', 'viewer')).rejects.toBeTruthy();
            expect(store.error).toMatch(/ami/i);
        });

        it('accept → compte en liste isOwned false + myRole invité ; invite retirée', async () => {
            const invite = incoming({ invitedRole: 'editor' });
            api.listIncomingShares.mockResolvedValue({ items: [invite] });
            api.acceptShare.mockResolvedValue({});
            api.list.mockResolvedValue({
                items: [
                    account({
                        publicId: 'acc-epargne',
                        name: 'Épargne',
                        type: 'epargne',
                        isOwned: false,
                        myRole: 'editor',
                        isPrimary: false
                    })
                ]
            });

            const store = useAccountsStore();
            await store.loadIncoming();
            await store.acceptShare('share-1');

            expect(store.incomingCount).toBe(0);
            expect(store.sharedAccounts).toHaveLength(1);
            expect(store.sharedAccounts[0]?.isOwned).toBe(false);
            expect(store.sharedAccounts[0]?.myRole).toBe('editor');
        });

        it('refuse → invite disparue, pas d’accès compte', async () => {
            api.listIncomingShares.mockResolvedValue({ items: [incoming()] });
            api.refuseShare.mockResolvedValue(undefined);
            api.list.mockResolvedValue({ items: [] });

            const store = useAccountsStore();
            await store.loadIncoming();
            await store.refuseShare('share-1');

            expect(store.incomingCount).toBe(0);
            expect(store.accounts).toHaveLength(0);
        });

        it('accept après rupture d’amitié → message métier, pas un crash', async () => {
            api.listIncomingShares.mockResolvedValue({ items: [incoming()] });
            api.acceptShare.mockRejectedValue(new ApiError('Le destinataire doit être un ami accepté', 400));

            const store = useAccountsStore();
            await store.loadIncoming();
            // Le refresh incoming post-échec clear `error` — le message métier reste sur le reject.
            await expect(store.acceptShare('share-1')).rejects.toMatchObject({
                message: expect.stringMatching(/ami accepté/i)
            });
        });
    });

    describe('§7 Partage — manage', () => {
        it('liste shares owner : pending + actifs', async () => {
            api.list.mockResolvedValue({ items: [account()] });
            api.get.mockResolvedValue(account());
            api.listShares.mockResolvedValue({
                items: [
                    {
                        publicId: 's-pending',
                        userPublicId: 'u2',
                        displayName: 'Bob',
                        photoUrl: null,
                        role: 'pending',
                        invitedRole: 'viewer',
                        createdAt: '2026-01-01T00:00:00Z',
                        updatedAt: '2026-01-01T00:00:00Z'
                    },
                    {
                        publicId: 's-active',
                        userPublicId: 'u3',
                        displayName: 'Eve',
                        photoUrl: null,
                        role: 'editor',
                        invitedRole: null,
                        createdAt: '2026-01-01T00:00:00Z',
                        updatedAt: '2026-01-01T00:00:00Z'
                    }
                ]
            });

            const store = useAccountsStore();
            await store.loadAccounts();
            await store.loadAccountDetail('acc-1');
            await store.loadShares('acc-1');

            expect(store.shares).toHaveLength(2);
            expect(store.shares.map((s) => s.role).sort()).toEqual(['editor', 'pending']);
        });

        it('destinataire ne peut pas lister les shares → 404', async () => {
            api.listShares.mockRejectedValue(new ApiError('Compte introuvable', 404));

            const store = useAccountsStore();
            await expect(store.loadShares('acc-other')).rejects.toMatchObject({ status: 404 });
            expect(store.error).toBe('Compte introuvable');
        });

        it('changer rôle actif viewer ↔ editor ; échec sur pending', async () => {
            api.list.mockResolvedValue({ items: [account()] });
            api.get.mockResolvedValue(account());
            api.listShares.mockResolvedValue({
                items: [
                    {
                        publicId: 's1',
                        userPublicId: 'u2',
                        displayName: 'Bob',
                        photoUrl: null,
                        role: 'viewer',
                        invitedRole: null,
                        createdAt: '2026-01-01T00:00:00Z',
                        updatedAt: '2026-01-01T00:00:00Z'
                    }
                ]
            });
            api.updateShareRole
                .mockResolvedValueOnce({
                    publicId: 's1',
                    userPublicId: 'u2',
                    displayName: 'Bob',
                    photoUrl: null,
                    role: 'editor',
                    invitedRole: null,
                    createdAt: '2026-01-01T00:00:00Z',
                    updatedAt: '2026-01-02T00:00:00Z'
                })
                .mockRejectedValueOnce(new ApiError('Impossible de changer le rôle d’une invitation pending', 400));

            const store = useAccountsStore();
            await store.loadAccounts();
            await store.loadAccountDetail('acc-1');
            await store.loadShares('acc-1');

            await store.updateShareRole('acc-1', 'u2', 'editor');
            expect(store.shares[0]?.role).toBe('editor');

            await expect(store.updateShareRole('acc-1', 'u-pending', 'viewer')).rejects.toBeTruthy();
            expect(store.error).toMatch(/pending/i);
        });
    });

    describe('§8 Realtime / inbox — pas de compte fantôme', () => {
        it('revoke : destinataire sur la liste voit le compte disparaître sans refresh manuel', async () => {
            const shared = account({
                publicId: 'acc-shared',
                name: 'Partagé',
                isOwned: false,
                myRole: 'viewer',
                isPrimary: false
            });
            api.list.mockResolvedValue({ items: [account(), shared] });
            api.listIncomingShares.mockResolvedValue({ items: [] });

            let listener: ((n: { type: string; metadata?: Record<string, unknown> }) => void) | undefined;
            subscribeToAccountShareNotifications.mockImplementation(
                (fn: (n: { type: string; metadata?: Record<string, unknown> }) => void) => {
                    listener = fn;
                    return () => undefined;
                }
            );

            const store = useAccountsStore();
            await store.bootstrap('Accounts');
            expect(store.accounts.some((a) => a.publicId === 'acc-shared')).toBe(true);

            api.list.mockResolvedValue({ items: [account()] });
            listener?.({ type: 'accountShareRevoked', metadata: { accountPublicId: 'acc-shared' } });

            expect(store.accounts.some((a) => a.publicId === 'acc-shared')).toBe(false);
        });

        it('sur détail au moment du revoke → sélection vidée sans crash', async () => {
            const shared = account({
                publicId: 'acc-shared',
                isOwned: false,
                myRole: 'editor',
                isPrimary: false
            });
            api.list.mockResolvedValue({ items: [shared] });
            api.get.mockResolvedValue(shared);
            api.listIncomingShares.mockResolvedValue({ items: [] });

            let listener: ((n: { type: string; metadata?: Record<string, unknown> }) => void) | undefined;
            subscribeToAccountShareNotifications.mockImplementation(
                (fn: (n: { type: string; metadata?: Record<string, unknown> }) => void) => {
                    listener = fn;
                    return () => undefined;
                }
            );

            const store = useAccountsStore();
            await store.bootstrap('Accounts');
            await store.loadAccountDetail('acc-shared');
            expect(store.selectedAccount?.publicId).toBe('acc-shared');

            api.list.mockResolvedValue({ items: [] });
            listener?.({ type: 'accountShareRevoked', metadata: { accountPublicId: 'acc-shared' } });

            expect(store.selectedAccount).toBeNull();
            expect(store.shares).toEqual([]);
            expect(store.balanceSnapshots).toEqual([]);
        });

        it('soft-delete owner (notif accountShareRevoked) : même retrait immédiat', async () => {
            const shared = account({
                publicId: 'acc-epargne',
                isOwned: false,
                myRole: 'editor',
                isPrimary: false
            });
            api.list.mockResolvedValue({ items: [shared] });
            api.listIncomingShares.mockResolvedValue({ items: [] });

            let listener: ((n: { type: string; metadata?: Record<string, unknown> }) => void) | undefined;
            subscribeToAccountShareNotifications.mockImplementation(
                (fn: (n: { type: string; metadata?: Record<string, unknown> }) => void) => {
                    listener = fn;
                    return () => undefined;
                }
            );

            const store = useAccountsStore();
            await store.bootstrap('Accounts');
            listener?.({ type: 'accountShareRevoked', metadata: { accountPublicId: 'acc-epargne' } });
            expect(store.accounts).toHaveLength(0);
        });
    });

    describe('§9 Unfriend / block', () => {
        it('friendship removed/blocked → refresh comptes + incoming', async () => {
            const shared = account({
                publicId: 'acc-shared',
                isOwned: false,
                myRole: 'viewer',
                isPrimary: false
            });
            api.list.mockResolvedValueOnce({ items: [account(), shared] });
            api.listIncomingShares.mockResolvedValueOnce({ items: [incoming()] });

            let friendshipListener: ((p: { change: string }) => void) | undefined;
            subscribeToFriendshipChanged.mockImplementation((fn: (p: { change: string }) => void) => {
                friendshipListener = fn;
                return () => undefined;
            });

            const store = useAccountsStore();
            await store.bootstrap('Accounts');
            await store.loadIncoming(true);

            api.list.mockResolvedValue({ items: [account()] });
            api.listIncomingShares.mockResolvedValue({ items: [] });

            friendshipListener?.({ change: 'removed' });

            await vi.waitFor(() => {
                expect(store.accounts.some((a) => a.publicId === 'acc-shared')).toBe(false);
                expect(store.incomingCount).toBe(0);
            });
        });

        it('block déclenche le même refresh silencieux', async () => {
            api.list.mockResolvedValue({ items: [account()] });
            api.listIncomingShares.mockResolvedValue({ items: [] });

            let friendshipListener: ((p: { change: string }) => void) | undefined;
            subscribeToFriendshipChanged.mockImplementation((fn: (p: { change: string }) => void) => {
                friendshipListener = fn;
                return () => undefined;
            });

            const store = useAccountsStore();
            await store.bootstrap('Accounts');
            api.list.mockClear();
            api.listIncomingShares.mockClear();

            friendshipListener?.({ change: 'blocked' });

            await vi.waitFor(() => {
                expect(api.list).toHaveBeenCalled();
                expect(api.listIncomingShares).toHaveBeenCalled();
            });
        });
    });

    describe('§10 Parcours multi-users (orchestration mockée)', () => {
        it('scénario bout-en-bout A owner / B editor → viewer → soft-delete', async () => {
            // 1. A crée courant (primaire) + épargne
            api.create
                .mockResolvedValueOnce(
                    account({
                        publicId: 'acc-courant',
                        name: 'Courant',
                        isPrimary: true,
                        initialBalance: 0,
                        currentBalance: 0
                    })
                )
                .mockResolvedValueOnce(
                    account({
                        publicId: 'acc-epargne',
                        name: 'Épargne',
                        type: 'epargne',
                        isPrimary: false,
                        initialBalance: 500,
                        currentBalance: 500
                    })
                );

            const storeA = useAccountsStore();
            await storeA.createAccount({ name: 'Courant', type: 'courant', initialBalance: 0, isPrimary: true });
            await storeA.createAccount({ name: 'Épargne', type: 'epargne', initialBalance: 500 });
            expect(storeA.ownedAccounts).toHaveLength(2);
            expect(storeA.accounts.filter((a) => a.isPrimary)).toHaveLength(1);

            // 2. A partage épargne ; B accepte (simulé via list côté B)
            api.inviteShare.mockResolvedValue({
                publicId: 's1',
                userPublicId: 'user-b',
                displayName: 'Bob',
                photoUrl: null,
                role: 'pending',
                invitedRole: 'editor',
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-01T00:00:00Z'
            });
            api.listShares.mockResolvedValue({ items: [] });
            api.get.mockResolvedValue(
                account({ publicId: 'acc-epargne', name: 'Épargne', type: 'epargne', isPrimary: false })
            );
            await storeA.loadAccountDetail('acc-epargne');
            await storeA.loadShares('acc-epargne');
            await storeA.inviteShare('acc-epargne', 'user-b', 'editor');

            // Pinia store unique : on simule B en rechargeant la liste partagée
            api.list.mockResolvedValue({
                items: [
                    account({ publicId: 'acc-courant', name: 'Courant', isPrimary: true }),
                    account({
                        publicId: 'acc-epargne',
                        name: 'Épargne',
                        type: 'epargne',
                        isOwned: false,
                        myRole: 'editor',
                        isPrimary: false,
                        initialBalance: 500,
                        currentBalance: 500
                    })
                ]
            });
            await storeA.loadAccounts(true);
            const shared = storeA.sharedAccounts[0];
            expect(shared?.myRole).toBe('editor');

            // 3. B renomme OK ; changer solde initial → erreur
            api.update
                .mockResolvedValueOnce({
                    ...shared!,
                    name: 'Épargne Bob',
                    color: '#10B981'
                })
                .mockRejectedValueOnce(new ApiError('Champs owner réservés', 400));

            await storeA.updateAccount('acc-epargne', {
                name: 'Épargne Bob',
                type: 'epargne',
                currency: 'CHF',
                initialBalance: 500,
                iban: null,
                accountNumber: null,
                color: '#10B981',
                isPrimary: false
            });
            expect(storeA.accounts.find((a) => a.publicId === 'acc-epargne')?.name).toBe('Épargne Bob');

            await expect(
                storeA.updateAccount('acc-epargne', {
                    name: 'Épargne Bob',
                    type: 'epargne',
                    currency: 'CHF',
                    initialBalance: 1,
                    iban: null,
                    accountNumber: null,
                    color: '#10B981',
                    isPrimary: false
                })
            ).rejects.toBeTruthy();

            // 4. B ajoute relevé ; visible après reload
            api.createBalanceSnapshot.mockResolvedValue(
                snapshot({ publicId: 'snap-b', accountPublicId: 'acc-epargne', source: 'manual' })
            );
            api.listBalanceSnapshots.mockResolvedValue({ items: [] });
            await storeA.loadBalanceSnapshots('acc-epargne');
            await storeA.createBalanceSnapshot('acc-epargne', {
                balance: 510,
                snapshotAt: '2026-08-23T12:00:00.000Z'
            });
            expect(storeA.balanceSnapshots[0]?.source).toBe('manual');

            // 5. A passe B en viewer → create relevé refusé
            api.updateShareRole.mockResolvedValue({
                publicId: 's1',
                userPublicId: 'user-b',
                displayName: 'Bob',
                photoUrl: null,
                role: 'viewer',
                invitedRole: null,
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-03T00:00:00Z'
            });
            await storeA.updateShareRole('acc-epargne', 'user-b', 'viewer');
            api.createBalanceSnapshot.mockRejectedValue(new ApiError('Compte introuvable', 404));
            await expect(
                storeA.createBalanceSnapshot('acc-epargne', {
                    balance: 520,
                    snapshotAt: '2026-08-24T12:00:00.000Z'
                })
            ).rejects.toMatchObject({ status: 404 });

            // 6. Soft-delete épargne → revoked immédiat côté destinataire
            let listener: ((n: { type: string; metadata?: Record<string, unknown> }) => void) | undefined;
            subscribeToAccountShareNotifications.mockImplementation(
                (fn: (n: { type: string; metadata?: Record<string, unknown> }) => void) => {
                    listener = fn;
                    return () => undefined;
                }
            );
            storeA.onAuthenticatedSession();
            api.list.mockResolvedValue({
                items: [account({ publicId: 'acc-courant', name: 'Courant', isPrimary: true })]
            });
            listener?.({ type: 'accountShareRevoked', metadata: { accountPublicId: 'acc-epargne' } });
            expect(storeA.accounts.some((a) => a.publicId === 'acc-epargne')).toBe(false);

            // 7. Impossible delete primaire ; créer 2e, promouvoir, puis delete ancien
            createTestPinia();
            const storeOwner = useAccountsStore();
            api.list.mockResolvedValue({
                items: [account({ publicId: 'acc-courant', name: 'Courant', isPrimary: true })]
            });
            await storeOwner.loadAccounts();
            api.remove.mockRejectedValue(new ApiError('Impossible de supprimer le compte primaire', 400));
            await expect(storeOwner.deleteAccount('acc-courant')).rejects.toBeTruthy();

            api.create.mockResolvedValue(
                account({ publicId: 'acc-new-primary', name: 'Nouveau', isPrimary: false })
            );
            await storeOwner.createAccount({ name: 'Nouveau', type: 'courant', initialBalance: 0 });
            api.setPrimary.mockResolvedValue(
                account({ publicId: 'acc-new-primary', name: 'Nouveau', isPrimary: true })
            );
            await storeOwner.setPrimary('acc-new-primary');
            api.remove.mockResolvedValue(undefined);
            await storeOwner.deleteAccount('acc-courant');
            expect(storeOwner.accounts.some((a) => a.publicId === 'acc-courant')).toBe(false);
            expect(storeOwner.accounts.find((a) => a.publicId === 'acc-new-primary')?.isPrimary).toBe(true);
        });
    });
});
