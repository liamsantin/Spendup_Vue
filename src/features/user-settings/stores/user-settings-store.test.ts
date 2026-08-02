import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPinia } from '@/test/pinia';
import { USER_SETTINGS_DEFAULTS } from '../types';

const { getSettings, putSettings } = vi.hoisted(() => ({
    getSettings: vi.fn(),
    putSettings: vi.fn()
}));

vi.mock('../api', () => ({
    userSettingsApi: {
        get: () => getSettings(),
        put: (body: unknown) => putSettings(body)
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

    it('saveDraft envoie le brouillon et ré-hydrate', async () => {
        getSettings.mockResolvedValue({ ...USER_SETTINGS_DEFAULTS, locale: 'en-US' });
        putSettings.mockResolvedValue({ ...USER_SETTINGS_DEFAULTS, locale: 'fr-CH' });
        const store = useUserSettingsStore();

        await store.ensureLoaded();
        store.draft.locale = 'fr-CH';
        await store.saveDraft();

        expect(putSettings).toHaveBeenCalledWith(expect.objectContaining({ locale: 'fr-CH' }));
        expect(store.isDirty).toBe(false);
        expect(store.draft.locale).toBe('fr-CH');
    });
});
