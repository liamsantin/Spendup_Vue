import { describe, expect, it } from 'vitest';
import { friendLiveChipColor, isFriendLiveChipType } from '../friendChip';
import { isFriendNotificationType, isSecurityNotificationType, resolveNotificationLink } from '../link';
import { getFriendshipPublicId, normalizeAppNotification, parseNotificationMetadata } from '../normalize';

describe('resolveNotificationLink', () => {
    it('mappe /security* vers /app/comptes', () => {
        expect(resolveNotificationLink('/security')).toBe('/app/comptes');
        expect(resolveNotificationLink('/security/devices')).toBe('/app/comptes');
    });

    it('conserve les routes /app', () => {
        expect(resolveNotificationLink('/app/comptes')).toBe('/app/comptes');
    });

    it('ignore les valeurs vides ou non relatives', () => {
        expect(resolveNotificationLink(null)).toBeNull();
        expect(resolveNotificationLink('https://evil.test')).toBeNull();
    });

    it('deep-link amis via type + metadata', () => {
        expect(
            resolveNotificationLink('/friends', {
                type: 'friendRequest',
                metadata: { friendshipPublicId: 'fr-1' }
            })
        ).toBe('/app/friends?tab=Requests&friendship=fr-1');

        expect(
            resolveNotificationLink(null, {
                type: 'friendAccepted',
                metadata: { friendshipPublicId: 'fr-2' }
            })
        ).toBe('/app/friends?tab=Friends&friendship=fr-2');

        expect(
            resolveNotificationLink('/friends', {
                type: 'friendBlocked',
                metadata: null
            })
        ).toBe('/app/friends?tab=Friends');
    });
});

describe('friendLiveChipColor', () => {
    it('mappe les types amis vers primary / error / warning', () => {
        expect(isFriendLiveChipType('friendAccepted')).toBe(true);
        expect(isFriendLiveChipType('friendRemoved')).toBe(true);
        expect(isFriendLiveChipType('friendBlocked')).toBe(true);
        expect(isFriendLiveChipType('friendRequest')).toBe(true);

        expect(friendLiveChipColor('friendAccepted')).toBe('primary');
        expect(friendLiveChipColor('friendRequest')).toBe('primary');
        expect(friendLiveChipColor('friendRemoved')).toBe('error');
        expect(friendLiveChipColor('friendBlocked')).toBe('warning');
    });
});

describe('parseNotificationMetadata', () => {
    it('parse une string JSON API', () => {
        expect(parseNotificationMetadata('{"friendshipPublicId":"abc"}')).toEqual({
            friendshipPublicId: 'abc'
        });
    });

    it('conserve un objet déjà parsé', () => {
        expect(parseNotificationMetadata({ friendshipPublicId: 'abc' })).toEqual({
            friendshipPublicId: 'abc'
        });
    });

    it('retourne null si invalide', () => {
        expect(parseNotificationMetadata(null)).toBeNull();
        expect(parseNotificationMetadata('')).toBeNull();
        expect(parseNotificationMetadata('not-json')).toBeNull();
        expect(parseNotificationMetadata('[]')).toBeNull();
    });
});

describe('normalizeAppNotification', () => {
    it('parse metadata string sur un item', () => {
        const n = normalizeAppNotification({
            id: 1,
            type: 'friendRequest',
            title: 'Demande',
            subtitle: null,
            message: null,
            metadata: '{"friendshipPublicId":"f-9"}',
            isRead: false,
            readAt: null,
            link: '/friends',
            photoUrl: null,
            createdAt: '2026-01-01T00:00:00Z'
        });
        expect(n?.metadata).toEqual({ friendshipPublicId: 'f-9' });
        expect(getFriendshipPublicId(n?.metadata)).toBe('f-9');
    });
});

describe('notification type helpers', () => {
    it('détecte les types sécu / amis', () => {
        expect(isSecurityNotificationType('loginNewDevice')).toBe(true);
        expect(isSecurityNotificationType('securityAlert')).toBe(true);
        expect(isSecurityNotificationType('friendRequest')).toBe(false);
        expect(isFriendNotificationType('friendAccepted')).toBe(true);
        expect(isFriendNotificationType('friendRefused')).toBe(true);
        expect(isFriendNotificationType('friendCanceled')).toBe(true);
        expect(isFriendNotificationType('friendRemoved')).toBe(true);
        expect(isFriendNotificationType('friendBlocked')).toBe(true);
        expect(isFriendNotificationType('other')).toBe(false);
    });
});
