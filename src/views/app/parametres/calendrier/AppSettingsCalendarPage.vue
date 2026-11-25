<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { CalendarIcon } from 'vue-tabler-icons';
import CalendarSettingsForm from '@/features/calendar/components/settings/CalendarSettingsForm.vue';
import CalendarSourcesSettings from '@/features/calendar/components/settings/CalendarSourcesSettings.vue';
import CalendarHiddenSettings from '@/features/calendar/components/settings/CalendarHiddenSettings.vue';
import AppSettingsFormPage from '@/views/app/parametres/AppSettingsFormPage.vue';

const { t } = useI18n();

const formRef = ref<{ saveSettings: () => Promise<void>; resetSettings: () => void; loading: boolean } | null>(null);
const dirty = ref(false);
const loading = computed(() => !!formRef.value?.loading);

function onSave() {
    if (loading.value || !dirty.value) return;
    void formRef.value?.saveSettings();
}

function onCancel() {
    if (loading.value || !dirty.value) return;
    formRef.value?.resetSettings();
}
</script>

<template>
    <AppSettingsFormPage
        :title="t('calendarPage.settings.title')"
        :subtitle="t('calendarPage.settings.subtitle')"
        :icon="CalendarIcon"
        :dirty="dirty"
        :loading="loading"
        @save="onSave"
        @cancel="onCancel"
        @discard="onCancel"
    >
        <CalendarSettingsForm ref="formRef" @dirty="dirty = $event" />
        <CalendarSourcesSettings />
        <CalendarHiddenSettings />
    </AppSettingsFormPage>
</template>
