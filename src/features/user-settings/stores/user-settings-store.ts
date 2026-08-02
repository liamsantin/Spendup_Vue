import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { userSettingsApi } from '../api';
import { applyUserSettingsToRuntime, cloneSettings, settingsEqual } from '../mappers';
import { USER_SETTINGS_DEFAULTS, type UserSettings } from '../types';

export const useUserSettingsStore = defineStore('user-settings', () => {
    const settings = ref<UserSettings | null>(null);
    const loading = ref(false);
    const saving = ref(false);
    const loaded = ref(false);
    const error = ref<string | null>(null);

    let loadPromise: Promise<void> | null = null;

    const current = computed(() => settings.value ?? USER_SETTINGS_DEFAULTS);

    function reset() {
        settings.value = null;
        loaded.value = false;
        loading.value = false;
        saving.value = false;
        error.value = null;
        loadPromise = null;
    }

    async function ensureLoaded(force = false) {
        if (loaded.value && !force) return;
        if (loadPromise && !force) return loadPromise;

        loadPromise = (async () => {
            loading.value = true;
            error.value = null;
            try {
                const result = await userSettingsApi.get();
                settings.value = cloneSettings({ ...USER_SETTINGS_DEFAULTS, ...result });
                loaded.value = true;
                applyUserSettingsToRuntime(settings.value);
            } catch (e: unknown) {
                error.value = e instanceof Error ? e.message : String(e);
                throw e;
            } finally {
                loading.value = false;
                loadPromise = null;
            }
        })();

        return loadPromise;
    }

    async function save(next: UserSettings) {
        saving.value = true;
        error.value = null;
        try {
            const result = await userSettingsApi.put(next);
            settings.value = cloneSettings({ ...USER_SETTINGS_DEFAULTS, ...result });
            loaded.value = true;
            applyUserSettingsToRuntime(settings.value);
            return settings.value;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            saving.value = false;
        }
    }

    function isSameAs(other: UserSettings) {
        if (!settings.value) return false;
        return settingsEqual(settings.value, other);
    }

    return {
        settings,
        current,
        loading,
        saving,
        loaded,
        error,
        reset,
        ensureLoaded,
        save,
        isSameAs
    };
});
