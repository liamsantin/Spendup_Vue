import { describe, expect, it } from 'vitest';
import { normalizeSecuritySettings } from './mappers';
import { USER_SETTINGS_DEFAULTS } from './types';

describe('normalizeSecuritySettings', () => {
    it('clamp idle et trusted days', () => {
        const next = normalizeSecuritySettings({
            ...USER_SETTINGS_DEFAULTS,
            idleLogoutMinutes: 2,
            trustedDeviceDurationDays: 999
        });
        expect(next.idleLogoutMinutes).toBe(5);
        expect(next.trustedDeviceDurationDays).toBe(365);
    });

    it('conserve null idle', () => {
        const next = normalizeSecuritySettings({
            ...USER_SETTINGS_DEFAULTS,
            idleLogoutMinutes: null
        });
        expect(next.idleLogoutMinutes).toBeNull();
    });
});
