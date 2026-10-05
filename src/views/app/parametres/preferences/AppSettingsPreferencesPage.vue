<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { AdjustmentsHorizontalIcon } from 'vue-tabler-icons';
import { PreferencesTab, useSettingsFormPage } from '@/features/user-settings';
import AppSettingsFormPage from '@/views/app/parametres/AppSettingsFormPage.vue';

const { t } = useI18n();
const { tabRef, dirty, loading, onSave, onCancel, onDiscard } = useSettingsFormPage();
</script>

<template>
    <AppSettingsFormPage
        :title="t('accounts.tabs.preferences')"
        :subtitle="t('accounts.pages.preferences.subtitle')"
        :icon="AdjustmentsHorizontalIcon"
        :dirty="dirty"
        :loading="loading"
        @save="onSave"
        @cancel="onCancel"
        @discard="onDiscard"
    >
        <PreferencesTab ref="tabRef" @dirty="dirty = $event" />
    </AppSettingsFormPage>
</template>
