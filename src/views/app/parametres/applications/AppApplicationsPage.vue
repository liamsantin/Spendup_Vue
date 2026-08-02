<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { LanguageIcon, PaletteIcon } from 'vue-tabler-icons';
import { LanguageTab, ThemeTab } from '@/features/applications';
import TabbedActionShell from '@/components/shared/TabbedActionShell.vue';

type SettingsTabExpose = {
    saveSettings: () => void;
    resetSettings: () => void;
    loading: boolean;
};

const { t } = useI18n();

const tab = ref('Theme');
const themeTabRef = ref<SettingsTabExpose | null>(null);
const languageTabRef = ref<SettingsTabExpose | null>(null);
const themeDirty = ref(false);
const languageDirty = ref(false);

const tabs = computed(() => [
    { value: 'Theme', label: t('applications.tabs.theme'), icon: PaletteIcon },
    { value: 'Language', label: t('applications.tabs.language'), icon: LanguageIcon }
]);

const isThemeTab = computed(() => tab.value === 'Theme');
const isLanguageTab = computed(() => tab.value === 'Language');

const activeTabRef = computed(() => (isThemeTab.value ? themeTabRef.value : isLanguageTab.value ? languageTabRef.value : null));
const activeDirty = computed(() => (isThemeTab.value ? themeDirty.value : isLanguageTab.value ? languageDirty.value : false));

const saveLoading = computed(() => !!activeTabRef.value?.loading);
const saveDisabled = computed(() => !activeTabRef.value || saveLoading.value || !activeDirty.value);
const cancelDisabled = computed(() => !activeTabRef.value || saveLoading.value || !activeDirty.value);

function onSave() {
    if (!activeTabRef.value || saveLoading.value) return;
    activeTabRef.value.saveSettings();
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
            <v-window-item value="Theme">
                <ThemeTab ref="themeTabRef" @dirty="themeDirty = $event" />
            </v-window-item>
            <v-window-item value="Language">
                <LanguageTab ref="languageTabRef" @dirty="languageDirty = $event" />
            </v-window-item>
        </v-window>
    </TabbedActionShell>
</template>
