import { describe, expect, it } from 'vitest';
import { themeIdFromPath } from '../sidebarItem';

describe('themeIdFromPath', () => {
    it('mappe le dashboard et les routes Spend.Up', () => {
        expect(themeIdFromPath('/app')).toBe('spendup');
        expect(themeIdFromPath('/app/notifications')).toBe('spendup');
        expect(themeIdFromPath('/app/friends')).toBe('friends');
    });

    it('mappe les finances et les préférences', () => {
        expect(themeIdFromPath('/app/finances/comptes')).toBe('finances');
        expect(themeIdFromPath('/app/finances/moyens-de-paiement')).toBe('finances');
        expect(themeIdFromPath('/app/comptes')).toBe('settings');
    });

    it('retombe sur spendup pour une route inconnue', () => {
        expect(themeIdFromPath('/app/inconnu')).toBe('spendup');
    });
});
