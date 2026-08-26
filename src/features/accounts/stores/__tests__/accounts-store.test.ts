import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { ACCOUNTS_LIST_MAX_AGE_MS } from '@/features/accounts/stores/accounts-store';

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
    leaveShare: vi.fn(),
    listIncomingShares: vi.fn(),
    acceptShare: vi.fn(),
    refuseShare: vi.fn(),
    listBalanceSnapshots: vi.fn(),
    createBalanceSnapshot: vi.fn(),
    deleteBalanceSnapshot: vi.fn()
}));

const subscribeToAccountShareNotifications = vi.fn();
const subscribeToFriendshipChanged = vi.fn();
const subscribeToAccountChanged = vi.fn();

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
        leaveShare: (...args: unknown[]) => api.leaveShare(...args),
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
        subscribeToFriendshipChanged,
        subscribeToAccountChanged
    })
}));

import { useAccountsStore } from '@/features/accounts/stores/accounts-store';

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
    myRole: 'owner',
    hiddenFields: [] as const
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
    role: 'pending' as const,
    invitedRole: 'viewer' as const,
    hiddenFields: ['iban', 'accountNumber'] as const,
    createdAt: '2026-01-02T00:00:00Z'
};

describe('useAccountsStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        subscribeToAccountShareNotifications.mockReset().mockReturnValue(() => undefined);
        subscribeToFriendshipChanged.mockReset().mockReturnValue(() => undefined);
        subscribeToAccountChanged.mockReset().mockReturnValue(() => undefined);
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

        let listener: ((n: { type: string; metadata?: Record<string, unknown> }) => void) | undefined;
        subscribeToAccountShareNotifications.mockImplementation((fn: (n: { type: string; metadata?: Record<string, unknown> }) => void) => {
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

    it('accountShareRevoked retire le compte de la liste immédiatement', async () => {
        const shared = {
            ...ownedAccount,
            publicId: 'acc-shared',
            name: 'Partagé',
            isOwned: false,
            myRole: 'viewer' as const,
            isPrimary: false
        };
        api.list.mockResolvedValue({ items: [ownedAccount, shared] });
        api.listIncomingShares.mockResolvedValue({ items: [] });

        let listener: ((n: { type: string; metadata?: Record<string, unknown> }) => void) | undefined;
        subscribeToAccountShareNotifications.mockImplementation((fn: (n: { type: string; metadata?: Record<string, unknown> }) => void) => {
            listener = fn;
            return () => undefined;
        });

        const store = useAccountsStore();
        await store.bootstrap('Accounts');
        expect(store.accounts.some((a) => a.publicId === 'acc-shared')).toBe(true);

        api.list.mockResolvedValue({ items: [ownedAccount] });
        listener?.({ type: 'accountShareRevoked', metadata: { accountPublicId: 'acc-shared' } });

        expect(store.accounts.some((a) => a.publicId === 'acc-shared')).toBe(false);
        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalled();
        });
    });

    it('accountChanged restored met à jour isActive sans refresh manuel', async () => {
        const shared = {
            ...ownedAccount,
            publicId: 'acc-shared',
            name: 'Partagé',
            isOwned: false,
            myRole: 'editor' as const,
            isPrimary: false,
            isActive: false
        };
        api.list.mockResolvedValue({ items: [ownedAccount, shared] });
        api.listIncomingShares.mockResolvedValue({ items: [] });

        let accountListener: ((p: { change: string; accountPublicId: string }) => void) | undefined;
        subscribeToAccountChanged.mockImplementation((fn: (p: { change: string; accountPublicId: string }) => void) => {
            accountListener = fn;
            return () => undefined;
        });

        const store = useAccountsStore();
        await store.bootstrap('Accounts');
        expect(store.accounts.find((a) => a.publicId === 'acc-shared')?.isActive).toBe(false);

        api.list.mockResolvedValue({
            items: [ownedAccount, { ...shared, isActive: true }]
        });
        accountListener?.({ change: 'restored', accountPublicId: 'acc-shared' });

        expect(store.accounts.find((a) => a.publicId === 'acc-shared')?.isActive).toBe(true);
        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalled();
        });
    });

    it('accountChanged visibility refetch la liste et le détail ouvert', async () => {
        const shared = {
            ...ownedAccount,
            publicId: 'acc-shared',
            name: 'Partagé',
            isOwned: false,
            myRole: 'viewer' as const,
            isPrimary: false,
            currentBalance: null as number | null,
            initialBalance: null as number | null,
            hiddenFields: ['iban', 'accountNumber'] as const
        };
        api.list.mockResolvedValue({ items: [ownedAccount, shared] });
        api.get.mockResolvedValue(shared);
        api.listIncomingShares.mockResolvedValue({ items: [] });

        let accountListener: ((p: { change: string; accountPublicId: string }) => void) | undefined;
        subscribeToAccountChanged.mockImplementation((fn: (p: { change: string; accountPublicId: string }) => void) => {
            accountListener = fn;
            return () => undefined;
        });

        const store = useAccountsStore();
        await store.bootstrap('Accounts');
        await store.loadAccountDetail('acc-shared');

        const revealed = {
            ...shared,
            currentBalance: 120,
            initialBalance: 100,
            hiddenFields: [] as const
        };
        api.list.mockClear();
        api.get.mockClear();
        api.list.mockResolvedValue({ items: [ownedAccount, revealed] });
        api.get.mockResolvedValue(revealed);

        accountListener?.({ change: 'visibility', accountPublicId: 'acc-shared' });

        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalled();
            expect(api.get).toHaveBeenCalledWith('acc-shared');
        });
        expect(store.accounts.find((a) => a.publicId === 'acc-shared')?.hiddenFields).toEqual([]);
        expect(store.selectedAccount?.currentBalance).toBe(120);
    });

    it('accountChanged balanceSnapshotCreated refetch les relevés si le compte est ouvert', async () => {
        api.list.mockResolvedValue({ items: [ownedAccount] });
        api.get.mockResolvedValue(ownedAccount);
        api.listBalanceSnapshots.mockResolvedValue({ items: [], page: 1, pageSize: 50, totalCount: 0 });
        api.listIncomingShares.mockResolvedValue({ items: [] });

        let accountListener: ((p: { change: string; accountPublicId: string }) => void) | undefined;
        subscribeToAccountChanged.mockImplementation((fn: (p: { change: string; accountPublicId: string }) => void) => {
            accountListener = fn;
            return () => undefined;
        });

        const store = useAccountsStore();
        await store.bootstrap('Accounts');
        await store.loadAccountDetail('acc-1');
        await store.loadBalanceSnapshots('acc-1');
        expect(store.balanceSnapshots).toHaveLength(0);

        api.listBalanceSnapshots.mockClear();
        api.listBalanceSnapshots.mockResolvedValue({
            items: [
                {
                    publicId: 'snap-live',
                    accountPublicId: 'acc-1',
                    balance: 250,
                    snapshotAt: '2026-08-26T12:00:00.000Z',
                    source: 'manual',
                    note: null,
                    createdAt: '2026-08-26T12:00:00.000Z',
                    updatedAt: null,
                    createdByUserPublicId: 'u-b',
                    createdByDisplayName: 'Bob',
                    createdByPhotoUrl: null
                }
            ],
            page: 1,
            pageSize: 50,
            totalCount: 1
        });

        accountListener?.({ change: 'balanceSnapshotCreated', accountPublicId: 'acc-1' });

        await vi.waitFor(() => {
            expect(api.listBalanceSnapshots).toHaveBeenCalled();
        });
        expect(store.balanceSnapshots).toHaveLength(1);
        expect(store.balanceSnapshots[0]?.publicId).toBe('snap-live');
    });

    it('accountChanged updated refetch le détail si la modale est ouverte', async () => {
        api.list.mockResolvedValue({ items: [ownedAccount] });
        api.get.mockResolvedValue(ownedAccount);
        api.listIncomingShares.mockResolvedValue({ items: [] });

        let accountListener: ((p: { change: string; accountPublicId: string }) => void) | undefined;
        subscribeToAccountChanged.mockImplementation((fn: (p: { change: string; accountPublicId: string }) => void) => {
            accountListener = fn;
            return () => undefined;
        });

        const store = useAccountsStore();
        await store.bootstrap('Accounts');
        await store.loadAccountDetail('acc-1');
        expect(store.selectedAccount?.name).toBe('Courant');

        api.list.mockClear();
        api.get.mockClear();
        api.list.mockResolvedValue({ items: [{ ...ownedAccount, name: 'Courant renommé' }] });
        api.get.mockResolvedValue({ ...ownedAccount, name: 'Courant renommé' });

        accountListener?.({ change: 'updated', accountPublicId: 'acc-1' });

        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalled();
            expect(api.get).toHaveBeenCalledWith('acc-1');
        });
        expect(store.selectedAccount?.name).toBe('Courant renommé');
        expect(store.accounts.find((a) => a.publicId === 'acc-1')?.name).toBe('Courant renommé');
    });

    it('accountChanged revoked retire le compte immédiatement et vide la sélection', async () => {
        const shared = {
            ...ownedAccount,
            publicId: 'acc-shared',
            name: 'Partagé',
            isOwned: false,
            myRole: 'viewer' as const,
            isPrimary: false
        };
        api.list.mockResolvedValue({ items: [ownedAccount, shared] });
        api.get.mockResolvedValue(shared);
        api.listIncomingShares.mockResolvedValue({ items: [] });

        let accountListener: ((p: { change: string; accountPublicId: string }) => void) | undefined;
        subscribeToAccountChanged.mockImplementation((fn: (p: { change: string; accountPublicId: string }) => void) => {
            accountListener = fn;
            return () => undefined;
        });

        const store = useAccountsStore();
        await store.bootstrap('Accounts');
        await store.loadAccountDetail('acc-shared');
        expect(store.selectedAccount?.publicId).toBe('acc-shared');

        api.list.mockResolvedValue({ items: [ownedAccount] });
        accountListener?.({ change: 'revoked', accountPublicId: 'acc-shared' });

        expect(store.accounts.some((a) => a.publicId === 'acc-shared')).toBe(false);
        expect(store.selectedAccount).toBeNull();
        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalled();
        });
    });

    it('accountChanged roleChanged refetch la liste et le détail ouvert (myRole)', async () => {
        const shared = {
            ...ownedAccount,
            publicId: 'acc-shared',
            name: 'Partagé',
            isOwned: false,
            myRole: 'editor' as const,
            isPrimary: false
        };
        api.list.mockResolvedValue({ items: [ownedAccount, shared] });
        api.get.mockResolvedValue(shared);
        api.listIncomingShares.mockResolvedValue({ items: [] });

        let accountListener: ((p: { change: string; accountPublicId: string }) => void) | undefined;
        subscribeToAccountChanged.mockImplementation((fn: (p: { change: string; accountPublicId: string }) => void) => {
            accountListener = fn;
            return () => undefined;
        });

        const store = useAccountsStore();
        await store.bootstrap('Accounts');
        await store.loadAccountDetail('acc-shared');
        expect(store.selectedAccount?.myRole).toBe('editor');

        const asViewer = { ...shared, myRole: 'viewer' as const };
        api.list.mockClear();
        api.get.mockClear();
        api.list.mockResolvedValue({ items: [ownedAccount, asViewer] });
        api.get.mockResolvedValue(asViewer);

        accountListener?.({ change: 'roleChanged', accountPublicId: 'acc-shared' });

        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalled();
            expect(api.get).toHaveBeenCalledWith('acc-shared');
        });
        expect(store.accounts.find((a) => a.publicId === 'acc-shared')?.myRole).toBe('viewer');
        expect(store.selectedAccount?.myRole).toBe('viewer');
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

    it('crée un compte primaire en démotant l’ancien sans relister', async () => {
        api.list.mockResolvedValue({ items: [ownedAccount] });
        api.create.mockResolvedValue({ ...ownedAccount, publicId: 'acc-new', name: 'Nouveau', isPrimary: true });

        const store = useAccountsStore();
        await store.loadAccounts();
        api.list.mockClear();

        await store.createAccount({
            name: 'Nouveau',
            type: 'courant',
            initialBalance: 0,
            isPrimary: true
        });

        expect(store.accounts.find((a) => a.publicId === 'acc-new')?.isPrimary).toBe(true);
        expect(store.accounts.find((a) => a.publicId === 'acc-1')?.isPrimary).toBe(false);
        expect(store.accounts.filter((a) => a.isOwned && a.isPrimary)).toHaveLength(1);
        expect(api.list).not.toHaveBeenCalled();
    });

    it('un PUT isPrimary: true démote l’ancien primaire (réponse partielle)', async () => {
        api.list.mockResolvedValue({
            items: [ownedAccount, { ...ownedAccount, publicId: 'acc-2', name: 'Épargne', isPrimary: false }]
        });
        api.update.mockResolvedValue({ ...ownedAccount, publicId: 'acc-2', name: 'Épargne', isPrimary: true });

        const store = useAccountsStore();
        await store.loadAccounts();

        await store.updateAccount('acc-2', {
            name: 'Épargne',
            type: 'courant',
            currency: 'CHF',
            initialBalance: 100,
            iban: null,
            accountNumber: null,
            color: null,
            isPrimary: true
        });

        expect(store.accounts.find((a) => a.publicId === 'acc-2')?.isPrimary).toBe(true);
        expect(store.accounts.find((a) => a.publicId === 'acc-1')?.isPrimary).toBe(false);
        expect(store.accounts.filter((a) => a.isOwned && a.isPrimary)).toHaveLength(1);
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
        expect(store.accounts.filter((a) => a.isOwned && a.isPrimary)).toHaveLength(1);
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
        api.list.mockResolvedValue({ items: [ownedAccount] });
        api.get.mockResolvedValue(ownedAccount);
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
        await store.loadAccounts();
        await store.loadAccountDetail('acc-1');
        await store.loadShares('acc-1');
        store.shares = [];
        await store.loadShares('acc-1');

        expect(api.listShares).toHaveBeenCalledTimes(1);
        expect(store.shares).toHaveLength(1);
    });

    it('ignore un détail tardif quand un autre compte est déjà sélectionné', async () => {
        const accountB = { ...ownedAccount, publicId: 'acc-2', name: 'Épargne', isPrimary: false, iban: 'CH-B' };
        api.list.mockResolvedValue({ items: [ownedAccount, accountB] });

        let resolveA: ((value: unknown) => void) | undefined;
        api.get.mockImplementation((id: string) => {
            if (id === 'acc-1') {
                return new Promise((resolve) => {
                    resolveA = resolve;
                });
            }
            return Promise.resolve({ ...accountB, iban: 'CH-B-detail' });
        });

        const store = useAccountsStore();
        await store.loadAccounts();

        const loadA = store.loadAccountDetail('acc-1');
        const loadB = store.loadAccountDetail('acc-2');
        await loadB;
        expect(store.selectedAccount?.publicId).toBe('acc-2');

        resolveA?.({ ...ownedAccount, iban: 'CH-A-late' });
        await loadA;

        expect(store.selectedAccount?.publicId).toBe('acc-2');
        expect(store.selectedAccount?.iban).toBe('CH-B-detail');
        // Réponse périmée : ne doit pas écraser la ligne liste (iban d’origine).
        expect(store.accounts.find((a) => a.publicId === 'acc-1')?.iban).toBeNull();
    });

    it('ignore des shares tardives d’un autre compte', async () => {
        const accountB = { ...ownedAccount, publicId: 'acc-2', name: 'Épargne', isPrimary: false };
        api.list.mockResolvedValue({ items: [ownedAccount, accountB] });
        api.get.mockImplementation(async (id: string) => (id === 'acc-1' ? ownedAccount : accountB));

        let resolveSharesA: ((value: unknown) => void) | undefined;
        api.listShares.mockImplementation((id: string) => {
            if (id === 'acc-1') {
                return new Promise((resolve) => {
                    resolveSharesA = resolve;
                });
            }
            return Promise.resolve({
                items: [
                    {
                        publicId: 's-b',
                        userPublicId: 'u3',
                        displayName: 'Alice',
                        photoUrl: null,
                        role: 'viewer',
                        invitedRole: null,
                        createdAt: '2026-01-01T00:00:00Z',
                        updatedAt: '2026-01-01T00:00:00Z'
                    }
                ]
            });
        });

        const store = useAccountsStore();
        await store.loadAccounts();
        await store.loadAccountDetail('acc-1');
        const loadSharesA = store.loadShares('acc-1');
        await store.loadAccountDetail('acc-2');
        await store.loadShares('acc-2');

        expect(store.shares).toHaveLength(1);
        expect(store.shares[0]?.publicId).toBe('s-b');

        resolveSharesA?.({
            items: [
                {
                    publicId: 's-a',
                    userPublicId: 'u2',
                    displayName: 'Bob',
                    photoUrl: null,
                    role: 'editor',
                    invitedRole: null,
                    createdAt: '2026-01-01T00:00:00Z',
                    updatedAt: '2026-01-01T00:00:00Z'
                }
            ]
        });
        await loadSharesA;

        expect(store.shares).toHaveLength(1);
        expect(store.shares[0]?.publicId).toBe('s-b');
    });

    it('ignore des snapshots tardifs d’un autre compte', async () => {
        const accountB = { ...ownedAccount, publicId: 'acc-2', name: 'Épargne', isPrimary: false };
        api.list.mockResolvedValue({ items: [ownedAccount, accountB] });
        api.get.mockImplementation(async (id: string) => (id === 'acc-1' ? ownedAccount : accountB));

        let resolveSnapA: ((value: unknown) => void) | undefined;
        api.listBalanceSnapshots.mockImplementation((id: string) => {
            if (id === 'acc-1') {
                return new Promise((resolve) => {
                    resolveSnapA = resolve;
                });
            }
            return Promise.resolve({
                items: [
                    {
                        publicId: 'snap-b',
                        accountPublicId: 'acc-2',
                        balance: 50,
                        snapshotAt: '2026-01-02T00:00:00Z',
                        source: 'manual',
                        note: null,
                        createdAt: '2026-01-02T00:00:00Z',
                        updatedAt: null,
                        createdByUserPublicId: null,
                        createdByDisplayName: null,
                        createdByPhotoUrl: null
                    }
                ]
            });
        });

        const store = useAccountsStore();
        await store.loadAccounts();
        await store.loadAccountDetail('acc-1');
        const loadSnapA = store.loadBalanceSnapshots('acc-1');
        await store.loadAccountDetail('acc-2');
        await store.loadBalanceSnapshots('acc-2');

        expect(store.balanceSnapshots[0]?.publicId).toBe('snap-b');

        resolveSnapA?.({
            items: [
                {
                    publicId: 'snap-a',
                    accountPublicId: 'acc-1',
                    balance: 100,
                    snapshotAt: '2026-01-01T00:00:00Z',
                    source: 'manual',
                    note: null,
                    createdAt: '2026-01-01T00:00:00Z',
                    updatedAt: null,
                    createdByUserPublicId: null,
                    createdByDisplayName: null,
                    createdByPhotoUrl: null
                }
            ]
        });
        await loadSnapA;

        expect(store.balanceSnapshots).toHaveLength(1);
        expect(store.balanceSnapshots[0]?.publicId).toBe('snap-b');
    });

    it('vide la sélection si le compte disparaît de la liste après reload', async () => {
        const sharedAccount = {
            ...ownedAccount,
            publicId: 'acc-shared',
            name: 'Partagé',
            isOwned: false,
            isPrimary: false,
            myRole: 'viewer' as const
        };
        api.list.mockResolvedValueOnce({ items: [ownedAccount, sharedAccount] });
        api.get.mockResolvedValue(sharedAccount);

        const store = useAccountsStore();
        await store.loadAccounts();
        await store.loadAccountDetail('acc-shared');
        expect(store.selectedAccount?.publicId).toBe('acc-shared');

        api.list.mockResolvedValueOnce({ items: [ownedAccount] });
        await store.loadAccounts(true);

        expect(store.selectedAccount).toBeNull();
        expect(store.shares).toEqual([]);
        expect(store.balanceSnapshots).toEqual([]);
    });

    it('rafraîchit la sélection depuis la liste si le compte est toujours présent', async () => {
        api.list.mockResolvedValueOnce({ items: [ownedAccount] });
        api.get.mockResolvedValue(ownedAccount);

        const store = useAccountsStore();
        await store.loadAccounts();
        await store.loadAccountDetail('acc-1');

        api.list.mockResolvedValueOnce({
            items: [{ ...ownedAccount, name: 'Courant renommé', isActive: false }]
        });
        await store.loadAccounts(true);

        expect(store.selectedAccount?.publicId).toBe('acc-1');
        expect(store.selectedAccount?.name).toBe('Courant renommé');
        expect(store.selectedAccount?.isActive).toBe(false);
    });

    it('deleteAccount purge liste, sélection, shares, snapshots et invalide le cache snapshots', async () => {
        const deletable = { ...ownedAccount, isPrimary: false };
        api.list.mockResolvedValue({ items: [deletable] });
        api.get.mockResolvedValue(deletable);
        api.listBalanceSnapshots.mockResolvedValue({
            items: [
                {
                    publicId: 'snap-1',
                    accountPublicId: 'acc-1',
                    balance: 100,
                    snapshotAt: '2026-01-01T12:00:00.000Z',
                    source: 'manual',
                    note: null,
                    createdAt: '2026-01-01T12:00:00.000Z',
                    updatedAt: null,
                    createdByUserPublicId: null,
                    createdByDisplayName: null,
                    createdByPhotoUrl: null
                }
            ]
        });
        api.remove.mockResolvedValue(undefined);

        const store = useAccountsStore();
        await store.loadAccounts();
        await store.loadAccountDetail('acc-1');
        await store.loadBalanceSnapshots('acc-1');
        expect(store.balanceSnapshots).toHaveLength(1);

        await store.deleteAccount('acc-1');

        expect(api.remove).toHaveBeenCalledWith('acc-1');
        expect(store.accounts.some((a) => a.publicId === 'acc-1')).toBe(false);
        expect(store.selectedAccount).toBeNull();
        expect(store.shares).toEqual([]);
        expect(store.balanceSnapshots).toEqual([]);

        // Compte réapparu : le cache snapshots ne doit plus être frais → refetch.
        api.list.mockResolvedValue({ items: [deletable] });
        api.listBalanceSnapshots.mockClear();
        api.listBalanceSnapshots.mockResolvedValue({ items: [] });
        await store.loadAccounts(true);
        await store.loadAccountDetail('acc-1');
        await store.loadBalanceSnapshots('acc-1');
        expect(api.listBalanceSnapshots).toHaveBeenCalledWith('acc-1', { page: 1, pageSize: 50 });
    });

    it('archive puis restore patchent le compte localement', async () => {
        const secondary = { ...ownedAccount, publicId: 'acc-2', name: 'Épargne', isPrimary: false };
        api.list.mockResolvedValue({ items: [ownedAccount, secondary] });
        api.archive.mockResolvedValue({ ...secondary, isActive: false });
        api.restore.mockResolvedValue({ ...secondary, isActive: true });

        const store = useAccountsStore();
        await store.loadAccounts();
        await store.archiveAccount('acc-2');

        expect(api.archive).toHaveBeenCalledWith('acc-2');
        expect(store.accounts.find((a) => a.publicId === 'acc-2')?.isActive).toBe(false);
        expect(store.archivedOwnedAccounts.some((a) => a.publicId === 'acc-2')).toBe(true);

        await store.restoreAccount('acc-2');
        expect(api.restore).toHaveBeenCalledWith('acc-2');
        expect(store.accounts.find((a) => a.publicId === 'acc-2')?.isActive).toBe(true);
        expect(store.activeOwnedAccounts.some((a) => a.publicId === 'acc-2')).toBe(true);
    });

    it('inviteShare, updateShareRole et revokeShare patchent la liste locale', async () => {
        api.list.mockResolvedValue({ items: [ownedAccount] });
        api.get.mockResolvedValue(ownedAccount);
        api.listShares.mockResolvedValue({ items: [] });
        api.inviteShare.mockResolvedValue({
            publicId: 's1',
            userPublicId: 'u2',
            displayName: 'Bob',
            photoUrl: null,
            role: 'pending',
            invitedRole: 'viewer',
            hiddenFields: ['iban', 'accountNumber'],
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
        });
        api.updateShareRole.mockResolvedValue({
            publicId: 's1',
            userPublicId: 'u2',
            displayName: 'Bob',
            photoUrl: null,
            role: 'editor',
            invitedRole: null,
            hiddenFields: [],
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-02T00:00:00Z'
        });
        api.revokeShare.mockResolvedValue(undefined);

        const store = useAccountsStore();
        await store.loadAccounts();
        await store.loadAccountDetail('acc-1');
        await store.loadShares('acc-1');

        await store.inviteShare('acc-1', 'u2', 'viewer', 'https://photo');
        expect(store.shares).toHaveLength(1);
        expect(store.shares[0]?.photoUrl).toBe('https://photo');
        expect(store.shares[0]?.role).toBe('pending');

        await store.updateShareRole('acc-1', 'u2', 'editor');
        expect(store.shares[0]?.role).toBe('editor');

        await store.revokeShare('acc-1', 'u2');
        expect(api.revokeShare).toHaveBeenCalledWith('acc-1', 'u2');
        expect(store.shares).toHaveLength(0);
    });

    it('accountShareAccepted promeut pending → rôle même si la modale est ouverte', async () => {
        const share = {
            publicId: 's1',
            userPublicId: 'u-b',
            displayName: 'Bob',
            photoUrl: null,
            role: 'pending' as const,
            invitedRole: 'viewer' as const,
            hiddenFields: ['iban', 'accountNumber'] as const,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
        };
        api.list.mockResolvedValue({ items: [ownedAccount] });
        api.get.mockResolvedValue(ownedAccount);
        api.listShares.mockResolvedValue({ items: [share] });
        api.listIncomingShares.mockResolvedValue({ items: [] });

        let listener: ((n: { type: string; metadata?: Record<string, unknown> }) => void) | undefined;
        subscribeToAccountShareNotifications.mockImplementation((fn: (n: { type: string; metadata?: Record<string, unknown> }) => void) => {
            listener = fn;
            return () => undefined;
        });

        const store = useAccountsStore();
        await store.bootstrap('Accounts');
        await store.loadAccountDetail('acc-1');
        await store.loadShares('acc-1');
        expect(store.shares[0]?.role).toBe('pending');

        api.listShares.mockResolvedValue({
            items: [{ ...share, role: 'viewer', invitedRole: null, hiddenFields: ['iban', 'accountNumber'] }]
        });
        listener?.({
            type: 'accountShareAccepted',
            metadata: { accountPublicId: 'acc-1', sharePublicId: 's1' }
        });

        expect(store.shares[0]?.role).toBe('viewer');
        await vi.waitFor(() => {
            expect(api.listShares).toHaveBeenCalled();
        });
    });

    it('accountShareLeft invalide le cache shares même si la modale est fermée', async () => {
        const share = {
            publicId: 's1',
            userPublicId: 'u-b',
            displayName: 'Bob',
            photoUrl: null,
            role: 'viewer' as const,
            invitedRole: null,
            hiddenFields: [] as const,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
        };
        api.list.mockResolvedValue({ items: [ownedAccount] });
        api.get.mockResolvedValue(ownedAccount);
        api.listShares.mockResolvedValue({ items: [share] });
        api.listIncomingShares.mockResolvedValue({ items: [] });

        let listener: ((n: { type: string; metadata?: Record<string, unknown> }) => void) | undefined;
        subscribeToAccountShareNotifications.mockImplementation((fn: (n: { type: string; metadata?: Record<string, unknown> }) => void) => {
            listener = fn;
            return () => undefined;
        });

        const store = useAccountsStore();
        await store.bootstrap('Accounts');
        await store.loadAccountDetail('acc-1');
        await store.loadShares('acc-1');
        expect(store.shares).toHaveLength(1);

        store.clearSelected();
        expect(store.selectedAccount).toBeNull();

        api.listShares.mockClear();
        api.listShares.mockResolvedValue({ items: [] });
        listener?.({ type: 'accountShareLeft', metadata: { accountPublicId: 'acc-1' } });

        // Réouverture : ne doit pas réutiliser le cache TTL avec Bob encore présent.
        await store.loadAccountDetail('acc-1');
        await store.loadShares('acc-1');
        expect(api.listShares).toHaveBeenCalled();
        expect(store.shares).toHaveLength(0);
    });

    it('leaveShare retire le compte partagé de la liste locale', async () => {
        const shared = {
            ...ownedAccount,
            publicId: 'acc-shared',
            name: 'Partagé',
            isOwned: false,
            myRole: 'editor' as const,
            isPrimary: false
        };
        api.list.mockResolvedValue({ items: [ownedAccount, shared] });
        api.get.mockResolvedValue(shared);
        api.leaveShare.mockResolvedValue(undefined);

        const store = useAccountsStore();
        await store.loadAccounts();
        await store.loadAccountDetail('acc-shared');
        expect(store.selectedAccount?.publicId).toBe('acc-shared');

        await store.leaveShare('acc-shared');

        expect(api.leaveShare).toHaveBeenCalledWith('acc-shared');
        expect(store.accounts.some((a) => a.publicId === 'acc-shared')).toBe(false);
        expect(store.selectedAccount).toBeNull();
    });

    it('createBalanceSnapshot et deleteBalanceSnapshot patchent la liste locale', async () => {
        api.list.mockResolvedValue({ items: [ownedAccount] });
        api.get.mockResolvedValue(ownedAccount);
        api.listBalanceSnapshots.mockResolvedValue({ items: [], page: 1, pageSize: 50, totalCount: 0 });
        api.createBalanceSnapshot.mockResolvedValue({
            publicId: 'snap-new',
            accountPublicId: 'acc-1',
            balance: 250,
            snapshotAt: '2026-08-23T12:00:00.000Z',
            source: 'manual',
            note: 'ok',
            createdAt: '2026-08-23T12:00:00.000Z',
            updatedAt: null,
            createdByUserPublicId: 'u1',
            createdByDisplayName: 'Alice',
            createdByPhotoUrl: null
        });
        api.deleteBalanceSnapshot.mockResolvedValue(undefined);

        const store = useAccountsStore();
        await store.loadAccounts();
        await store.loadAccountDetail('acc-1');
        await store.loadBalanceSnapshots('acc-1');

        await store.createBalanceSnapshot('acc-1', {
            balance: 250,
            snapshotAt: '2026-08-23T12:00:00.000Z',
            note: 'ok'
        });
        expect(store.balanceSnapshots).toHaveLength(1);
        expect(store.balanceSnapshots[0]?.publicId).toBe('snap-new');

        await store.deleteBalanceSnapshot('acc-1', 'snap-new');
        expect(api.deleteBalanceSnapshot).toHaveBeenCalledWith('acc-1', 'snap-new');
        expect(store.balanceSnapshots).toHaveLength(0);
    });

    it('pagination relevés survit à clearSelected + réouverture (cache TTL)', async () => {
        const page1 = Array.from({ length: 50 }, (_, i) => ({
            publicId: `snap-${i}`,
            accountPublicId: 'acc-1',
            balance: 100 - i,
            snapshotAt: `2026-08-${String(26 - (i % 20)).padStart(2, '0')}T12:00:00.000Z`,
            source: 'manual' as const,
            note: null,
            createdAt: `2026-08-${String(26 - (i % 20)).padStart(2, '0')}T12:00:00.000Z`,
            updatedAt: null,
            createdByUserPublicId: null,
            createdByDisplayName: null,
            createdByPhotoUrl: null
        }));
        api.list.mockResolvedValue({ items: [ownedAccount] });
        api.get.mockResolvedValue(ownedAccount);
        api.listBalanceSnapshots.mockResolvedValue({ items: page1, page: 1, pageSize: 50, totalCount: 75 });

        const store = useAccountsStore();
        await store.loadAccounts();
        await store.loadAccountDetail('acc-1');
        await store.loadBalanceSnapshots('acc-1');
        expect(store.balanceSnapshots).toHaveLength(50);
        expect(store.snapshotsTotalCount).toBe(75);
        expect(store.hasMoreSnapshots).toBe(true);

        api.listBalanceSnapshots.mockClear();
        store.clearSelected();
        expect(store.snapshotsTotalCount).toBe(0);

        await store.loadAccountDetail('acc-1');
        await store.loadBalanceSnapshots('acc-1');
        expect(api.listBalanceSnapshots).not.toHaveBeenCalled();
        expect(store.balanceSnapshots).toHaveLength(50);
        expect(store.snapshotsTotalCount).toBe(75);
        expect(store.hasMoreSnapshots).toBe(true);
    });

    it('createBalanceSnapshot trie par snapshotAt (pas de prepend aveugle)', async () => {
        const newer = {
            publicId: 'snap-new',
            accountPublicId: 'acc-1',
            balance: 300,
            snapshotAt: '2026-08-25T12:00:00.000Z',
            source: 'manual' as const,
            note: null,
            createdAt: '2026-08-25T12:00:00.000Z',
            updatedAt: null,
            createdByUserPublicId: null,
            createdByDisplayName: null,
            createdByPhotoUrl: null
        };
        const olderPayload = {
            publicId: 'snap-old',
            accountPublicId: 'acc-1',
            balance: 200,
            snapshotAt: '2026-08-20T12:00:00.000Z',
            source: 'manual' as const,
            note: null,
            createdAt: '2026-08-26T12:00:00.000Z',
            updatedAt: null,
            createdByUserPublicId: null,
            createdByDisplayName: null,
            createdByPhotoUrl: null
        };
        api.list.mockResolvedValue({ items: [ownedAccount] });
        api.get.mockResolvedValue(ownedAccount);
        api.listBalanceSnapshots.mockResolvedValue({ items: [newer], page: 1, pageSize: 50, totalCount: 1 });
        api.createBalanceSnapshot.mockResolvedValue(olderPayload);

        const store = useAccountsStore();
        await store.loadAccounts();
        await store.loadAccountDetail('acc-1');
        await store.loadBalanceSnapshots('acc-1');

        await store.createBalanceSnapshot('acc-1', { balance: 200, snapshotAt: '2026-08-20T12:00:00.000Z' });
        expect(store.balanceSnapshots.map((s) => s.publicId)).toEqual(['snap-new', 'snap-old']);
        expect(store.snapshotsTotalCount).toBe(2);
    });

    it('acting reste true tant qu’une mutation concurrente tourne', async () => {
        const secondary = { ...ownedAccount, publicId: 'acc-2', name: 'Épargne', isPrimary: false };
        api.list.mockResolvedValue({ items: [ownedAccount, secondary] });
        let resolveCreate!: (value: typeof ownedAccount) => void;
        let resolvePrimary!: (value: typeof ownedAccount) => void;
        api.create.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveCreate = resolve;
                })
        );
        api.setPrimary.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolvePrimary = resolve;
                })
        );

        const store = useAccountsStore();
        await store.loadAccounts();

        const createPromise = store.createAccount({
            name: 'Nouveau',
            type: 'courant',
            initialBalance: 0
        });
        await Promise.resolve();
        expect(store.acting).toBe(true);

        const primaryPromise = store.setPrimary('acc-2');
        await Promise.resolve();
        expect(store.acting).toBe(true);

        resolveCreate({ ...ownedAccount, publicId: 'acc-new', name: 'Nouveau', isPrimary: false });
        await createPromise;
        expect(store.acting).toBe(true);

        resolvePrimary({ ...secondary, isPrimary: true });
        await primaryPromise;
        expect(store.acting).toBe(false);
    });

    it('refuse les mutations hors droits sans appeler l’API', async () => {
        const sharedViewer = {
            ...ownedAccount,
            publicId: 'acc-shared',
            isOwned: false,
            myRole: 'viewer' as const,
            isPrimary: false
        };
        api.list.mockResolvedValue({ items: [ownedAccount, sharedViewer] });
        api.listIncomingShares.mockResolvedValue({ items: [] });

        const store = useAccountsStore();
        await store.loadAccounts();
        await store.loadIncoming();

        await expect(store.inviteShare('acc-shared', 'u2', 'viewer')).rejects.toMatchObject({
            status: 403,
            code: 'account_forbidden'
        });
        await expect(store.leaveShare('acc-1')).rejects.toMatchObject({
            status: 403,
            code: 'account_forbidden'
        });
        await expect(store.updateAccount('acc-shared', {
            name: 'X',
            type: 'courant',
            currency: 'CHF',
            initialBalance: 0,
            accountNumber: null,
            color: null,
            isPrimary: false
        })).rejects.toMatchObject({ status: 403, code: 'account_forbidden' });
        await expect(store.deleteAccount('acc-1')).rejects.toMatchObject({
            status: 403,
            code: 'account_forbidden'
        });
        await expect(store.acceptShare('missing-share')).rejects.toMatchObject({
            status: 404,
            code: 'share_invite_not_found'
        });
        await expect(store.createBalanceSnapshot('unknown-acc', {
            balance: 1,
            snapshotAt: '2026-08-23T12:00:00.000Z'
        })).rejects.toMatchObject({ status: 404, code: 'account_not_found' });

        expect(api.inviteShare).not.toHaveBeenCalled();
        expect(api.leaveShare).not.toHaveBeenCalled();
        expect(api.update).not.toHaveBeenCalled();
        expect(api.remove).not.toHaveBeenCalled();
        expect(api.acceptShare).not.toHaveBeenCalled();
        expect(api.createBalanceSnapshot).not.toHaveBeenCalled();
    });

    it('accountShareRevoked ne retire pas un compte owned', async () => {
        api.list.mockResolvedValue({ items: [ownedAccount] });
        api.listIncomingShares.mockResolvedValue({ items: [] });

        let listener: ((n: { type: string; metadata?: Record<string, unknown> }) => void) | undefined;
        subscribeToAccountShareNotifications.mockImplementation((fn: (n: { type: string; metadata?: Record<string, unknown> }) => void) => {
            listener = fn;
            return () => undefined;
        });

        const store = useAccountsStore();
        await store.bootstrap('Accounts');
        expect(store.accounts.some((a) => a.publicId === 'acc-1')).toBe(true);

        listener?.({ type: 'accountShareRevoked', metadata: { accountPublicId: 'acc-1' } });
        expect(store.accounts.some((a) => a.publicId === 'acc-1')).toBe(true);
        await vi.waitFor(() => {
            expect(api.list).toHaveBeenCalled();
        });
    });

    it('ignore les événements realtime malformés (pas de patch optimiste)', async () => {
        const shared = {
            ...ownedAccount,
            publicId: 'acc-shared',
            name: 'Partagé',
            isOwned: false,
            myRole: 'viewer' as const,
            isPrimary: false
        };
        api.list.mockResolvedValue({ items: [ownedAccount, shared] });
        api.listIncomingShares.mockResolvedValue({ items: [] });

        let shareListener: ((n: { type: string; metadata?: Record<string, unknown> }) => void) | undefined;
        let accountListener: ((p: { change: string; accountPublicId: string }) => void) | undefined;
        subscribeToAccountShareNotifications.mockImplementation((fn: (n: { type: string; metadata?: Record<string, unknown> }) => void) => {
            shareListener = fn;
            return () => undefined;
        });
        subscribeToAccountChanged.mockImplementation((fn: (p: { change: string; accountPublicId: string }) => void) => {
            accountListener = fn;
            return () => undefined;
        });

        const store = useAccountsStore();
        await store.bootstrap('Accounts');
        const before = store.accounts.map((a) => a.publicId);

        shareListener?.({ type: 'accountShareRevoked', metadata: { accountPublicId: '../etc/passwd' } });
        shareListener?.({ type: 'accountShareRevoked', metadata: { accountPublicId: 'unknown-acc' } });
        accountListener?.({ change: 'notARealChange', accountPublicId: 'acc-shared' });
        accountListener?.({ change: 'revoked', accountPublicId: '' });
        accountListener?.({ change: 'revoked', accountPublicId: 'acc-shared with spaces' });

        expect(store.accounts.map((a) => a.publicId)).toEqual(before);
        expect(store.accounts.some((a) => a.publicId === 'acc-shared')).toBe(true);
    });

    it('onAuthenticatedSession branche le realtime sans charger', () => {
        const store = useAccountsStore();
        store.onAuthenticatedSession();
        expect(subscribeToAccountShareNotifications).toHaveBeenCalled();
        expect(api.list).not.toHaveBeenCalled();
    });
});
