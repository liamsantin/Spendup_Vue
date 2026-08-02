<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { AdjustmentsHorizontalIcon, PaletteIcon } from 'vue-tabler-icons';
import { ThemeTab } from '@/features/applications';
import { UserSettingsTab } from '@/features/user-settings';
import TabbedActionShell from '@/components/shared/TabbedActionShell.vue';

type SettingsTabExpose = {
    saveSettings: () => void | Promise<void>;
    resetSettings: () => void;
    loading: boolean;
};

const { t } = useI18n();

const tab = ref('Preferences');
const themeTabRef = ref<SettingsTabExpose | null>(null);
const preferencesTabRef = ref<SettingsTabExpose | null>(null);
const themeDirty = ref(false);
const preferencesDirty = ref(false);

const tabs = computed(() => [
    { value: 'Preferences', label: t('applications.tabs.preferences'), icon: AdjustmentsHorizontalIcon },
    { value: 'Theme', label: t('applications.tabs.theme'), icon: PaletteIcon }
]);

const activeTabRef = computed(() => {
    if (tab.value === 'Preferences') return preferencesTabRef.value;
    if (tab.value === 'Theme') return themeTabRef.value;
    return null;
});

const activeDirty = computed(() => {
    if (tab.value === 'Preferences') return preferencesDirty.value;
    if (tab.value === 'Theme') return themeDirty.value;
    return false;
});

const saveLoading = computed(() => !!activeTabRef.value?.loading);
const saveDisabled = computed(() => !activeTabRef.value || saveLoading.value || !activeDirty.value);
const cancelDisabled = computed(() => !activeTabRef.value || saveLoading.value || !activeDirty.value);

function onSave() {
    if (!activeTabRef.value || saveLoading.value) return;
    void activeTabRef.value.saveSettings();
}

function onCancel() {
    if (!activeTabRef.value || saveLoading.value) return;
    activeTabRef.value.resetSettings();
}
</script>

<template>
    <TabbedActionShell
        v-model="tab"
        :tabs="tabs"
        :save-disabled="saveDisabled"
        :cancel-disabled="cancelDisabled"
        :save-loading="saveLoading"
        @save="onSave"
        @cancel="onCancel"
    >
        <v-window v-model="tab">
            <v-window-item value="Preferences">
                <UserSettingsTab ref="preferencesTabRef" @dirty="preferencesDirty = $event" />
            </v-window-item>
            <v-window-item value="Theme">
                <ThemeTab ref="themeTabRef" @dirty="themeDirty = $event" />
            </v-window-item>
        </v-window>
    </TabbedActionShell>
</template>
