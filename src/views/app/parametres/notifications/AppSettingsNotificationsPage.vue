<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { BellIcon } from 'vue-tabler-icons';
import { NotificationsTab, useSettingsFormPage } from '@/features/user-settings';
import AppSettingsFormPage from '@/views/app/parametres/AppSettingsFormPage.vue';

const { t } = useI18n();
const { tabRef, dirty, loading, onSave, onCancel, onDiscard } = useSettingsFormPage();
</script>

<template>
    <AppSettingsFormPage
        :title="t('accounts.tabs.notifications')"
        :subtitle="t('accounts.pages.notifications.subtitle')"
        :icon="BellIcon"
        :dirty="dirty"
        :loading="loading"
        @save="onSave"
        @cancel="onCancel"
        @discard="onDiscard"
    >
        <NotificationsTab ref="tabRef" @dirty="dirty = $event" />
    </AppSettingsFormPage>
</template>
