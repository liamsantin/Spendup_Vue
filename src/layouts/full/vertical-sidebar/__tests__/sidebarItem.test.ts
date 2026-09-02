import { describe, expect, it } from 'vitest';
import { SETTINGS_PATHS } from '@/features/user-settings/settings-paths';
import sidebarThemes, { themeIdFromPath } from '../sidebarItem';

describe('themeIdFromPath', () => {
    it('mappe le dashboard et les routes Général', () => {
        expect(themeIdFromPath('/app')).toBe('general');
        expect(themeIdFromPath('/app/notifications')).toBe('general');
        expect(themeIdFromPath('/app/friends')).toBe('friends');
    });

    it('mappe les finances et les paramètres', () => {
        expect(themeIdFromPath('/app/finances/comptes')).toBe('finances');
        expect(themeIdFromPath('/app/finances/moyens-de-paiement')).toBe('finances');
        expect(themeIdFromPath(SETTINGS_PATHS.account)).toBe('settings');
        expect(themeIdFromPath(SETTINGS_PATHS.preferences)).toBe('settings');
        expect(themeIdFromPath(SETTINGS_PATHS.notifications)).toBe('settings');
        expect(themeIdFromPath(SETTINGS_PATHS.security)).toBe('settings');
        expect(themeIdFromPath('/app/comptes')).toBe('settings');
    });

    it('liste les 4 pages paramètres dans le thème settings', () => {
        const settings = sidebarThemes.find((theme) => theme.id === 'settings');
        expect(settings?.items.map((item) => item.to).filter(Boolean)).toEqual([
            SETTINGS_PATHS.account,
            SETTINGS_PATHS.preferences,
            SETTINGS_PATHS.notifications,
            SETTINGS_PATHS.security
        ]);
    });

    it('retombe sur general pour une route inconnue', () => {
        expect(themeIdFromPath('/app/inconnu')).toBe('general');
    });
});
