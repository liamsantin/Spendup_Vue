import { describe, expect, it } from 'vitest';
import { resolveSpendupDeepLink } from '../deep-links';

describe('resolveSpendupDeepLink', () => {
    it('mappe spendup://host/path vers /host/path si /app…', () => {
        expect(resolveSpendupDeepLink('spendup://app/friends')).toBe('/app/friends');
        expect(resolveSpendupDeepLink('spendup://app/comptes?tab=Security')).toBe('/app/comptes?tab=Security');
    });

    it('accepte spendup:///app/…', () => {
        expect(resolveSpendupDeepLink('spendup:///app/friends')).toBe('/app/friends');
        expect(resolveSpendupDeepLink('spendup:///app/notifications')).toBe('/app/notifications');
    });

    it('refuse hors scheme ou hors /app', () => {
        expect(resolveSpendupDeepLink(null)).toBeNull();
        expect(resolveSpendupDeepLink('https://evil.test/app')).toBeNull();
        expect(resolveSpendupDeepLink('spendup://auth/login')).toBeNull();
        expect(resolveSpendupDeepLink('spendup://evil.com/phishing')).toBeNull();
        expect(resolveSpendupDeepLink('spendup:user:762H2M3')).toBeNull();
    });

    it('bloque protocol-relative reconstruit', () => {
        // hostname vide + pathname //evil → isSafeAppNotificationPath refuse
        expect(resolveSpendupDeepLink('spendup:////evil.com')).toBeNull();
    });
});
