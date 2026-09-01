import { describe, expect, it } from 'vitest';
import { getFriendDisplayName, getFriendDisplayNameFromItem, getFriendProfileLabel } from '@/features/friends/display-name';
import type { FriendItem, FriendUser } from '@/features/friends/types';

const baseUser: FriendUser = {
    publicId: 'U1',
    username: 'bob',
    firstName: 'Bob',
    name: 'Martin',
    profilePicture: null
};

describe('getFriendDisplayName', () => {
    it('priorise le surnom personnel', () => {
        expect(getFriendDisplayName(baseUser, 'Mon pote')).toBe('Mon pote');
    });

    it('ignore un surnom whitespace-only', () => {
        expect(getFriendDisplayName(baseUser, '   ')).toBe('bob');
    });

    it('replie sur username puis nom complet puis publicId', () => {
        expect(getFriendDisplayName(baseUser)).toBe('bob');
        expect(getFriendDisplayName({ ...baseUser, username: null })).toBe('Bob Martin');
        expect(getFriendDisplayName({ ...baseUser, username: null, firstName: null, name: null })).toBe('U1');
    });
});

describe('getFriendProfileLabel', () => {
    it('n’utilise pas le surnom', () => {
        expect(getFriendProfileLabel(baseUser)).toBe('bob');
    });
});

describe('getFriendDisplayNameFromItem', () => {
    it('lit nickname sur FriendItem', () => {
        const friend: FriendItem = {
            friendshipPublicId: 'f1',
            user: baseUser,
            nickname: 'Chef',
            friendsSince: '2026-01-01'
        };
        expect(getFriendDisplayNameFromItem(friend)).toBe('Chef');
    });
});
