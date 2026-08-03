import { describe, expect, it } from 'vitest';
import { isFriendNotificationType, isSecurityNotificationType, resolveNotificationLink } from '../link';

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
});

describe('notification type helpers', () => {
    it('détecte les types sécu / amis', () => {
        expect(isSecurityNotificationType('loginNewDevice')).toBe(true);
        expect(isSecurityNotificationType('securityAlert')).toBe(true);
        expect(isSecurityNotificationType('friendRequest')).toBe(false);
        expect(isFriendNotificationType('friendAccepted')).toBe(true);
    });
});
