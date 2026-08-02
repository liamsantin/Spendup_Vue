<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { AdjustmentsHorizontalIcon } from 'vue-tabler-icons';
import { UserSettingsTab } from '@/features/user-settings';
import TabbedActionShell from '@/components/shared/TabbedActionShell.vue';

type SettingsTabExpose = {
    saveSettings: () => void | Promise<void>;
    resetSettings: () => void;
    loading: boolean;
};

const { t } = useI18n();

const tab = ref('Preferences');
const preferencesTabRef = ref<SettingsTabExpose | null>(null);
const preferencesDirty = ref(false);

const tabs = computed(() => [{ value: 'Preferences', label: t('applications.tabs.preferences'), icon: AdjustmentsHorizontalIcon }]);

const saveLoading = computed(() => !!preferencesTabRef.value?.loading);
const saveDisabled = computed(() => saveLoading.value || !preferencesDirty.value);
const cancelDisabled = computed(() => saveLoading.value || !preferencesDirty.value);

function onSave() {
    if (!preferencesTabRef.value || saveLoading.value) return;
    void preferencesTabRef.value.saveSettings();
}

function onCancel() {
    if (!preferencesTabRef.value || saveLoading.value) return;
    preferencesTabRef.value.resetSettings();
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
        </v-window>
    </TabbedActionShell>
</template>
