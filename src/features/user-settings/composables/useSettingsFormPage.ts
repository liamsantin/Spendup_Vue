import { computed, ref } from 'vue';
import { useUserSettingsStore } from '@/features/user-settings/stores/user-settings-store';

export type SettingsTabExpose = {
    saveSettings: () => void | Promise<void>;
    resetSettings: () => void;
    loading: boolean;
};

/** Save / cancel / discard partagés par Préférences, Notifications et Sécurité. */
export function useSettingsFormPage() {
    const store = useUserSettingsStore();
    const tabRef = ref<SettingsTabExpose | null>(null);
    const dirty = ref(false);

    const loading = computed(() => !!tabRef.value?.loading);

    function onSave() {
        if (loading.value || !dirty.value) return;
        void tabRef.value?.saveSettings();
    }

    function onCancel() {
        if (loading.value || !dirty.value) return;
        tabRef.value?.resetSettings();
    }

    function onDiscard() {
        store.resetDraft();
    }

    return { tabRef, dirty, loading, onSave, onCancel, onDiscard };
}
