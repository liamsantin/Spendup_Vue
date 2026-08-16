import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';

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

describe('useAccountsStore', () => {
    beforeEach(() => {
        createTestPinia();
        Object.values(api).forEach((mock) => mock.mockReset());
        subscribeToAccountShareNotifications.mockReset().mockReturnValue(() => undefined);
        subscribeToFriendshipChanged.mockReset().mockReturnValue(() => undefined);
    });

    it('charge comptes + invitations au bootstrap', async () => {
        api.list.mockResolvedValue({ items: [ownedAccount] });
        api.listIncomingShares.mockResolvedValue({
            items: [
                {
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
                }
            ]
        });

        const store = useAccountsStore();
        await store.bootstrap();

        expect(store.ownedAccounts).toHaveLength(1);
        expect(store.incomingCount).toBe(1);
        expect(subscribeToAccountShareNotifications).toHaveBeenCalled();
        expect(subscribeToFriendshipChanged).toHaveBeenCalled();
        expect(store.initialized).toBe(true);
    });

    it('sépare owned et shared', async () => {
        api.list.mockResolvedValue({
            items: [ownedAccount, { ...ownedAccount, publicId: 'acc-2', isOwned: false, myRole: 'viewer', isPrimary: false }]
        });
        api.listIncomingShares.mockResolvedValue({ items: [] });

        const store = useAccountsStore();
        await store.loadAccounts();

        expect(store.ownedAccounts).toHaveLength(1);
        expect(store.sharedAccounts).toHaveLength(1);
    });

    it('accepte une invitation puis rafraîchit listes', async () => {
        api.acceptShare.mockResolvedValue({});
        api.listIncomingShares.mockResolvedValue({ items: [] });
        api.list.mockResolvedValue({ items: [ownedAccount] });

        const store = useAccountsStore();
        await store.acceptShare('share-1');

        expect(api.acceptShare).toHaveBeenCalledWith('share-1');
        expect(api.listIncomingShares).toHaveBeenCalled();
        expect(api.list).toHaveBeenCalled();
    });

    it('onAuthenticatedSession branche le realtime sans charger', () => {
        const store = useAccountsStore();
        store.onAuthenticatedSession();
        expect(subscribeToAccountShareNotifications).toHaveBeenCalled();
        expect(api.list).not.toHaveBeenCalled();
    });
});
