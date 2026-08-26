import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { createTestPinia } from '@/test/pinia';

const inviteShare = vi.fn();
const listAllFriends = vi.fn();

vi.mock('@/features/accounts/stores/accounts-store', () => ({
    useAccountsStore: () => ({
        acting: false,
        shares: [],
        inviteShare: (...args: unknown[]) => inviteShare(...args)
    })
}));

vi.mock('@/features/friends', () => ({
    listAllFriends: (...args: unknown[]) => listAllFriends(...args)
}));

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key
    })
}));

import { useShareInvite } from '@/features/accounts/composables/useShareInvite';

describe('useShareInvite (payload invitation)', () => {
    beforeEach(() => {
        createTestPinia();
        inviteShare.mockReset();
        listAllFriends.mockReset();
        listAllFriends.mockResolvedValue([
            {
                user: {
                    publicId: 'u-bob',
                    firstName: 'Bob',
                    name: 'Martin',
                    username: 'bob',
                    profilePicture: 'https://img/bob'
                }
            }
        ]);
    });

    it('viewer : envoie hiddenFields ; editor : omet hiddenFields', async () => {
        const isOpen = ref(true);
        const invite = useShareInvite({
            accountPublicId: 'acc-1',
            isOpen,
            close: vi.fn()
        });

        await vi.waitFor(() => expect(invite.loadingFriends).toBe(false));
        invite.selectFriend('u-bob');

        invite.role = 'viewer';
        invite.hiddenFields = ['iban', 'balance'];
        inviteShare.mockResolvedValue({});
        await invite.submitInvite();
        expect(inviteShare).toHaveBeenCalledWith('acc-1', 'u-bob', 'viewer', 'https://img/bob', ['iban', 'balance']);

        inviteShare.mockClear();
        invite.role = 'editor';
        await invite.submitInvite();
        expect(inviteShare).toHaveBeenCalledWith('acc-1', 'u-bob', 'editor', 'https://img/bob', undefined);
    });
});
