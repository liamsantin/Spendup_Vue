import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { USER_SETTINGS_DEFAULTS } from '../types';

const { getSettings, putSettings, patchSettings } = vi.hoisted(() => ({
    getSettings: vi.fn(),
    putSettings: vi.fn(),
    patchSettings: vi.fn()
}));

vi.mock('../api', () => ({
    userSettingsApi: {
        get: () => getSettings(),
        put: (body: unknown) => putSettings(body),
        patch: (body: unknown) => patchSettings(body)
    }
}));

vi.mock('../mappers', async () => {
    const actual = await vi.importActual<typeof import('../mappers')>('../mappers');
    return {
        ...actual,
        applyUserSettingsToRuntime: vi.fn()
    };
});

import { useUserSettingsStore } from './user-settings-store';

describe('useUserSettingsStore draft', () => {
    beforeEach(() => {
        createTestPinia();
        getSettings.mockReset();
        putSettings.mockReset();
        patchSettings.mockReset();
    });

    it('hydrate un brouillon unique et détecte le dirty', async () => {
        getSettings.mockResolvedValue({ ...USER_SETTINGS_DEFAULTS, locale: 'en-US' });
        const store = useUserSettingsStore();

        await store.ensureLoaded();

        expect(store.draftReady).toBe(true);
        expect(store.isDirty).toBe(false);
        expect(store.draft.locale).toBe('en-US');

        store.draft.locale = 'fr-CH';
        expect(store.isDirty).toBe(true);

        store.resetDraft();
        expect(store.draft.locale).toBe('en-US');
        expect(store.isDirty).toBe(false);
    });

    it('saveDraft envoie un PATCH partiel et ré-hydrate', async () => {
        getSettings.mockResolvedValue({ ...USER_SETTINGS_DEFAULTS, locale: 'en-US' });
        patchSettings.mockResolvedValue({ ...USER_SETTINGS_DEFAULTS, locale: 'fr-CH' });
        const store = useUserSettingsStore();

        await store.ensureLoaded();
        store.draft.locale = 'fr-CH';
        await store.saveDraft();

        expect(patchSettings).toHaveBeenCalledWith({ locale: 'fr-CH' });
        expect(putSettings).not.toHaveBeenCalled();
        expect(store.isDirty).toBe(false);
        expect(store.draft.locale).toBe('fr-CH');
    });

    it('saveDraft clamp les champs sécurité hors bornes API dans le PATCH', async () => {
        getSettings.mockResolvedValue({ ...USER_SETTINGS_DEFAULTS });
        patchSettings.mockResolvedValue({
            ...USER_SETTINGS_DEFAULTS,
            idleLogoutMinutes: 5,
            trustedDeviceDurationDays: 365
        });
        const store = useUserSettingsStore();

        await store.ensureLoaded();
        store.draft.idleLogoutMinutes = 2;
        store.draft.trustedDeviceDurationDays = 999;
        await store.saveDraft();

        expect(patchSettings).toHaveBeenCalledWith({
            idleLogoutMinutes: 5,
            trustedDeviceDurationDays: 365
        });
    });
});
