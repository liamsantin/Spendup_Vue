import { describe, expect, it } from 'vitest';
import { friendLiveChipColor, isAccountShareLiveChipType, isFriendLiveChipType, isLiveChipType } from '@/features/notifications/friendChip';
import {
    isAccountShareNotificationType,
    isFriendNotificationType,
    isSafeAppNotificationPath,
    isSecurityNotificationType,
    resolveNotificationLink
} from '@/features/notifications/link';
import { getFriendshipPublicId, normalizeAppNotification, parseNotificationMetadata } from '@/features/notifications/normalize';

describe('resolveNotificationLink', () => {
    it('mappe /security* vers /app/comptes', () => {
        expect(resolveNotificationLink('/security')).toBe('/app/comptes');
        expect(resolveNotificationLink('/security/devices')).toBe('/app/comptes');
    });

    it('conserve les routes /app', () => {
        expect(resolveNotificationLink('/app')).toBe('/app');
        expect(resolveNotificationLink('/app/comptes')).toBe('/app/comptes');
        expect(resolveNotificationLink('/app/friends?tab=Friends')).toBe('/app/friends?tab=Friends');
    });

    it('ignore les valeurs vides ou non relatives', () => {
        expect(resolveNotificationLink(null)).toBeNull();
        expect(resolveNotificationLink('https://evil.test')).toBeNull();
    });

    it('bloque open-redirect (protocol-relative, escape, hors /app, préfixe ambigu)', () => {
        expect(resolveNotificationLink('//evil.com')).toBeNull();
        expect(resolveNotificationLink('/\\evil.com')).toBeNull();
        expect(resolveNotificationLink('/auth/login')).toBeNull();
        expect(resolveNotificationLink('/unknown')).toBeNull();
        expect(resolveNotificationLink('/application')).toBeNull();
        expect(resolveNotificationLink('/app/../auth/login')).toBeNull();
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

    it('deep-link comptes via type + metadata', () => {
        expect(
            resolveNotificationLink('/accounts/shares', {
                type: 'accountShareInvite',
                metadata: { sharePublicId: 'sh-1' }
            })
        ).toBe('/app/finances/comptes?tab=Invitations&share=sh-1');

        expect(
            resolveNotificationLink(null, {
                type: 'accountShareAccepted',
                metadata: null
            })
        ).toBe('/app/finances/comptes?tab=Accounts');

        expect(resolveNotificationLink('/accounts')).toBe('/app/finances/comptes');
    });
});

describe('isSafeAppNotificationPath', () => {
    it('n’accepte que des chemins /app internes stricts', () => {
        expect(isSafeAppNotificationPath('/app')).toBe(true);
        expect(isSafeAppNotificationPath('/app/comptes')).toBe(true);
        expect(isSafeAppNotificationPath('/app/friends?tab=1')).toBe(true);
        expect(isSafeAppNotificationPath('//evil.com')).toBe(false);
        expect(isSafeAppNotificationPath('/\\evil.com')).toBe(false);
        expect(isSafeAppNotificationPath('/auth/login')).toBe(false);
        expect(isSafeAppNotificationPath('/application')).toBe(false);
        expect(isSafeAppNotificationPath('/app.evil.com/x')).toBe(false);
        expect(isSafeAppNotificationPath('/app/../auth/login')).toBe(false);
        expect(isSafeAppNotificationPath('https://evil.com')).toBe(false);
        expect(isSafeAppNotificationPath(null)).toBe(false);
    });
});

describe('friendLiveChipColor', () => {
    it('ne déclenche un chip que pour friendRequest / friendAccepted / accountShareInvite', () => {
        expect(isFriendLiveChipType('friendAccepted')).toBe(true);
        expect(isFriendLiveChipType('friendRequest')).toBe(true);
        expect(isFriendLiveChipType('friendRemoved')).toBe(false);
        expect(isFriendLiveChipType('friendBlocked')).toBe(false);
        expect(isFriendLiveChipType('accountShareInvite')).toBe(false);

        expect(isAccountShareLiveChipType('accountShareInvite')).toBe(true);
        expect(isAccountShareLiveChipType('accountShareAccepted')).toBe(false);
        expect(isAccountShareLiveChipType('accountShareRefused')).toBe(false);
        expect(isAccountShareLiveChipType('accountShareRevoked')).toBe(false);

        expect(isLiveChipType('friendRequest')).toBe(true);
        expect(isLiveChipType('accountShareInvite')).toBe(true);
        expect(isLiveChipType('accountShareAccepted')).toBe(false);
        expect(isLiveChipType('securityAlert')).toBe(false);

        expect(friendLiveChipColor()).toBe('primary');
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

    it('normalise / refuse les publicIds et payloads accountChanged', async () => {
        const { normalizePublicId, parseAccountChangedPayload, getAccountPublicId } = await import('@/features/notifications/normalize');
        expect(normalizePublicId('acc-1')).toBe('acc-1');
        expect(normalizePublicId('  share_2  ')).toBe('share_2');
        expect(normalizePublicId('../x')).toBeNull();
        expect(normalizePublicId('a b')).toBeNull();
        expect(normalizePublicId('')).toBeNull();
        expect(getAccountPublicId({ accountPublicId: 'acc-ok' })).toBe('acc-ok');
        expect(getAccountPublicId({ accountPublicId: 'bad id' })).toBeNull();
        expect(parseAccountChangedPayload({ change: 'revoked', accountPublicId: 'acc-1' })).toEqual({
            change: 'revoked',
            accountPublicId: 'acc-1'
        });
        expect(parseAccountChangedPayload({ change: 'nope', accountPublicId: 'acc-1' })).toBeNull();
        expect(parseAccountChangedPayload({ change: 'revoked', accountPublicId: '' })).toBeNull();
    });
});

describe('notification type helpers', () => {
    it('détecte les types sécu / amis inbox', () => {
        expect(isSecurityNotificationType('loginNewDevice')).toBe(true);
        expect(isSecurityNotificationType('securityAlert')).toBe(true);
        expect(isSecurityNotificationType('friendRequest')).toBe(false);
        expect(isFriendNotificationType('friendAccepted')).toBe(true);
        expect(isFriendNotificationType('friendRequest')).toBe(true);
        expect(isFriendNotificationType('friendRefused')).toBe(false);
        expect(isFriendNotificationType('friendCanceled')).toBe(false);
        expect(isFriendNotificationType('friendRemoved')).toBe(false);
        expect(isFriendNotificationType('friendBlocked')).toBe(false);
        expect(isFriendNotificationType('other')).toBe(false);
        expect(isAccountShareNotificationType('accountShareInvite')).toBe(true);
        expect(isAccountShareNotificationType('accountShareRevoked')).toBe(true);
        expect(isAccountShareNotificationType('accountShareLeft')).toBe(true);
        expect(isAccountShareNotificationType('accountShareRoleChanged')).toBe(true);
        expect(isAccountShareNotificationType('friendRequest')).toBe(false);
    });
});
