import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { AppError } from '@/utils/errors/app-error';
import { userSettingsApi } from '../api';
import {
    applyUserSettingsToRuntime,
    cloneSettings,
    diffSettings,
    isEmptySettingsPatch,
    normalizeSecuritySettings,
    settingsEqual
} from '../mappers';
import { USER_SETTINGS_DEFAULTS, type UserSettings } from '../types';

function isPatchUnsupported(error: unknown): boolean {
    const status = AppError.fromUnknown(error).status;
    return status === 404 || status === 405;
}

export const useUserSettingsStore = defineStore('user-settings', () => {
    const settings = ref<UserSettings | null>(null);
    /** Brouillon unique partagé (Préférences). */
    const draft = ref<UserSettings>(cloneSettings(USER_SETTINGS_DEFAULTS));
    const baseline = ref<UserSettings | null>(null);
    const loading = ref(false);
    const saving = ref(false);
    const loaded = ref(false);
    const error = ref<string | null>(null);

    let loadPromise: Promise<void> | null = null;

    const current = computed(() => settings.value ?? USER_SETTINGS_DEFAULTS);

    const isDirty = computed(() => {
        if (!baseline.value) return false;
        return !settingsEqual(draft.value, baseline.value);
    });

    const draftReady = computed(() => baseline.value != null);

    function hydrateDraft(source?: UserSettings) {
        const next = cloneSettings(source ?? settings.value ?? USER_SETTINGS_DEFAULTS);
        draft.value = next;
        baseline.value = cloneSettings(next);
    }

    function resetDraft() {
        if (!baseline.value || saving.value) return;
        draft.value = cloneSettings(baseline.value);
    }

    function reset() {
        settings.value = null;
        draft.value = cloneSettings(USER_SETTINGS_DEFAULTS);
        baseline.value = null;
        loaded.value = false;
        loading.value = false;
        saving.value = false;
        error.value = null;
        loadPromise = null;
    }

    async function ensureLoaded(force = false) {
        if (loaded.value && !force) {
            if (!baseline.value) hydrateDraft();
            return;
        }
        if (loadPromise && !force) return loadPromise;

        loadPromise = (async () => {
            loading.value = true;
            error.value = null;
            try {
                const result = await userSettingsApi.get();
                // Defaults uniquement pour les clés absentes du GET (UI) — le PUT/PATCH renvoie le draft hydraté, pas un second merge.
                settings.value = cloneSettings({ ...USER_SETTINGS_DEFAULTS, ...result });
                loaded.value = true;
                applyUserSettingsToRuntime(settings.value);
                if (force || !baseline.value || !isDirty.value) {
                    hydrateDraft(settings.value);
                }
            } catch (e: unknown) {
                error.value = e instanceof Error ? e.message : String(e);
                if (!baseline.value) hydrateDraft();
                throw e;
            } finally {
                loading.value = false;
                loadPromise = null;
            }
        })();

        return loadPromise;
    }

    async function applySavedResult(result: UserSettings) {
        settings.value = cloneSettings({ ...USER_SETTINGS_DEFAULTS, ...result });
        loaded.value = true;
        applyUserSettingsToRuntime(settings.value);
        hydrateDraft(settings.value);
        return settings.value;
    }

    /** Remplacement total (tests / outils). Préférer `saveDraft` en UI. */
    async function save(next: UserSettings) {
        saving.value = true;
        error.value = null;
        try {
            const payload = normalizeSecuritySettings(next);
            const result = await userSettingsApi.put(payload);
            return await applySavedResult(result);
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : String(e);
            throw e;
        } finally {
            saving.value = false;
        }
    }

    /**
     * Envoie un PATCH des champs dirty ; fallback PUT si l’API ne supporte pas encore PATCH (404/405).
     */
    async function saveDraft() {
        if (saving.value || !isDirty.value || !baseline.value) return settings.value;

        const payload = normalizeSecuritySettings(cloneSettings(draft.value));
        const patch = diffSettings(payload, baseline.value);

        if (isEmptySettingsPatch(patch)) {
            draft.value = cloneSettings(baseline.value);
            return settings.value;
        }

        saving.value = true;
        error.value = null;
        try {
            let result: UserSettings;
            try {
                result = await userSettingsApi.patch(patch);
            } catch (e: unknown) {
                if (!isPatchUnsupported(e)) throw e;
                result = await userSettingsApi.put(payload);
            }
            return await applySavedResult(result);
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
        draft,
        baseline,
        current,
        isDirty,
        draftReady,
        loading,
        saving,
        loaded,
        error,
        reset,
        resetDraft,
        hydrateDraft,
        ensureLoaded,
        save,
        saveDraft,
        isSameAs
    };
});
