import { describe, expect, it } from 'vitest';
import { diffSettings, isEmptySettingsPatch } from '@/features/user-settings/mappers';
import { USER_SETTINGS_DEFAULTS } from '@/features/user-settings/types';

describe('diffSettings', () => {
    it('renvoie uniquement les clés modifiées', () => {
        const baseline = { ...USER_SETTINGS_DEFAULTS, locale: 'fr-CH' };
        const current = { ...baseline, locale: 'en-US', emailSecurityAlerts: false };

        expect(diffSettings(current, baseline)).toEqual({
            locale: 'en-US',
            emailSecurityAlerts: false
        });
    });

    it('inclut les null explicites (idle désactivé)', () => {
        const baseline = { ...USER_SETTINGS_DEFAULTS, idleLogoutMinutes: 30 };
        const current = { ...baseline, idleLogoutMinutes: null };

        expect(diffSettings(current, baseline)).toEqual({ idleLogoutMinutes: null });
    });

    it('isEmptySettingsPatch détecte l’absence de changements', () => {
        expect(isEmptySettingsPatch({})).toBe(true);
        expect(isEmptySettingsPatch({ locale: 'en-US' })).toBe(false);
    });
});
