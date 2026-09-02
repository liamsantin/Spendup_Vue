import { describe, expect, it } from 'vitest';
import {
    SETTINGS_PATHS,
    isLegacySettingsPath,
    resolveLegacySettingsRedirect,
    rewriteLegacySettingsLink
} from '@/features/user-settings/settings-paths';

describe('rewriteLegacySettingsLink', () => {
    it('mappe /app/comptes et ses onglets vers les pages dédiées', () => {
        expect(rewriteLegacySettingsLink('/app/comptes')).toBe(SETTINGS_PATHS.account);
        expect(rewriteLegacySettingsLink('/app/comptes?tab=Account')).toBe(SETTINGS_PATHS.account);
        expect(rewriteLegacySettingsLink('/app/comptes?tab=Preferences')).toBe(SETTINGS_PATHS.preferences);
        expect(rewriteLegacySettingsLink('/app/comptes?tab=Notifications')).toBe(SETTINGS_PATHS.notifications);
        expect(rewriteLegacySettingsLink('/app/comptes?tab=Security')).toBe(SETTINGS_PATHS.security);
        expect(rewriteLegacySettingsLink('/app/applications')).toBe(SETTINGS_PATHS.account);
    });

    it('conserve query hors tab et le hash', () => {
        expect(rewriteLegacySettingsLink('/app/comptes?tab=Security&from=notif')).toBe(`${SETTINGS_PATHS.security}?from=notif`);
        expect(rewriteLegacySettingsLink('/app/comptes#devices')).toBe(`${SETTINGS_PATHS.account}#devices`);
    });

    it('ignore un onglet inconnu et les autres chemins', () => {
        expect(rewriteLegacySettingsLink('/app/comptes?tab=Unknown')).toBe(SETTINGS_PATHS.account);
        expect(rewriteLegacySettingsLink('/app/friends')).toBeNull();
        expect(rewriteLegacySettingsLink('/app/finances/comptes')).toBeNull();
    });
});

describe('isLegacySettingsPath', () => {
    it('détecte les anciennes URLs paramètres', () => {
        expect(isLegacySettingsPath('/app/comptes')).toBe(true);
        expect(isLegacySettingsPath('/app/comptes?tab=Security')).toBe(true);
        expect(isLegacySettingsPath('/app/applications')).toBe(true);
        expect(isLegacySettingsPath('/app/finances/comptes')).toBe(false);
        expect(isLegacySettingsPath('/app/parametres/compte')).toBe(false);
    });
});

describe('resolveLegacySettingsRedirect', () => {
    it('supprime tab et pointe vers la page dédiée', () => {
        expect(resolveLegacySettingsRedirect({ query: { tab: 'Security', from: 'mail' }, hash: '#x' })).toEqual({
            path: SETTINGS_PATHS.security,
            query: { from: 'mail' },
            hash: '#x'
        });
        expect(resolveLegacySettingsRedirect({ query: {}, hash: '' })).toEqual({
            path: SETTINGS_PATHS.account,
            query: {},
            hash: ''
        });
    });
});
