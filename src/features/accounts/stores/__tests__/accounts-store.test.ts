import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { ACCOUNTS_LIST_MAX_AGE_MS } from '../accounts-store';

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
    refuseShare: vi.fn()
}));

const subscribeToAccountShareNotifications = vi.fn();
const subscribeToFriendshipChanged = vi.fn();

vi.mock('../../api', () => ({
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
        refuseShare: (...args: unknown[]) => api.refuseShare(...args)
    }
}));

vi.mock('@/features/notifications', () => ({
    useNotificationsStore: () => ({
        subscribeToAccountShareNotifications,
        subscribeToFriendshipChanged
    })
}));

import { useAccountsStore } from '../accounts-store';

const ownedAccount = {
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
    myRole: 'owner'
};

const incomingInvite = {
    publicId: 'share-1',
    accountPublicId: 'acc-2',
    accountName: 'Épargne',
    accountType: 'epargne',
    currency: 'CHF',
    ownerPublicId: 'u2',
    ownerDisplayName: 'Bob',
    ownerPhotoUrl: null,
    role: 'pending',
    invitedRole: 'viewer',
    createdAt: '2026-01-02T00:00:00Z'
};

describe('useAccountsStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        subscribeToAccountShareNotifications.mockReset().mockReturnValue(() => undefined);
        subscribeToFriendshipChanged.mockReset().mockReturnValue(() => undefined);
        vi.useRealTimers();
    });

    it('charge uniquement l’onglet actif au bootstrap', async () => {
        api.list.mockResolvedValue({ items: [ownedAccount] });
        api.listIncomingShares.mockResolvedValue({ items: [incomingInvite] });

        const store = useAccountsStore();
        await store.bootstrap('Accounts');

        expect(store.ownedAccounts).toHaveLength(1);
        expect(store.incomingCount).toBe(0);
        expect(api.list).toHaveBeenCalledTimes(1);
        expect(api.listIncomingShares).not.toHaveBeenCalled();
        expect(subscribeToAccountShareNotifications).toHaveBeenCalled();
        expect(subscribeToFriendshipChanged).toHaveBeenCalled();
        expect(store.initialized).toBe(true);
    });

    it('sépare owned et shared', async () => {
        api.list.mockResolvedValue({
            items: [ownedAccount, { ...ownedAccount, publicId: 'acc-2', isOwned: false, myRole: 'viewer', isPrimary: false }]
        });

        const store = useAccountsStore();
        await store.loadAccounts();

        expect(store.ownedAccounts).toHaveLength(1);
        expect(store.sharedAccounts).toHaveLength(1);
    });

    it('déduplique deux ensure concurrents', async () => {
        let resolveList: ((value: { items: (typeof ownedAccount)[] }) => void) | undefined;
        api.list.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveList = resolve;
                })
        );

        const store = useAccountsStore();
        const first = store.loadAccounts();
        const second = store.loadAccounts();
        expect(api.list).toHaveBeenCalledTimes(1);

        resolveList?.({ items: [ownedAccount] });
        await Promise.all([first, second]);
        expect(api.list).toHaveBeenCalledTimes(1);
        expect(store.ownedAccounts).toHaveLength(1);
    });

    it('openTab dans le TTL ne refetch pas', async () => {
        api.list.mockResolvedValue({ items: [ownedAccount] });
        api.listIncomingShares.mockResolvedValue({ items: [] });

        const store = useAccountsStore();
        await store.openTab('Accounts');
        await store.openTab('Accounts');
        await store.openTab('Invitations');
        await store.openTab('Invitations');

        expect(api.list).toHaveBeenCalledTimes(1);
        expect(api.listIncomingShares).toHaveBeenCalledTimes(1);
    });

    it('refetch après expiration du TTL', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
        api.list.mockResolvedValue({ items: [ownedAccount] });

        const store = useAccountsStore();
        await store.loadAccounts();
        vi.setSystemTime(new Date(Date.now() + ACCOUNTS_LIST_MAX_AGE_MS));
        await store.loadAccounts();

        expect(api.list).toHaveBeenCalledTimes(2);
    });

    it('après invalidation realtime, le prochain ensure refetch', async () => {
        api.list.mockResolvedValue({ items: [ownedAccount] });
        api.listIncomingShares.mockResolvedValue({ items: [] });

        let listener: ((n: { type: string }) => void) | undefined;
        subscribeToAccountShareNotifications.mockImplementation((fn: (n: { type: string }) => void) => {
            listener = fn;
            return () => undefined;
        });

        const store = useAccountsStore();
        await store.bootstrap('Accounts');
        api.list.mockClear();
        api.listIncomingShares.mockClear();

        listener?.({ type: 'accountShareInvite' });
        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalled();
            expect(api.listIncomingShares).toHaveBeenCalled();
        });
    });

    it('crée un compte par upsert sans relister', async () => {
        api.create.mockResolvedValue({ ...ownedAccount, publicId: 'acc-new', name: 'Nouveau', isPrimary: false });

        const store = useAccountsStore();
        const created = await store.createAccount({
            name: 'Nouveau',
            type: 'courant',
            initialBalance: 0
        });

        expect(created.publicId).toBe('acc-new');
        expect(store.accounts.some((a) => a.publicId === 'acc-new')).toBe(true);
        expect(api.list).not.toHaveBeenCalled();
    });

    it('setPrimary patch local sans relister', async () => {
        api.list.mockResolvedValue({
            items: [ownedAccount, { ...ownedAccount, publicId: 'acc-2', name: 'Épargne', isPrimary: false }]
        });
        api.setPrimary.mockResolvedValue({ ...ownedAccount, publicId: 'acc-2', name: 'Épargne', isPrimary: true });

        const store = useAccountsStore();
        await store.loadAccounts();
        api.list.mockClear();

        await store.setPrimary('acc-2');

        expect(store.accounts.find((a) => a.publicId === 'acc-2')?.isPrimary).toBe(true);
        expect(store.accounts.find((a) => a.publicId === 'acc-1')?.isPrimary).toBe(false);
        expect(api.list).not.toHaveBeenCalled();
    });

    it('accepte une invitation : patch incoming + recharge la liste comptes', async () => {
        api.listIncomingShares.mockResolvedValue({ items: [incomingInvite] });
        api.acceptShare.mockResolvedValue({});
        api.list.mockResolvedValue({ items: [ownedAccount] });

        const store = useAccountsStore();
        await store.loadIncoming();
        expect(store.incomingCount).toBe(1);

        await store.acceptShare('share-1');

        expect(api.acceptShare).toHaveBeenCalledWith('share-1');
        expect(store.incomingCount).toBe(0);
        expect(api.listIncomingShares).toHaveBeenCalledTimes(1);
        expect(api.list).toHaveBeenCalled();
    });

    it('refuse une invitation sans refetch incoming', async () => {
        api.listIncomingShares.mockResolvedValue({ items: [incomingInvite] });
        api.refuseShare.mockResolvedValue(undefined);

        const store = useAccountsStore();
        await store.loadIncoming();
        await store.refuseShare('share-1');

        expect(store.incomingCount).toBe(0);
        expect(api.listIncomingShares).toHaveBeenCalledTimes(1);
        expect(api.list).not.toHaveBeenCalled();
    });

    it('ouvre un détail depuis le snapshot liste sans refetch tant que le TTL tient', async () => {
        api.list.mockResolvedValue({ items: [ownedAccount] });
        api.get.mockResolvedValue({ ...ownedAccount, iban: 'CH00' });

        const store = useAccountsStore();
        await store.loadAccounts();
        await store.loadAccountDetail('acc-1');
        await store.loadAccountDetail('acc-1');

        expect(api.get).toHaveBeenCalledTimes(1);
        expect(store.selectedAccount?.iban).toBe('CH00');
    });

    it('restaure les shares depuis le cache mémoire sans refetch', async () => {
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

        const store = useAccountsStore();
        await store.loadShares('acc-1');
        store.shares = [];
        await store.loadShares('acc-1');

        expect(api.listShares).toHaveBeenCalledTimes(1);
        expect(store.shares).toHaveLength(1);
    });

    it('onAuthenticatedSession branche le realtime sans charger', () => {
        const store = useAccountsStore();
        store.onAuthenticatedSession();
        expect(subscribeToAccountShareNotifications).toHaveBeenCalled();
        expect(api.list).not.toHaveBeenCalled();
    });
});
